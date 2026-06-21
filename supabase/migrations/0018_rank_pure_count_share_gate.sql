-- 0018_rank_pure_count_share_gate.sql — 직급=순수 카운트 + 30%는 공유수당 게이트로 + 월별 직급 기록
-- 확정 규칙:
--   * 직급은 그 달의 후원 산하 활성 구독자 수(또는 1~3급 직추 수)로 '순수 카운트' 산정. 30% 무관.
--     → 5직급(3000명)이면 그냥 5직급 직급수당 100% 지급(강등 없음).
--   * 30% 균형 게이트는 '공유수당'에만 적용: requires_30pct 직급(5급+)은 소실적이 전체의
--     30%(balance_gate_pct, comp_settings) 이상일 때만 override(공유수당) 지급. 3·4급은 무조건.
--   * 직급은 매달 재평가(run_settlement 가 그 달 활성 상태로 산정). settlements.member_rank 에 기록.
--   * 모든 직급 기준값(min_total/min_direct/rate_pct/override_rate/requires_30pct)은 ranks 테이블 → 관리자 설정.

-- 30% 게이트 기준값(관리자 설정 가능). 기본 30.
insert into comp_settings(key, value, label) values
  ('balance_gate_pct', 30, '공유수당 소실적 게이트(%)')
on conflict (key) do nothing;

-- 그 달 평가 직급 기록(월별 재평가 감사/표시용)
alter table settlements add column if not exists member_rank int;

-- evaluate_rank: 직급=순수 카운트(강등 제거). blocked_by_balance 재정의=공유수당 차단.
create or replace function evaluate_rank(m_id uuid)
returns table(
  rank int, rate_pct numeric, total_active bigint, direct_active bigint,
  major_leg bigint, other_minor bigint, balance_pct numeric, balance_ok boolean,
  blocked_by_balance boolean,   -- 재정의: '공유수당' 차단(직급은 강등 안 됨)
  next_rank int, next_min_total int, next_min_direct int
)
language plpgsql stable as $$
declare
  v_total bigint; v_major bigint; v_minor bigint; v_direct bigint;
  v_pct numeric; v_rank int := 0; r record;
  v_gate numeric; v_req30 boolean;
begin
  v_gate := coalesce((select value / 100.0 from comp_settings where key = 'balance_gate_pct'), 0.30);
  select mm.total_active, mm.major_leg, mm.other_minor
    into v_total, v_major, v_minor
  from get_major_minor(m_id) mm;
  v_direct := direct_active_count(m_id);
  v_pct := case when v_total > 0 then round(v_minor::numeric / v_total, 4) else 0 end;

  -- 직급 = 충족하는 가장 높은 직급(카운트/직추만, 30% 무관 → 강등 없음)
  for r in select * from ranks order by ranks.rank loop
    if (r.min_total is not null and v_total >= r.min_total)
       or (r.min_direct is not null and v_direct >= r.min_direct) then
      v_rank := r.rank;
    end if;
  end loop;

  v_req30 := coalesce((select requires_30pct from ranks where ranks.rank = v_rank), false);

  return query select
    v_rank,
    coalesce((select ranks.rate_pct from ranks where ranks.rank = v_rank), 0),
    v_total, v_direct, v_major, v_minor, v_pct,
    (v_pct >= v_gate),                 -- balance_ok
    (v_req30 and v_pct < v_gate),      -- blocked_by_balance = 공유수당 차단(직급은 유지)
    case when v_rank < 9 then v_rank + 1 else null end,
    (select ranks.min_total  from ranks where ranks.rank = v_rank + 1),
    (select ranks.min_direct from ranks where ranks.rank = v_rank + 1);
end;
$$;

-- run_settlement: 공유수당 30% 게이트(requires_30pct 직급은 balance_ok 일 때만) + member_rank 기록
create or replace function run_settlement(p_cycle text, p_as_of date default current_date)
returns table(members_paid int, level_total numeric, rank_total numeric, share_total numeric, grand_total numeric)
language plpgsql as $$
declare
  c_sub numeric := 120; c_ann numeric := 200;
  c_l1 numeric; c_l2 numeric;
  v_pool_pct numeric; v_rev numeric; v_pool numeric; v_gross numeric; v_factor numeric;
begin
  c_l1 := coalesce((select value / 100 from comp_settings where key = 'level_gen1_pct'), 0.25);
  c_l2 := coalesce((select value / 100 from comp_settings where key = 'level_gen2_pct'), 0.09);
  v_pool_pct := coalesce((select value from comp_settings where key = 'pool_commission_pct'), 60);

  perform refresh_active_subscribers(p_as_of);

  drop table if exists _qual;
  create temp table _qual on commit drop as
    select m.id as member_id from members m
    where m.role = 'marketer' and m.is_active_subscriber
      and exists (select 1 from annual_memberships a
                  where a.member_id = m.id and p_as_of between a.period_start and a.period_end);

  -- 직급(순수 카운트) + 공유수당 게이트 정보(balance_ok / requires_30pct)
  drop table if exists _rank;
  create temp table _rank on commit drop as
    select q.member_id, er.rank, er.rate_pct, er.balance_ok,
           coalesce(rr.requires_30pct, false) as requires_30pct
    from _qual q
    cross join lateral evaluate_rank(q.member_id) er
    left join ranks rr on rr.rank = er.rank
    where er.rank > 0;

  drop table if exists _vol;
  create temp table _vol on commit drop as
    select m.id as member_id,
      (case when m.is_active_subscriber then c_sub else 0 end)
      + (case when exists (select 1 from annual_memberships a
                where a.member_id = m.id and p_as_of between a.period_start and a.period_end)
         then c_ann else 0 end) as vol
    from members m;
  delete from _vol where vol <= 0;

  drop table if exists _level;
  create temp table _level on commit drop as
    with a as (
      select v.member_id as id, m.recommender_id, v.vol
      from _vol v join members m on m.id = v.member_id
      where m.recommender_id is not null
    ),
    g1 as (select a.recommender_id as mid, c_l1 * a.vol as amt from a join _qual q1 on q1.member_id = a.recommender_id),
    g2 as (select r.recommender_id as mid, c_l2 * a.vol as amt
           from a join members r on r.id = a.recommender_id
           join _qual q2 on q2.member_id = r.recommender_id
           where r.recommender_id is not null)
    select mid, sum(amt)::numeric(14,4) as amt
    from (select * from g1 union all select * from g2) u group by mid;

  -- 직급수당: 30% 무관, 직급대로(차액차등+브레이크어웨이)
  drop table if exists _rankc;
  create temp table _rankc on commit drop as
    with anc as (
      select pc.descendant_id as leaf, pc.ancestor_id as mid, pc.depth, rk.rate_pct, v.vol
      from placement_closure pc
      join _vol v on v.member_id = pc.descendant_id
      join _rank rk on rk.member_id = pc.ancestor_id
      where pc.depth >= 1
    ),
    diff as (
      select mid, vol,
        greatest(0, rate_pct - coalesce(
          max(rate_pct) over (partition by leaf order by depth asc rows between unbounded preceding and 1 preceding), 0)) as drate
      from anc
    )
    select mid, (sum(drate / 100.0 * vol))::numeric(14,4) as amt from diff group by mid;

  -- 공유수당: requires_30pct 직급(5급+)은 balance_ok 일 때만. 3·4급은 무조건.
  drop table if exists _share;
  create temp table _share on commit drop as
    with vs as (
      select pc.ancestor_id as mid, sum(v.vol) as vsum
      from placement_closure pc join _vol v on v.member_id = pc.descendant_id
      where pc.depth >= 1 group by pc.ancestor_id
    )
    select rk.member_id as mid, (rr.override_rate / 100.0 * vs.vsum)::numeric(14,4) as amt
    from _rank rk
    join ranks rr on rr.rank = rk.rank
    join vs on vs.mid = rk.member_id
    where rr.override_rate is not null
      and (not rk.requires_30pct or rk.balance_ok);   -- ★ 30% 게이트는 공유수당에만

  -- 풀 초과 비례조정
  v_gross := coalesce((select sum(amt) from _level), 0)
           + coalesce((select sum(amt) from _rankc), 0)
           + coalesce((select sum(amt) from _share), 0);
  v_rev := coalesce((select sum(amount_usd) from subscriptions
                     where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
         + coalesce((select sum(amount_usd) from annual_memberships
                     where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0);
  v_pool := v_rev * v_pool_pct / 100;
  v_factor := case when v_gross > v_pool and v_pool > 0 then v_pool / v_gross else 1 end;

  delete from settlements where cycle = p_cycle;
  insert into settlements(cycle, member_id, level_amount, rank_amount, share_amount, total_amount, status, member_rank)
    select p_cycle, ids.member_id,
      round(coalesce(l.amt, 0) * v_factor, 2),
      round(coalesce(r.amt, 0) * v_factor, 2),
      round(coalesce(s.amt, 0) * v_factor, 2),
      round((coalesce(l.amt, 0) + coalesce(r.amt, 0) + coalesce(s.amt, 0)) * v_factor, 2),
      'calculated',
      coalesce(rk.rank, 0)                              -- ★ 그 달 평가 직급 기록(월별 재평가)
    from (select mid as member_id from _level
          union select mid from _rankc
          union select mid from _share) ids
    left join _level l on l.mid = ids.member_id
    left join _rankc r on r.mid = ids.member_id
    left join _share s on s.mid = ids.member_id
    left join _rank rk on rk.member_id = ids.member_id
    where (coalesce(l.amt, 0) + coalesce(r.amt, 0) + coalesce(s.amt, 0)) * v_factor > 0;

  return query
    select count(*)::int,
      coalesce(sum(level_amount), 0), coalesce(sum(rank_amount), 0),
      coalesce(sum(share_amount), 0), coalesce(sum(total_amount), 0)
    from settlements where cycle = p_cycle;
end;
$$;

grant execute on function evaluate_rank(uuid) to anon, authenticated, service_role;
grant execute on function run_settlement(text, date) to service_role;

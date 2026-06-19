-- 0011_pool_proration.sql — 풀 초과 시 비례조정 (req1 정합)
--   산정 합계(레벨+직급+공유)가 수당풀(매출 × pool_commission_pct%)을 초과하면
--   전체 지급액을 factor = pool / gross 로 비례 삭감해 풀 안에 맞춘다(비율 유지).
--   초과하지 않으면 factor=1 (변화 없음).

insert into comp_settings(key, value, label) values
  ('pool_commission_pct', 60, '수당풀 비율(매출 %)')
on conflict (key) do nothing;

create or replace function run_settlement(p_cycle text, p_as_of date default current_date)
returns table(
  members_paid int,
  level_total numeric,
  rank_total numeric,
  share_total numeric,
  grand_total numeric
)
language plpgsql as $$
declare
  c_sub numeric := 120;
  c_ann numeric := 200;
  c_l1  numeric;
  c_l2  numeric;
  v_pool_pct numeric;
  v_rev   numeric;
  v_pool  numeric;
  v_gross numeric;
  v_factor numeric;
begin
  c_l1 := coalesce((select value / 100 from comp_settings where key = 'level_gen1_pct'), 0.25);
  c_l2 := coalesce((select value / 100 from comp_settings where key = 'level_gen2_pct'), 0.09);
  v_pool_pct := coalesce((select value from comp_settings where key = 'pool_commission_pct'), 60);

  perform refresh_active_subscribers(p_as_of);

  drop table if exists _qual;
  create temp table _qual on commit drop as
    select m.id as member_id
    from members m
    where m.role = 'marketer' and m.is_active_subscriber
      and exists (select 1 from annual_memberships a
                  where a.member_id = m.id and p_as_of between a.period_start and a.period_end);

  drop table if exists _rank;
  create temp table _rank on commit drop as
    select q.member_id, er.rank, er.rate_pct
    from _qual q cross join lateral evaluate_rank(q.member_id) er
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

  drop table if exists _share;
  create temp table _share on commit drop as
    with vs as (
      select pc.ancestor_id as mid, sum(v.vol) as vsum
      from placement_closure pc join _vol v on v.member_id = pc.descendant_id
      where pc.depth >= 1 group by pc.ancestor_id
    )
    select rk.member_id as mid, (rr.override_rate / 100.0 * vs.vsum)::numeric(14,4) as amt
    from _rank rk join ranks rr on rr.rank = rk.rank join vs on vs.mid = rk.member_id
    where rr.override_rate is not null;

  -- ── 풀 초과 비례조정 ──
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
  insert into settlements(cycle, member_id, level_amount, rank_amount, share_amount, total_amount, status)
    select p_cycle, ids.member_id,
      round(coalesce(l.amt, 0) * v_factor, 2),
      round(coalesce(r.amt, 0) * v_factor, 2),
      round(coalesce(s.amt, 0) * v_factor, 2),
      round((coalesce(l.amt, 0) + coalesce(r.amt, 0) + coalesce(s.amt, 0)) * v_factor, 2),
      'calculated'
    from (select mid as member_id from _level
          union select mid from _rankc
          union select mid from _share) ids
    left join _level l on l.mid = ids.member_id
    left join _rankc r on r.mid = ids.member_id
    left join _share s on s.mid = ids.member_id
    where (coalesce(l.amt, 0) + coalesce(r.amt, 0) + coalesce(s.amt, 0)) * v_factor > 0;

  return query
    select count(*)::int,
      coalesce(sum(level_amount), 0), coalesce(sum(rank_amount), 0),
      coalesce(sum(share_amount), 0), coalesce(sum(total_amount), 0)
    from settlements where cycle = p_cycle;
end;
$$;

grant execute on function run_settlement(text, date) to service_role;

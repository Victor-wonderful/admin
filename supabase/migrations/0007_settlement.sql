-- 0007_settlement.sql — 정산 엔진
-- 사이클(YYYY-MM)의 마케터 수당을 계산해 settlements 에 기록(멱등 재산정).
--
-- 기준금 = 월 구독료 $120 (활성 구독자 1명 = 월 $120 매출).
-- 3종 수당:
--   1) 레벨 수당  — 직추(recommender) 체인. 활성 구독당 1대 25% · 2대 9% × $120 (3대+ 차단).
--   2) 직급 수당  — 후원(placement) 상향 롤업 차액차등 + 브레이크어웨이.
--                  각 활성 구독($120)이 후원 조상 라인을 타고 올라가며,
--                  자격 직급자는 (본인 요율 − 더 가까운 자격자의 요율) 차액만 수령.
--                  요율은 직급과 함께 단조 증가하므로, 산하 동급/상위가 이미 받았으면 차액=0(차단).
--   3) 공유 수당  — 후원 산하 활성수 × 직급 override 요율(3~9직급) × $120, 누적(중복수령).
--                  30% 균형 게이트는 evaluate_rank 가 자격 직급에 이미 반영.

-- refresh_active_subscribers: WHERE 절 추가(0003 의 무조건 UPDATE 는 Supabase API 역할의
-- safeupdate 가드에 막힘). 값이 바뀌는 행만 갱신 → 가드 통과 + 불필요한 쓰기 제거.
create or replace function refresh_active_subscribers(as_of date default current_date)
returns void language sql as $$
  update members m
  set is_active_subscriber = exists (
    select 1 from subscriptions s
    where s.member_id = m.id and s.status = 'active'
      and as_of between s.period_start and s.period_end
  )
  where m.is_active_subscriber is distinct from exists (
    select 1 from subscriptions s
    where s.member_id = m.id and s.status = 'active'
      and as_of between s.period_start and s.period_end
  );
$$;

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
  c_base numeric := 120;    -- 기준금(월 구독료)
  c_l1   numeric := 0.25;   -- 레벨 1대 요율
  c_l2   numeric := 0.09;   -- 레벨 2대 요율
begin
  -- 0) 활성 구독자 플래그 최신화
  perform refresh_active_subscribers(p_as_of);

  -- 마케터별 자격 직급(evaluate_rank = 30% 게이트 반영된 '실제' 직급)
  drop table if exists _rank;
  create temp table _rank on commit drop as
    select m.id as member_id, er.rank, er.rate_pct
    from members m
    cross join lateral evaluate_rank(m.id) er
    where m.role = 'marketer' and er.rank > 0;

  -- 활성 구독 리프
  drop table if exists _leaf;
  create temp table _leaf on commit drop as
    select id from members where is_active_subscriber;

  -- 1) 레벨 수당 (직추 2대)
  drop table if exists _level;
  create temp table _level on commit drop as
    with a as (
      select id, recommender_id
      from members where is_active_subscriber and recommender_id is not null
    ),
    g1 as (select recommender_id as mid, c_l1 * c_base as amt from a),
    g2 as (
      select r.recommender_id as mid, c_l2 * c_base as amt
      from a join members r on r.id = a.recommender_id
      where r.recommender_id is not null
    )
    select mid, sum(amt)::numeric(12,2) as amt
    from (select * from g1 union all select * from g2) u
    group by mid;

  -- 2) 직급 수당 (차액차등 + 브레이크어웨이)
  drop table if exists _rankc;
  create temp table _rankc on commit drop as
    with anc as (
      select pc.descendant_id as leaf, pc.ancestor_id as mid, pc.depth, rk.rate_pct
      from placement_closure pc
      join _leaf lf on lf.id = pc.descendant_id
      join _rank rk on rk.member_id = pc.ancestor_id
      where pc.depth >= 1
    ),
    diff as (
      select mid,
        greatest(0, rate_pct - coalesce(
          max(rate_pct) over (
            partition by leaf order by depth asc
            rows between unbounded preceding and 1 preceding
          ), 0)) as drate
      from anc
    )
    select mid, (sum(drate) / 100.0 * c_base)::numeric(12,2) as amt
    from diff group by mid;

  -- 3) 공유 수당 (override 누적 중복수령)
  drop table if exists _share;
  create temp table _share on commit drop as
    with cnt as (
      select pc.ancestor_id as mid, count(*) as n
      from placement_closure pc
      join members m on m.id = pc.descendant_id
      where pc.depth >= 1 and m.is_active_subscriber
      group by pc.ancestor_id
    )
    select rk.member_id as mid, (rr.override_rate / 100.0 * c_base * cnt.n)::numeric(12,2) as amt
    from _rank rk
    join ranks rr on rr.rank = rk.rank
    join cnt on cnt.mid = rk.member_id
    where rr.override_rate is not null;

  -- 4) settlements 멱등 재기록 (수령액 0 인 마케터는 제외)
  delete from settlements where cycle = p_cycle;
  insert into settlements(cycle, member_id, level_amount, rank_amount, share_amount, total_amount, status)
    select p_cycle, ids.member_id,
      coalesce(l.amt, 0), coalesce(r.amt, 0), coalesce(s.amt, 0),
      coalesce(l.amt, 0) + coalesce(r.amt, 0) + coalesce(s.amt, 0),
      'calculated'
    from (
      select mid as member_id from _level
      union select mid from _rankc
      union select mid from _share
    ) ids
    left join _level l on l.mid = ids.member_id
    left join _rankc r on r.mid = ids.member_id
    left join _share s on s.mid = ids.member_id
    where coalesce(l.amt, 0) + coalesce(r.amt, 0) + coalesce(s.amt, 0) > 0;

  return query
    select count(*)::int,
      coalesce(sum(level_amount), 0),
      coalesce(sum(rank_amount), 0),
      coalesce(sum(share_amount), 0),
      coalesce(sum(total_amount), 0)
    from settlements where cycle = p_cycle;
end;
$$;

grant execute on function run_settlement(text, date) to service_role;

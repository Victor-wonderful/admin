-- 0009_comp_rules.sql — 정산 엔진 규칙 보강
--   (4) 마케터 자격 = 활성 구독($120) + 활성 연회비($200) 둘 다
--   (3,5) 자격 상실/비활성자는 수당 미수령. 단 그 하위 볼륨은 상위로 그대로 전달(압축).
--        - 레벨: 1·2대 각각 독립 게이팅, 승급 없음(1대 상실 시 2대만 수령)
--        - 직급: 자격자끼리만 차액차등 → 비활성 중간자는 투명(상위가 차액 흡수)
--   (6) 직급 차액: (본인 요율 − 더 가까운 자격 하위 요율). 이미 구현, 자격자 기준으로 정확화.
--   (7) 요율 설정화: 레벨 1·2대 요율을 comp_settings 로 분리(직급/공유 요율은 ranks 테이블).

-- 보상 설정(요율 등) 단일 소스. 직급/공유 요율은 ranks 테이블, 그 외 전역 요율은 여기.
create table if not exists comp_settings (
  key   text primary key,
  value numeric not null,
  label text
);
insert into comp_settings(key, value, label) values
  ('level_gen1_pct', 25, '레벨 1대 요율(%)'),
  ('level_gen2_pct',  9, '레벨 2대 요율(%)')
on conflict (key) do nothing;

grant all on table comp_settings to anon, authenticated, service_role;

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
  c_sub numeric := 120;    -- 월 구독료(볼륨)
  c_ann numeric := 200;    -- 연회비(볼륨)
  c_l1  numeric;           -- 레벨 1대 요율(설정)
  c_l2  numeric;           -- 레벨 2대 요율(설정)
begin
  c_l1 := coalesce((select value / 100 from comp_settings where key = 'level_gen1_pct'), 0.25);
  c_l2 := coalesce((select value / 100 from comp_settings where key = 'level_gen2_pct'), 0.09);

  -- 0) 활성 구독자 플래그 최신화
  perform refresh_active_subscribers(p_as_of);

  -- 자격 마케터 = 활성 구독 + 활성 연회비 둘 다 (수당 수령 자격)
  drop table if exists _qual;
  create temp table _qual on commit drop as
    select m.id as member_id
    from members m
    where m.role = 'marketer'
      and m.is_active_subscriber
      and exists (
        select 1 from annual_memberships a
        where a.member_id = m.id and p_as_of between a.period_start and a.period_end
      );

  -- 자격 마케터의 직급(evaluate_rank). 자격자만 → 비자격/비활성 상위는 수령에서 제외(투명).
  drop table if exists _rank;
  create temp table _rank on commit drop as
    select q.member_id, er.rank, er.rate_pct
    from _qual q
    cross join lateral evaluate_rank(q.member_id) er
    where er.rank > 0;

  -- 수당 base 볼륨 V(m) = 활성 구독($120) + 활성 연회비($200). (볼륨 발생은 자격과 무관)
  drop table if exists _vol;
  create temp table _vol on commit drop as
    select m.id as member_id,
      (case when m.is_active_subscriber then c_sub else 0 end)
      + (case when exists (
            select 1 from annual_memberships a
            where a.member_id = m.id and p_as_of between a.period_start and a.period_end
         ) then c_ann else 0 end) as vol
    from members m;
  delete from _vol where vol <= 0;

  -- 1) 레벨 수당 (직추 2대) — 각 대(代) 수령자가 자격자일 때만 지급. 승급 없음.
  drop table if exists _level;
  create temp table _level on commit drop as
    with a as (
      select v.member_id as id, m.recommender_id, v.vol
      from _vol v join members m on m.id = v.member_id
      where m.recommender_id is not null
    ),
    g1 as (  -- 1대: 추천인이 자격자
      select a.recommender_id as mid, c_l1 * a.vol as amt
      from a join _qual q1 on q1.member_id = a.recommender_id
    ),
    g2 as (  -- 2대: 추천인의 추천인이 자격자
      select r.recommender_id as mid, c_l2 * a.vol as amt
      from a
      join members r on r.id = a.recommender_id
      join _qual q2 on q2.member_id = r.recommender_id
      where r.recommender_id is not null
    )
    select mid, sum(amt)::numeric(12,2) as amt
    from (select * from g1 union all select * from g2) u
    group by mid;

  -- 2) 직급 수당 (차액차등 + 브레이크어웨이) — 자격 조상끼리만 차액(비활성 중간자 투명)
  drop table if exists _rankc;
  create temp table _rankc on commit drop as
    with anc as (
      select pc.descendant_id as leaf, pc.ancestor_id as mid, pc.depth, rk.rate_pct, v.vol
      from placement_closure pc
      join _vol v on v.member_id = pc.descendant_id
      join _rank rk on rk.member_id = pc.ancestor_id   -- 자격 + 직급 보유자만
      where pc.depth >= 1
    ),
    diff as (
      select mid, vol,
        greatest(0, rate_pct - coalesce(
          max(rate_pct) over (
            partition by leaf order by depth asc
            rows between unbounded preceding and 1 preceding
          ), 0)) as drate
      from anc
    )
    select mid, (sum(drate / 100.0 * vol))::numeric(12,2) as amt
    from diff group by mid;

  -- 3) 공유 수당 (override 누적) — 자격 직급자만 수령
  drop table if exists _share;
  create temp table _share on commit drop as
    with vs as (
      select pc.ancestor_id as mid, sum(v.vol) as vsum
      from placement_closure pc
      join _vol v on v.member_id = pc.descendant_id
      where pc.depth >= 1
      group by pc.ancestor_id
    )
    select rk.member_id as mid, (rr.override_rate / 100.0 * vs.vsum)::numeric(12,2) as amt
    from _rank rk
    join ranks rr on rr.rank = rk.rank
    join vs on vs.mid = rk.member_id
    where rr.override_rate is not null;

  -- 4) settlements 멱등 재기록
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

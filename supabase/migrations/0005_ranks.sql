-- 0005_ranks.sql — 직급 정의 + 직급 산정 함수 (자격 표시용. 금액 계산은 추후)
--
-- 직급 기준: 후원계보 포함 전체 활성 구독유저수.
--   - 1직급: 본인 직접추천 2명 (직추만)
--   - 2,3직급: 총 활성 OR 직접추천 수 (1~3직급은 직추 대체 인정)
--   - 4직급~: 총 활성수만
--   - 5직급 이상: 기타소실적이 전체의 30% 이상이어야 자격 유지 (대실적 몰빵 방지)
-- override_rate = 직급 차등 누적배분 요율(이미지2). 저장만, 계산은 추후.

create table ranks (
  rank            int primary key,        -- 1..9
  rate_pct        numeric(5,2) not null,  -- 직급요율
  min_total       int,                    -- 후원 전체 활성 기준(없으면 null)
  min_direct      int,                    -- 직접추천 대체 기준(1~3직급만)
  override_rate   numeric(5,2),           -- 차등 누적배분 요율(3~9직급)
  requires_30pct  boolean not null default false, -- 5직급+ 30% 게이트
  label           text not null
);

insert into ranks(rank, rate_pct, min_total, min_direct, override_rate, requires_30pct, label) values
  (1,  5.00, null,    2, null,  false, '1직급'),
  (2, 12.00,  300,   50, null,  false, '2직급'),
  (3, 22.00,  600,  100, 4.00,  false, '3직급'),
  (4, 30.00, 1500, null, 3.00,  false, '4직급'),
  (5, 36.00, 3000, null, 2.50,  true,  '5직급'),
  (6, 41.00, 7000, null, 1.50,  true,  '6직급'),
  (7, 45.00, 20000, null, 1.00, true,  '7직급'),
  (8, 48.00, 40000, null, 1.00, true,  '8직급'),
  (9, 53.00, 80000, null, 1.00, true,  '9직급');

-- 직접추천(1대) 활성 구독자 수
create or replace function direct_active_count(m_id uuid)
returns bigint language sql stable as $$
  select count(*) from members
  where recommender_id = m_id and is_active_subscriber;
$$;

-- 직급 산정: 조건을 충족하는 가장 높은 직급 + 자격/진행 정보
create or replace function evaluate_rank(m_id uuid)
returns table(
  rank int,
  rate_pct numeric,
  total_active bigint,
  direct_active bigint,
  major_leg bigint,
  other_minor bigint,
  balance_pct numeric,
  balance_ok boolean,
  blocked_by_balance boolean,   -- 카운트는 5직급+ 되지만 30% 미달로 막힘
  next_rank int,
  next_min_total int,
  next_min_direct int
)
language plpgsql stable as $$
declare
  v_total bigint; v_major bigint; v_minor bigint; v_direct bigint;
  v_pct numeric; v_rank int := 0; v_count_rank int := 0; r record;
begin
  select mm.total_active, mm.major_leg, mm.other_minor
    into v_total, v_major, v_minor
  from get_major_minor(m_id) mm;
  v_direct := direct_active_count(m_id);
  v_pct := case when v_total > 0 then round(v_minor::numeric / v_total, 4) else 0 end;

  for r in select * from ranks order by ranks.rank loop
    -- 카운트/직추 조건 충족 여부
    if (r.min_total is not null and v_total >= r.min_total)
       or (r.min_direct is not null and v_direct >= r.min_direct) then
      v_count_rank := r.rank;                       -- 30% 무시한 '카운트상' 직급
      if (not r.requires_30pct) or (v_pct >= 0.30) then
        v_rank := r.rank;                           -- 실제 자격 직급
      end if;
    end if;
  end loop;

  return query
  select
    v_rank,
    coalesce((select ranks.rate_pct from ranks where ranks.rank = v_rank), 0),
    v_total, v_direct, v_major, v_minor, v_pct,
    (v_pct >= 0.30),
    (v_count_rank >= 5 and v_rank < v_count_rank),  -- 30% 미달로 강등됐는가
    case when v_rank < 9 then v_rank + 1 else null end,
    (select ranks.min_total  from ranks where ranks.rank = v_rank + 1),
    (select ranks.min_direct from ranks where ranks.rank = v_rank + 1);
end;
$$;

grant select on ranks to anon, authenticated, service_role;
grant execute on function direct_active_count(uuid), evaluate_rank(uuid)
  to anon, authenticated, service_role;

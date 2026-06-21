-- settlement_verify.sql — 정산 엔진 결정적 검증 (손계산 대조)
-- 실행: docker exec -i supabase_db_admin psql -U postgres -d postgres < supabase/tests/settlement_verify.sql
--
-- 전략: BEGIN ... ROLLBACK 트랜잭션 안에서
--   (1) 실시간 트리거 OFF (배치 엔진만 격리 검증)
--   (2) 직급 임계치(min_total) 축소 → 소수 픽스처로 3직급 도달(공유수당 경로 활성화)
--   (3) 기존 시드 전체 삭제(cascade) 후 4노드 라인 픽스처 삽입
--   (4) allocate_revenue → run_settlement → pay_commission 실행
--   (5) 손계산 기대값과 전부 대조, 불일치는 _fail 에 적재 후 최종 예외
-- 세션 종료/예외 시 트랜잭션 자동 롤백 → 실제 1200명 시드 그대로 보존.
--
-- ── 픽스처 (추천=후원 동일 라인)  A → B → C → D ──
--   전원 마케터, 활성구독($120)+활성연회비($200) → V=320, 전원 자격
--   축소 임계치: rank1 min_total=1, rank2=2, rank3=3 (override 4%)
--   직급: A=3직급(22%,ov4)  B=2직급(12%)  C=1직급(5%)  D=무직급
--
-- ── 손계산 기대값 ──
--   레벨(직추 25%/9%):  A=108.8  B=108.8  C=80   D=0     합 297.6
--   직급(차액차등+브레이크어웨이): A=134.4 B=60.8 C=16  D=0  합 211.2
--   공유(override): A=4%×960=38.4  나머지 0                 합 38.4
--   회원합계: A=281.6  B=169.6  C=96  (members_paid=3, grand=547.2)
--   매출=4×120+4×200=1280 → 수당풀=60%=768 (gross 547.2<768 → 비례조정 없음)
--   정합: 풀잔액=768-547.2=220.8  utilization=71.3%  over_pool=false

\set ON_ERROR_STOP on
begin;

-- 검증 헬퍼: 기대±0.01 벗어나면 _fail 에 기록 + WARNING
create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got, -999999) - p_want) <= 0.01 then
    raise notice 'PASS  % : %', rpad(p_label,20), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,20), p_got, p_want;
  end if;
end;
$f$;

-- (1) 실시간 트리거 격리
alter table subscriptions       disable trigger trg_settle_payment_sub;
alter table annual_memberships  disable trigger trg_settle_payment_annual;

-- (2) 직급 임계치 축소 (롤백됨)
update ranks set min_total = 1 where rank = 1;
update ranks set min_total = 2 where rank = 2;
update ranks set min_total = 3 where rank = 3;

-- (3) 시드 비우고 픽스처만
delete from commission_payouts;
delete from revenue_allocations;
delete from members;                       -- cascade
update system_wallets set balance_usd = 0;

insert into members (id, display_name, email, role, recommender_id, parent_id, is_active_subscriber) values
  ('11111111-1111-1111-1111-111111111111','A','a@test.io','marketer', null,                                   null,                                   true),
  ('22222222-2222-2222-2222-222222222222','B','b@test.io','marketer','11111111-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111', true),
  ('33333333-3333-3333-3333-333333333333','C','c@test.io','marketer','22222222-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', true),
  ('44444444-4444-4444-4444-444444444444','D','d@test.io','marketer','33333333-3333-3333-3333-333333333333','33333333-3333-3333-3333-333333333333', true);

-- 후원 클로저는 trg_placement_closure_insert 트리거가 members 삽입 시 자동 생성(수동 X)

insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active' from members;
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00' from members;
insert into wallets (member_id, balance_usd, deposit_address)
  select id, 0, 'test-'||display_name from members;

-- (4)+(5) 실행 & 대조
do $$
declare
  v_mp int; v_lt numeric; v_rt numeric; v_st numeric; v_gt numeric;
  a_amt numeric; b_amt numeric; c_amt numeric; d_cnt int;
  rec record;
begin
  perform allocate_revenue('2026-06');

  select members_paid, level_total, rank_total, share_total, grand_total
    into v_mp, v_lt, v_rt, v_st, v_gt
  from run_settlement('2026-06','2026-06-15');

  raise notice '──── 합계 ────';
  perform pg_temp.chk('members_paid', v_mp, 3);
  perform pg_temp.chk('level_total',  v_lt, 297.6);
  perform pg_temp.chk('rank_total',   v_rt, 211.2);
  perform pg_temp.chk('share_total',  v_st, 38.4);
  perform pg_temp.chk('grand_total',  v_gt, 547.2);

  raise notice '──── 회원별 총수당 ────';
  select total_amount into a_amt from settlements where cycle='2026-06' and member_id='11111111-1111-1111-1111-111111111111';
  select total_amount into b_amt from settlements where cycle='2026-06' and member_id='22222222-2222-2222-2222-222222222222';
  select total_amount into c_amt from settlements where cycle='2026-06' and member_id='33333333-3333-3333-3333-333333333333';
  perform pg_temp.chk('A 총수당', a_amt, 281.6);
  perform pg_temp.chk('B 총수당', b_amt, 169.6);
  perform pg_temp.chk('C 총수당', c_amt, 96.0);

  perform pay_commission('2026-06','instant','2026-06-15');
  perform pay_commission('2026-06','share','2026-06-15');

  raise notice '──── 풀 정합 ────';
  select * into rec from pool_reconciliation('2026-06');
  perform pg_temp.chk('pool_allocated',  rec.pool_allocated,  768.0);
  perform pg_temp.chk('computed_payout', rec.computed_payout, 547.2);
  perform pg_temp.chk('paid_out',        rec.paid_out,        547.2);
  perform pg_temp.chk('remaining',       rec.remaining,       220.8);
  perform pg_temp.chk('utilization_pct', rec.utilization_pct, 71.3);
  if rec.over_pool then insert into _fail values ('over_pool', 1, 0); raise warning 'FAIL over_pool true <<<'; else raise notice 'PASS  over_pool : false'; end if;

  select balance_usd into b_amt from system_wallets where kind='pool_commission';
  perform pg_temp.chk('풀잔액(파생)', b_amt, 220.8);

  select balance_usd into a_amt from wallets where member_id='11111111-1111-1111-1111-111111111111';
  perform pg_temp.chk('A 지갑적립', a_amt, 281.6);

  select count(*) into d_cnt from settlements where cycle='2026-06' and member_id='44444444-4444-4444-4444-444444444444';
  if d_cnt <> 0 then insert into _fail values ('D(0원) 행 존재', d_cnt, 0); raise warning 'FAIL D row exists <<<'; else raise notice 'PASS  D 제외(0원)'; end if;
end;
$$;

-- 최종 게이트
do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then
    raise notice '✅ ALL PASS — 정산 엔진 검증 통과';
  else
    raise exception '❌ % 건 FAIL — 위 <<< 라인 확인', n;
  end if;
end;
$$;

rollback;  -- 실제 시드 원복

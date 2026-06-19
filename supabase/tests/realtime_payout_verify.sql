-- realtime_payout_verify.sql — 실시간 지급 트리거(0012/0013) 결정적 검증
-- 실행: npm run test:realtime  (또는 docker exec … < 이 파일)
--
-- 전략: BEGIN…ROLLBACK 안에서
--   (1) settle 트리거 OFF 상태로 자격 트리(A→B→C→D, 전원 활성구독+활성연회비) 세팅
--       → 세팅 중 결제 INSERT 가 실시간 지급을 일으키지 않게 격리.
--   (2) 직급 임계치 축소(C=R1 5% / B=R2 12% / A=R3 22%).
--   (3) settle 트리거 ON → D 의 구독 결제 $120 1건 INSERT → 트리거가 그 이벤트만 즉시 지급.
--   (4) 그 1건이 만든 지급액만 손계산과 대조.
-- 실시간 지급은 결제 볼륨이 두 트리(직추/후원)를 타고 상위 '자격자'에게 즉시:
--   레벨 1대(C) 25%·2대(B) 9%, 직급 차액(C5%·B7%·A10%) — 공유는 실시간 아님(월배치).
-- 전역 시드 삭제 불필요(이벤트는 D 의 상위 A·B·C 에만 영향). 풀은 절대값 대신 Δ로 검증.
--
-- ── 손계산 (D 의 $120 결제 1건) ──
--   레벨: C +30(25%) · B +10.8(9%)
--   직급: C +6(5%) · B +8.4(7%) · A +12(10%)
--   지갑 Δ: A=12 · B=19.2 · C=36 · D=0   합 67.2,  풀 Δ = −67.2

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got, -999999) - p_want) <= 0.01 then
    raise notice 'PASS  % : %', rpad(p_label,22), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,22), p_got, p_want;
  end if;
end;
$f$;

-- (1) 트리거 OFF
alter table subscriptions       disable trigger trg_settle_payment_sub;
alter table annual_memberships  disable trigger trg_settle_payment_annual;

-- (2) 직급 임계치 축소
update ranks set min_total = 1 where rank = 1;
update ranks set min_total = 2 where rank = 2;
update ranks set min_total = 3 where rank = 3;

-- 자격 트리 (b 프리픽스 — 정산 테스트와 구분)
insert into members (id, display_name, email, role, recommender_id, parent_id, is_active_subscriber) values
  ('bbbbbbbb-0000-0000-0000-000000000001','RA','ra@test.io','marketer', null,                                   null,                                   true),
  ('bbbbbbbb-0000-0000-0000-000000000002','RB','rb@test.io','marketer','bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001', true),
  ('bbbbbbbb-0000-0000-0000-000000000003','RC','rc@test.io','marketer','bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002', true),
  ('bbbbbbbb-0000-0000-0000-000000000004','RD','rd@test.io','marketer','bbbbbbbb-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000003', true);
-- 후원 클로저는 트리거 자동 생성

-- 자격 확립: 기존 활성 구독 + 활성 연회비 (트리거 OFF 라 지급 안 일어남)
insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-05 00:00:00+00', 'active'
  from members where id::text like 'bbbbbbbb-%';
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-05 00:00:00+00'
  from members where id::text like 'bbbbbbbb-%';
insert into wallets (member_id, balance_usd, deposit_address)
  select id, 0, 'rt-'||display_name from members where id::text like 'bbbbbbbb-%';

do $$
declare
  A uuid := 'bbbbbbbb-0000-0000-0000-000000000001';
  B uuid := 'bbbbbbbb-0000-0000-0000-000000000002';
  C uuid := 'bbbbbbbb-0000-0000-0000-000000000003';
  D uuid := 'bbbbbbbb-0000-0000-0000-000000000004';
  pool0 numeric; pool1 numeric;
  wa numeric; wb numeric; wc numeric; wd numeric;
  pa numeric; pb numeric; pc numeric;
begin
  -- 자격 확인 (사전조건)
  raise notice '──── 사전조건 ────';
  perform pg_temp.chk('C 자격', case when is_qualified_marketer(C,'2026-06-20') then 1 else 0 end, 1);
  perform pg_temp.chk('B 자격', case when is_qualified_marketer(B,'2026-06-20') then 1 else 0 end, 1);
  perform pg_temp.chk('A 자격', case when is_qualified_marketer(A,'2026-06-20') then 1 else 0 end, 1);

  select balance_usd into pool0 from system_wallets where kind = 'pool_commission';

  -- (3) 트리거 ON (구독 결제만 발화시키면 충분)
  alter table subscriptions enable trigger trg_settle_payment_sub;

  -- D 의 신규 결제 1건 → 실시간 지급 발화
  insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  values (D, 120, date '2026-06-20', date '2026-07-19', timestamptz '2026-06-20 00:00:00+00', 'active');

  -- (4) 지갑 Δ 검증
  select balance_usd into wa from wallets where member_id = A;
  select balance_usd into wb from wallets where member_id = B;
  select balance_usd into wc from wallets where member_id = C;
  select balance_usd into wd from wallets where member_id = D;
  raise notice '──── 실시간 지급 결과(지갑 Δ) ────';
  perform pg_temp.chk('A 지갑(직급10%)', wa, 12);
  perform pg_temp.chk('B 지갑(레벨2+직급7)', wb, 19.2);
  perform pg_temp.chk('C 지갑(레벨1+직급5)', wc, 36);
  perform pg_temp.chk('D 지갑(본인 0)', wd, 0);

  -- 지급 원장(instant) 누적
  select amount_usd into pa from commission_payouts where member_id=A and scope='instant';
  select amount_usd into pb from commission_payouts where member_id=B and scope='instant';
  select amount_usd into pc from commission_payouts where member_id=C and scope='instant';
  raise notice '──── 지급원장(instant) ────';
  perform pg_temp.chk('A 원장', pa, 12);
  perform pg_temp.chk('B 원장', pb, 19.2);
  perform pg_temp.chk('C 원장', pc, 36);

  -- 풀 Δ = −67.2 (sync_pool_commission 파생)
  select balance_usd into pool1 from system_wallets where kind = 'pool_commission';
  raise notice '──── 풀 정합 Δ ────';
  perform pg_temp.chk('풀 차감액(Δ)', pool0 - pool1, 67.2);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 실시간 지급 검증 통과';
  else raise exception '❌ % 건 FAIL — 위 <<< 라인 확인', n; end if;
end;
$$;

rollback;

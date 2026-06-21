-- realtime_batch_reconcile_verify.sql — 실시간 ↔ 배치 정합 (멱등 reconcile)
-- 실행: npm run test:reconcile
--
-- 보장: 한 달간 결제가 실시간 트리거로 부분 지급되어도, 월말 배치
--   run_settlement + pay_commission(delta) 를 거치면 각 회원의 누적 지급액이
--   '배치 산정액'에 정확히 수렴하고(과부족 0), 재실행해도 이중지급이 없다.
-- 실시간은 결제 '이벤트 볼륨'(각 결제액) 기준, 배치는 '표준 볼륨' V(m)=활성구독120+활성연회비200 기준.
--   → 실시간이 연회비분/순서로 일부만 지급해도 batch delta 가 정확히 보충(절대 초과 없음).
-- BEGIN…ROLLBACK. 임계치는 소규모 도달 위해 축소(요율 로직은 실값).

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got, -999999) - p_want) <= 0.02 then
    raise notice 'PASS  % : %', rpad(p_label,30), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,30), p_got, p_want;
  end if;
end;
$f$;

alter table subscriptions       disable trigger trg_settle_payment_sub;
alter table annual_memberships  disable trigger trg_settle_payment_annual;
update ranks set min_total = 1 where rank = 1;
update ranks set min_total = 2 where rank = 2;
update ranks set min_total = 3 where rank = 3;

-- 트리 A→B→C→D (c 프리픽스)
insert into members (id, display_name, email, role, recommender_id, parent_id, is_active_subscriber) values
  ('cccccccc-0000-0000-0000-000000000001','XA','xa@test.io','marketer', null,                                   null,                                   false),
  ('cccccccc-0000-0000-0000-000000000002','XB','xb@test.io','marketer','cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000001', false),
  ('cccccccc-0000-0000-0000-000000000003','XC','xc@test.io','marketer','cccccccc-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000002', false),
  ('cccccccc-0000-0000-0000-000000000004','XD','xd@test.io','marketer','cccccccc-0000-0000-0000-000000000003','cccccccc-0000-0000-0000-000000000003', false);
-- 연회비(자격 요건) — 트리거 OFF 라 지급 안 일어남
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-02 00:00:00+00'
  from members where id::text like 'cccccccc-%';
insert into wallets (member_id, balance_usd, deposit_address)
  select id, 0, 'rc-'||display_name from members where id::text like 'cccccccc-%';

do $$
declare
  A uuid := 'cccccccc-0000-0000-0000-000000000001';
  B uuid := 'cccccccc-0000-0000-0000-000000000002';
  C uuid := 'cccccccc-0000-0000-0000-000000000003';
  D uuid := 'cccccccc-0000-0000-0000-000000000004';
  rt_total numeric; owed_total numeric;
  wa numeric; wb numeric; wc numeric;
  oa numeric; ob numeric; oc numeric;
  again int;
begin
  -- 트리거 ON → 한 달치 구독 결제 순차 발생(상위부터: 실시간이 최대한 지급되는 정상 흐름)
  alter table subscriptions enable trigger trg_settle_payment_sub;
  insert into subscriptions(member_id,amount_usd,period_start,period_end,paid_at,status) values
    (A,120,date '2026-06-03',date '2026-07-02',timestamptz '2026-06-03 00:00:00+00','active');
  insert into subscriptions(member_id,amount_usd,period_start,period_end,paid_at,status) values
    (B,120,date '2026-06-04',date '2026-07-03',timestamptz '2026-06-04 00:00:00+00','active');
  insert into subscriptions(member_id,amount_usd,period_start,period_end,paid_at,status) values
    (C,120,date '2026-06-05',date '2026-07-04',timestamptz '2026-06-05 00:00:00+00','active');
  insert into subscriptions(member_id,amount_usd,period_start,period_end,paid_at,status) values
    (D,120,date '2026-06-06',date '2026-07-05',timestamptz '2026-06-06 00:00:00+00','active');

  -- 실시간 누적 지급(트리거가 만든 instant 원장)
  select coalesce(sum(amount_usd),0) into rt_total from commission_payouts
   where member_id in (A,B,C,D) and scope='instant';
  raise notice '──── 실시간 단계 ────';
  perform pg_temp.chk('실시간 지급 발생(>0)', case when rt_total > 0 then 1 else 0 end, 1);

  -- 월말 배치 산정(표준 볼륨 V=320). instant scope = level+rank
  perform run_settlement('2026-06','2026-06-15');
  select coalesce(sum(level_amount+rank_amount),0) into owed_total
    from settlements where cycle='2026-06' and member_id in (A,B,C,D);
  raise notice '배치 instant 산정합=%, 실시간 선지급=%', owed_total, rt_total;
  perform pg_temp.chk('실시간 ≤ 배치(초과지급 없음)', case when rt_total <= owed_total + 0.02 then 1 else 0 end, 1);

  -- 배치 reconcile (delta 보충)
  perform pay_commission('2026-06','instant','2026-06-15');
  perform pay_commission('2026-06','share','2026-06-15');

  -- 각 회원 지갑 == 배치 산정 총액(level+rank+share) → 과부족 0
  select balance_usd into wa from wallets where member_id=A;
  select balance_usd into wb from wallets where member_id=B;
  select balance_usd into wc from wallets where member_id=C;
  select total_amount into oa from settlements where cycle='2026-06' and member_id=A;
  select total_amount into ob from settlements where cycle='2026-06' and member_id=B;
  select coalesce((select total_amount from settlements where cycle='2026-06' and member_id=C),0) into oc;
  raise notice '──── reconcile 후 (지갑 == 배치 산정액) ────';
  perform pg_temp.chk('A 지갑=배치산정', wa, oa);
  perform pg_temp.chk('B 지갑=배치산정', wb, ob);
  perform pg_temp.chk('C 지갑=배치산정', wc, oc);

  -- 멱등: 재지급 0 (이중지급 없음)
  select members_paid into again from pay_commission('2026-06','instant','2026-06-15');
  raise notice '──── 멱등(재지급) ────';
  perform pg_temp.chk('instant 재지급 인원(0)', again, 0);
  select members_paid into again from pay_commission('2026-06','share','2026-06-15');
  perform pg_temp.chk('share 재지급 인원(0)', again, 0);

  -- 누적 지급원장 == 배치 산정 총액 (정합 최종)
  select coalesce(sum(amount_usd),0) into owed_total from commission_payouts
    where member_id in (A,B,C,D);
  select coalesce(sum(total_amount),0) into oa from settlements
    where cycle='2026-06' and member_id in (A,B,C,D);
  perform pg_temp.chk('지급원장합 == 산정총액', owed_total, oa);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 실시간+배치 reconcile 정합(과부족·이중지급 0)';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

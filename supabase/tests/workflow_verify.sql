-- workflow_verify.sql — 정산 확정 워크플로 검증 (0017)
-- 실행: npm run test:workflow
--   run_settlement(calculated) → confirm_settlements(confirmed) → set_settlement_hold(held)
--   → pay_commission(보류 제외 + 전액지급분 paid)
-- 픽스처: A→B→C→D 라인(전원 자격). A=281.6 B=169.6 C=96 (D=0 제외). B 를 보류.
-- BEGIN…ROLLBACK.

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got,-999999) - p_want) <= 0.02 then
    raise notice 'PASS  % : %', rpad(p_label,26), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,26), p_got, p_want;
  end if;
end;
$f$;

alter table subscriptions       disable trigger trg_settle_payment_sub;
alter table annual_memberships  disable trigger trg_settle_payment_annual;
update ranks set min_total = 1 where rank = 1;
update ranks set min_total = 2 where rank = 2;
update ranks set min_total = 3 where rank = 3;
delete from commission_payouts; delete from revenue_allocations; delete from members;
update system_wallets set balance_usd = 0;

insert into members (id, display_name, email, role, recommender_id, parent_id, is_active_subscriber) values
  ('a1111111-0000-0000-0000-000000000001','WA','wa@t.io','marketer', null,                                   null,                                   true),
  ('a1111111-0000-0000-0000-000000000002','WB','wb@t.io','marketer','a1111111-0000-0000-0000-000000000001','a1111111-0000-0000-0000-000000000001', true),
  ('a1111111-0000-0000-0000-000000000003','WC','wc@t.io','marketer','a1111111-0000-0000-0000-000000000002','a1111111-0000-0000-0000-000000000002', true),
  ('a1111111-0000-0000-0000-000000000004','WD','wd@t.io','marketer','a1111111-0000-0000-0000-000000000003','a1111111-0000-0000-0000-000000000003', true);
insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active' from members;
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00' from members;
insert into wallets (member_id, balance_usd, deposit_address)
  select id, 0, 'wf-'||display_name from members;

do $$
declare
  A uuid := 'a1111111-0000-0000-0000-000000000001';
  B uuid := 'a1111111-0000-0000-0000-000000000002';
  C uuid := 'a1111111-0000-0000-0000-000000000003';
  n int; sA text; sB text; sC text; wA numeric; wB numeric; wC numeric;
begin
  perform allocate_revenue('2026-06');
  perform run_settlement('2026-06','2026-06-15');

  -- 1) 산정 직후 = calculated
  select count(*) into n from settlements where cycle='2026-06' and status='calculated';
  raise notice '──── 산정 직후 ────';
  perform pg_temp.chk('calculated 건수(3)', n, 3);

  -- 2) 일괄 확정 → confirmed
  select confirm_settlements('2026-06') into n;
  raise notice '──── 일괄 확정 ────';
  perform pg_temp.chk('confirm 반영 건수(3)', n, 3);
  select count(*) into n from settlements where cycle='2026-06' and status='confirmed';
  perform pg_temp.chk('confirmed 건수(3)', n, 3);

  -- 3) B 보류
  perform set_settlement_hold('2026-06', B, true);
  select status into sB from settlements where cycle='2026-06' and member_id=B;
  raise notice '──── B 보류 ────';
  perform pg_temp.chk('B 상태=held', case when sB='held' then 1 else 0 end, 1);

  -- 4) 지급 (보류 제외, 전액지급분 paid)
  perform pay_commission('2026-06','instant','2026-06-15');
  perform pay_commission('2026-06','share','2026-06-15');

  select status into sA from settlements where cycle='2026-06' and member_id=A;
  select status into sB from settlements where cycle='2026-06' and member_id=B;
  select status into sC from settlements where cycle='2026-06' and member_id=C;
  select balance_usd into wA from wallets where member_id=A;
  select balance_usd into wB from wallets where member_id=B;
  select balance_usd into wC from wallets where member_id=C;
  raise notice '──── 지급 후 ────';
  perform pg_temp.chk('A 상태=paid', case when sA='paid' then 1 else 0 end, 1);
  perform pg_temp.chk('C 상태=paid', case when sC='paid' then 1 else 0 end, 1);
  perform pg_temp.chk('B 상태=held(유지)', case when sB='held' then 1 else 0 end, 1);
  perform pg_temp.chk('A 지갑 지급(281.6)', wA, 281.6);
  perform pg_temp.chk('C 지갑 지급(96)', wC, 96);
  perform pg_temp.chk('B 지갑 미지급(0)', wB, 0);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 확정 워크플로 정상(calculated→confirmed→paid, held 제외)';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

-- proration_verify.sql — 풀 초과 비례조정(factor<1) 검증 (0011)
-- 실행: npm run test:proration
--
-- 규칙: 산정합(레벨+직급+공유) > 수당풀(매출×pool_commission_pct%) 이면
--   factor = pool/gross 로 전 지급액을 비례 삭감 → 비율 유지하며 풀 안에 맞춤.
--
-- 픽스처: settlement_verify 와 동일한 A→B→C→D(전원 자격, V=320, A=R3/B=R2/C=R1).
--   미조정 산정합 = 547.2 (레벨297.6+직급211.2+공유38.4), 매출=1280.
--   pool_commission_pct 를 30 으로 낮춰 풀=1280×30%=384 < 547.2 → factor=384/547.2=0.701754.
--   기대(개별 round 후): A=round(281.6×f)=197.61, B=round(169.6×f)=119.02, C=round(96×f)=67.37
--                        grand=384.00 (정확히 풀에 수렴), over_pool=false(딱 맞음)
-- BEGIN…ROLLBACK.

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got,-999999) - p_want) <= 0.02 then
    raise notice 'PASS  % : %', rpad(p_label,24), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,24), p_got, p_want;
  end if;
end;
$f$;

alter table subscriptions       disable trigger trg_settle_payment_sub;
alter table annual_memberships  disable trigger trg_settle_payment_annual;
update ranks set min_total = 1 where rank = 1;
update ranks set min_total = 2 where rank = 2;
update ranks set min_total = 3 where rank = 3;
-- 풀 비율 축소 → 산정합이 풀을 초과하도록
update comp_settings set value = 30 where key = 'pool_commission_pct';

delete from commission_payouts;
delete from revenue_allocations;
delete from members;
update system_wallets set balance_usd = 0;

insert into members (id, display_name, email, role, recommender_id, parent_id, is_active_subscriber) values
  ('ffffffff-0000-0000-0000-000000000001','PA','pa@test.io','marketer', null,                                   null,                                   true),
  ('ffffffff-0000-0000-0000-000000000002','PB','pb@test.io','marketer','ffffffff-0000-0000-0000-000000000001','ffffffff-0000-0000-0000-000000000001', true),
  ('ffffffff-0000-0000-0000-000000000003','PC','pc@test.io','marketer','ffffffff-0000-0000-0000-000000000002','ffffffff-0000-0000-0000-000000000002', true),
  ('ffffffff-0000-0000-0000-000000000004','PD','pd@test.io','marketer','ffffffff-0000-0000-0000-000000000003','ffffffff-0000-0000-0000-000000000003', true);
insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active' from members;
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00' from members;
insert into wallets (member_id, balance_usd, deposit_address)
  select id, 0, 'pr-'||display_name from members;

do $$
declare
  A uuid := 'ffffffff-0000-0000-0000-000000000001';
  B uuid := 'ffffffff-0000-0000-0000-000000000002';
  C uuid := 'ffffffff-0000-0000-0000-000000000003';
  v_mp int; v_gt numeric; tA numeric; tB numeric; tC numeric;
  rec record;
begin
  perform allocate_revenue('2026-06');
  select members_paid, grand_total into v_mp, v_gt from run_settlement('2026-06','2026-06-15');

  raise notice '──── 비례조정 결과 ────';
  -- 미조정이면 547.2 였을 합계가 풀(384)로 삭감
  perform pg_temp.chk('grand_total(풀로 삭감 384)', v_gt, 384);
  perform pg_temp.chk('미조정(547.2)보다 작음', case when v_gt < 547.2 then 1 else 0 end, 1);

  select total_amount into tA from settlements where cycle='2026-06' and member_id=A;
  select total_amount into tB from settlements where cycle='2026-06' and member_id=B;
  select total_amount into tC from settlements where cycle='2026-06' and member_id=C;
  perform pg_temp.chk('A 삭감(281.6×f)', tA, 197.61);
  perform pg_temp.chk('B 삭감(169.6×f)', tB, 119.02);
  perform pg_temp.chk('C 삭감(96×f)', tC, 67.37);

  -- 풀 정합: 산정합 == 풀(딱 맞음), over_pool=false
  select * into rec from pool_reconciliation('2026-06');
  raise notice '──── 풀 정합 ────';
  perform pg_temp.chk('pool_allocated(384)', rec.pool_allocated, 384);
  perform pg_temp.chk('computed==pool', rec.computed_payout, 384);
  perform pg_temp.chk('utilization 100%%', rec.utilization_pct, 100);
  perform pg_temp.chk('over_pool=false', case when rec.over_pool then 1 else 0 end, 0);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 풀 초과 비례조정(factor<1) 정상';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

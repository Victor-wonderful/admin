-- monthly_rank_verify.sql — 직급 월별 재평가 + member_rank 기록 (0018)
-- 실행: npm run test:monthly
--
-- 규칙: 직급은 매달 '그 달의 활성 구독 상태'로 재평가된다(영구 직급 없음).
--   run_settlement 이 refresh_active_subscribers(as_of) 로 그 달 활성을 산정 → evaluate_rank →
--   settlements.member_rank 에 그 달 직급 기록.
-- 시나리오: ROOT 산하 3명 활성 → ROOT R3. 이후 1명 구독 만료 → 산하 2명 → ROOT R2 로 '강등'(재평가).
-- 임계치 축소(rank1~3=1..3). BEGIN…ROLLBACK.

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
delete from commission_payouts; delete from revenue_allocations; delete from members;
update system_wallets set balance_usd = 0;

-- ROOT ─ D1 ─ D2 ─ D3 (전원 자격)
insert into members (id, display_name, role, recommender_id, parent_id, is_active_subscriber) values
  ('c0de0000-0000-0000-0000-000000000001','MR','marketer', null,                                 null,                                 true),
  ('c0de0000-0000-0000-0000-000000000002','M1','marketer','c0de0000-0000-0000-0000-000000000001','c0de0000-0000-0000-0000-000000000001', true),
  ('c0de0000-0000-0000-0000-000000000003','M2','marketer','c0de0000-0000-0000-0000-000000000002','c0de0000-0000-0000-0000-000000000002', true),
  ('c0de0000-0000-0000-0000-000000000004','M3','marketer','c0de0000-0000-0000-0000-000000000003','c0de0000-0000-0000-0000-000000000003', true);
-- 구독 기간을 6~12월로 길게(두 달 평가 위해). 7월 as_of 도 활성 유지.
insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-12-31', timestamptz '2026-06-10 00:00:00+00', 'active' from members;
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00' from members;

do $$
declare
  ROOTID uuid := 'c0de0000-0000-0000-0000-000000000001';
  D3 uuid := 'c0de0000-0000-0000-0000-000000000004';
  v_rank int;
begin
  -- 이번 달: 산하 3명 활성 → R3
  perform run_settlement('2026-06','2026-06-15');
  select member_rank into v_rank from settlements where cycle='2026-06' and member_id=ROOTID;
  raise notice '──── 6월: 산하 3 활성 ────';
  perform pg_temp.chk('ROOT member_rank=3', v_rank, 3);

  -- 다음 달: D3 구독 만료(기간 과거로) → 그 달 활성 2명
  update subscriptions set period_start = date '2026-05-01', period_end = date '2026-05-31'
  where member_id = D3;

  perform run_settlement('2026-07','2026-07-15');
  select member_rank into v_rank from settlements where cycle='2026-07' and member_id=ROOTID;
  raise notice '──── 7월: D3 만료 → 산하 2 활성 ────';
  perform pg_temp.chk('ROOT member_rank=2(재평가 강등)', v_rank, 2);

  -- 6월 기록은 그대로 3 (월별 독립 기록)
  select member_rank into v_rank from settlements where cycle='2026-06' and member_id=ROOTID;
  perform pg_temp.chk('6월 기록 보존(=3)', v_rank, 3);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 직급 월별 재평가 + member_rank 월별 기록';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

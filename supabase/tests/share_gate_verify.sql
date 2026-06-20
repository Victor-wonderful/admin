-- share_gate_verify.sql — 공유수당 30% 게이트 end-to-end (run_settlement, 0018)
-- 실행: npm run test:sharegate
--
-- 핵심 규칙 실증: 5직급(requires_30pct) 회원은
--   * 소실적 < 30%  → 공유수당(override) = 0, 단 직급수당은 정상 지급(강등 없음)
--   * 소실적 ≥ 30%  → 공유수당 지급
--   * member_rank 는 두 경우 모두 5 로 기록(직급 불변, 월별 기록)
-- 임계치 축소(rank1~5 = 1..5), requires_30pct/override 는 실값(rank5 override 2.5%).
-- BEGIN…ROLLBACK (전역 시드 삭제 후 픽스처).

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
update ranks set min_total = 4 where rank = 4;
update ranks set min_total = 5 where rank = 5;
-- 풀 100% → 비례조정(factor) 분리해 공유수당 정확값 검증
update comp_settings set value = 100 where key = 'pool_commission_pct';

delete from commission_payouts; delete from revenue_allocations; delete from members;
update system_wallets set balance_usd = 0;

-- ROOT + 대실적 라인(L1 체인 5) + 소실적(L2). 전원 자격(활성구독+활성연회비).
insert into members (id, display_name, role, recommender_id, parent_id, is_active_subscriber) values
  ('ba5e0000-0000-0000-0000-000000000001','SR','marketer', null,                                 null,                                 true),
  ('ba5e0000-0000-0000-0000-000000000002','S1','marketer','ba5e0000-0000-0000-0000-000000000001','ba5e0000-0000-0000-0000-000000000001', true),
  ('ba5e0000-0000-0000-0000-000000000003','S1a','marketer','ba5e0000-0000-0000-0000-000000000002','ba5e0000-0000-0000-0000-000000000002', true),
  ('ba5e0000-0000-0000-0000-000000000004','S1b','marketer','ba5e0000-0000-0000-0000-000000000003','ba5e0000-0000-0000-0000-000000000003', true),
  ('ba5e0000-0000-0000-0000-000000000005','S1c','marketer','ba5e0000-0000-0000-0000-000000000004','ba5e0000-0000-0000-0000-000000000004', true),
  ('ba5e0000-0000-0000-0000-000000000006','S1d','marketer','ba5e0000-0000-0000-0000-000000000005','ba5e0000-0000-0000-0000-000000000005', true),
  ('ba5e0000-0000-0000-0000-000000000007','S2','marketer','ba5e0000-0000-0000-0000-000000000001','ba5e0000-0000-0000-0000-000000000001', true);
insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active' from members;
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00' from members;

do $$
declare
  ROOTID uuid := 'ba5e0000-0000-0000-0000-000000000001';
  v_rank int; v_share numeric; v_rankc numeric;
begin
  -- 몰빵: 소실적 1/6 = 16.7% < 30%
  perform run_settlement('2026-06','2026-06-15');
  select member_rank, share_amount, rank_amount into v_rank, v_share, v_rankc
    from settlements where cycle='2026-06' and member_id=ROOTID;
  raise notice '──── 몰빵(소실적 16.7%%) ────';
  perform pg_temp.chk('ROOT 직급 기록=5', v_rank, 5);
  perform pg_temp.chk('공유수당=0(차단)', coalesce(v_share,0), 0);
  perform pg_temp.chk('직급수당>0(지급됨)', case when coalesce(v_rankc,0) > 0 then 1 else 0 end, 1);

  -- 균형 보강: L2 산하 2명 추가 → 소실적 3/8 = 37.5% ≥ 30%
  insert into members (id, display_name, role, recommender_id, parent_id, is_active_subscriber) values
    ('ba5e0000-0000-0000-0000-000000000008','S2a','marketer','ba5e0000-0000-0000-0000-000000000007','ba5e0000-0000-0000-0000-000000000007', true),
    ('ba5e0000-0000-0000-0000-000000000009','S2b','marketer','ba5e0000-0000-0000-0000-000000000008','ba5e0000-0000-0000-0000-000000000008', true);
  insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
    select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active'
    from members where id in ('ba5e0000-0000-0000-0000-000000000008','ba5e0000-0000-0000-0000-000000000009');
  insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
    select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00'
    from members where id in ('ba5e0000-0000-0000-0000-000000000008','ba5e0000-0000-0000-0000-000000000009');

  perform run_settlement('2026-06','2026-06-15');
  select member_rank, share_amount, rank_amount into v_rank, v_share, v_rankc
    from settlements where cycle='2026-06' and member_id=ROOTID;
  raise notice '──── 균형(소실적 37.5%%) ────';
  perform pg_temp.chk('ROOT 직급 기록=5', v_rank, 5);
  perform pg_temp.chk('공유수당>0(허용)', case when coalesce(v_share,0) > 0 then 1 else 0 end, 1);
  perform pg_temp.chk('직급수당>0(지급됨)', case when coalesce(v_rankc,0) > 0 then 1 else 0 end, 1);
  -- 공유수당 = override 2.5%% × 산하볼륨(8×320=2560) = 64
  perform pg_temp.chk('공유수당 = 2.5%%×2560', v_share, 64);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 공유수당 30%% 게이트(차단/허용), 직급수당은 무관하게 지급';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

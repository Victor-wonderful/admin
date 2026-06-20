-- transparency_verify.sql — 비자격 중간자 투명/압축 검증 (0009 핵심 규칙)
-- 실행: npm run test:transparency
--
-- 규칙: 비자격(활성구독은 있으나 연회비 미납 등) 중간 회원은 수당을 못 받지만,
--   그 하위 볼륨은 '압축'되어 상위 자격자에게 그대로 전달된다.
--   - 레벨: 1·2대 독립 게이팅(중간자 1대 상실해도 2대는 상위가 수령, 승급 없음)
--   - 직급: 자격 조상끼리만 차액 → 비자격 중간자는 투명(가장 가까운 상위 자격자가 차액 흡수)
--
-- 픽스처(추천=후원 동일 라인) A→B→C→D, 전원 활성구독.
--   C 만 연회비 없음 → 비자격(단 활성구독이라 직급 카운트·볼륨엔 포함, C의 V=120).
--   A,B,D 는 활성구독+활성연회비 → 자격, V=320.
--   임계치 축소: A=R3(22%,ov4) B=R2(12%) (C 는 비자격이라 _rank 제외) D=R0.
--
-- ── 손계산 ──
--   레벨(독립 게이팅):
--     D(V320): 1대 C 비자격→skip / 2대 B → 9%×320=28.8
--     C(V120): 1대 B → 25%×120=30 / 2대 A → 9%×120=10.8
--     B(V320): 1대 A → 25%×320=80
--     ⇒ A=10.8+80=90.8  B=28.8+30=58.8  C=0  D=0   합 149.6
--   직급(자격 조상끼리 차액, C 투명):
--     leaf D: 자격조상 B(12%,근접)→12%×320=38.4, A→(22-12)=10%×320=32
--     leaf C: B→12%×120=14.4, A→10%×120=12
--     leaf B: A→22%×320=70.4
--     ⇒ A=32+12+70.4=114.4  B=38.4+14.4=52.8   합 167.2
--   공유(A override 4%): 산하볼륨 B+C+D=760 → 4%×760=30.4
--   회원합계: A=235.6  B=111.6  (C·D=0)  members_paid=2,  grand=347.2
-- BEGIN…ROLLBACK (전역 시드 삭제 후 픽스처 — run_settlement 전역 스캔 격리)

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

delete from commission_payouts;
delete from revenue_allocations;
delete from members;
update system_wallets set balance_usd = 0;

insert into members (id, display_name, email, role, recommender_id, parent_id, is_active_subscriber) values
  ('eeeeeeee-0000-0000-0000-000000000001','TA','ta@test.io','marketer', null,                                   null,                                   true),
  ('eeeeeeee-0000-0000-0000-000000000002','TB','tb@test.io','marketer','eeeeeeee-0000-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001', true),
  ('eeeeeeee-0000-0000-0000-000000000003','TC','tc@test.io','marketer','eeeeeeee-0000-0000-0000-000000000002','eeeeeeee-0000-0000-0000-000000000002', true),
  ('eeeeeeee-0000-0000-0000-000000000004','TD','td@test.io','marketer','eeeeeeee-0000-0000-0000-000000000003','eeeeeeee-0000-0000-0000-000000000003', true);

-- 전원 활성 구독
insert into subscriptions (member_id, amount_usd, period_start, period_end, paid_at, status)
  select id, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active' from members;
-- 연회비는 C(...003) 제외 → C 비자격
insert into annual_memberships (member_id, amount_usd, period_start, period_end, paid_at)
  select id, 200, date '2026-06-01', date '2027-05-31', timestamptz '2026-06-10 00:00:00+00'
  from members where id <> 'eeeeeeee-0000-0000-0000-000000000003';
insert into wallets (member_id, balance_usd, deposit_address)
  select id, 0, 'tp-'||display_name from members;

do $$
declare
  A uuid := 'eeeeeeee-0000-0000-0000-000000000001';
  B uuid := 'eeeeeeee-0000-0000-0000-000000000002';
  C uuid := 'eeeeeeee-0000-0000-0000-000000000003';
  D uuid := 'eeeeeeee-0000-0000-0000-000000000004';
  v_mp int; v_lt numeric; v_rt numeric; v_st numeric; v_gt numeric;
  aA numeric; aB numeric; cCnt int; lB numeric; rB numeric;
begin
  -- 사전: C 비자격 확인
  perform pg_temp.chk('C 비자격(0)', case when is_qualified_marketer(C,'2026-06-15') then 1 else 0 end, 0);
  perform pg_temp.chk('B 자격(1)', case when is_qualified_marketer(B,'2026-06-15') then 1 else 0 end, 1);

  select members_paid, level_total, rank_total, share_total, grand_total
    into v_mp, v_lt, v_rt, v_st, v_gt from run_settlement('2026-06','2026-06-15');

  raise notice '──── 합계 ────';
  perform pg_temp.chk('members_paid(2)', v_mp, 2);
  perform pg_temp.chk('level_total', v_lt, 149.6);
  perform pg_temp.chk('rank_total', v_rt, 167.2);
  perform pg_temp.chk('share_total', v_st, 30.4);
  perform pg_temp.chk('grand_total', v_gt, 347.2);

  raise notice '──── 투명/압축 핵심 ────';
  -- C 는 수당 0(settlements 에 없음)
  select count(*) into cCnt from settlements where cycle='2026-06' and member_id=C;
  perform pg_temp.chk('C 제외(0행)', cCnt, 0);
  -- D 볼륨이 C(1대 비자격) 건너뛰어 B(2대)에게 도달: B 레벨에 D분 28.8 포함
  select level_amount, rank_amount into lB, rB from settlements where cycle='2026-06' and member_id=B;
  perform pg_temp.chk('B 레벨(D압축 포함 58.8)', lB, 58.8);
  -- B 직급이 D의 근접 자격조상으로서 full 12% 흡수(C 투명): B 직급 = 52.8
  perform pg_temp.chk('B 직급(C투명 흡수 52.8)', rB, 52.8);

  raise notice '──── 회원 총수당 ────';
  select total_amount into aA from settlements where cycle='2026-06' and member_id=A;
  select total_amount into aB from settlements where cycle='2026-06' and member_id=B;
  perform pg_temp.chk('A 총수당', aA, 235.6);
  perform pg_temp.chk('B 총수당', aB, 111.6);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 비자격 중간자 투명/압축 정상(수당 0, 하위볼륨 상위 전달)';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

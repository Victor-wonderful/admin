-- balance_gate_verify.sql — 30% 균형 게이트 = '공유수당' 게이트 (0018) 검증
-- 실행: npm run test:gate
--
-- 규칙(확정): 직급은 순수 카운트(30% 무관, 강등 없음). 30% 게이트는 '공유수당'에만 적용 —
--   requires_30pct 직급(5급+)은 소실적이 전체의 30% 이상일 때만 공유수당(override) 수령.
--   여기서는 evaluate_rank 수준에서 '직급은 R5 그대로 유지' + 'blocked_by_balance(=공유수당 차단)'
--   플래그가 30% 미달일 때만 켜지는지 검증. (공유수당 실지급 차단은 share_gate_verify 에서 run_settlement 로 검증)
-- evaluate_rank 는 is_active_subscriber 플래그만 읽음 → 결제행 없이 플래그로 검증.
-- 임계치 축소(소규모 도달), requires_30pct 는 실값 유지(5직급+ true).
-- BEGIN…ROLLBACK.

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got,-999999) - p_want) <= 0.001 then
    raise notice 'PASS  % : %', rpad(p_label,28), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,28), p_got, p_want;
  end if;
end;
$f$;

-- 5직급까지 소규모 도달하도록 min_total 축소(요율/30%게이트 로직은 실값)
update ranks set min_total = 1 where rank = 1;
update ranks set min_total = 2 where rank = 2;
update ranks set min_total = 3 where rank = 3;
update ranks set min_total = 4 where rank = 4;
update ranks set min_total = 5 where rank = 5;

-- 트리: ROOT 의 두 레그(대실적 L1 체인 5명, 소실적 L2)
-- ROOT─┬─ L1 ─ L1a ─ L1b ─ L1c ─ L1d   (L1 서브트리 활성 5)
--      └─ L2                            (L2 서브트리 활성 1)  → minor 1/6 = 16.7% < 30%
insert into members (id, display_name, role, parent_id, is_active_subscriber) values
  ('dddddddd-0000-0000-0000-000000000010','GROOT','marketer', null, true),
  ('dddddddd-0000-0000-0000-000000000011','GL1','marketer','dddddddd-0000-0000-0000-000000000010', true),
  ('dddddddd-0000-0000-0000-000000000012','GL1a','marketer','dddddddd-0000-0000-0000-000000000011', true),
  ('dddddddd-0000-0000-0000-000000000013','GL1b','marketer','dddddddd-0000-0000-0000-000000000012', true),
  ('dddddddd-0000-0000-0000-000000000014','GL1c','marketer','dddddddd-0000-0000-0000-000000000013', true),
  ('dddddddd-0000-0000-0000-000000000015','GL1d','marketer','dddddddd-0000-0000-0000-000000000014', true),
  ('dddddddd-0000-0000-0000-000000000020','GL2','marketer','dddddddd-0000-0000-0000-000000000010', true);

do $$
declare
  R0 uuid := 'dddddddd-0000-0000-0000-000000000010';
  r record;
begin
  select * into r from evaluate_rank(R0);
  raise notice '──── 몰빵(소실적 16.7%%) ────';
  raise notice 'total=%, major=%, minor=%, pct=%, 공유차단=%', r.total_active, r.major_leg, r.other_minor, r.balance_pct, r.blocked_by_balance;
  perform pg_temp.chk('total_active', r.total_active, 6);
  perform pg_temp.chk('major_leg', r.major_leg, 5);
  perform pg_temp.chk('other_minor', r.other_minor, 1);
  perform pg_temp.chk('balance_pct(<0.30)', r.balance_pct, 0.1667);
  perform pg_temp.chk('balance_ok(거짓)', case when r.balance_ok then 1 else 0 end, 0);
  perform pg_temp.chk('직급 R5(강등 없음)', r.rank, 5);
  perform pg_temp.chk('공유수당 차단(참)', case when r.blocked_by_balance then 1 else 0 end, 1);

  -- 소실적 보강: L2 서브트리에 2명 추가 → L2 leg=3, total=8, minor=3, pct=0.375 ≥ 30%
  insert into members (id, display_name, role, parent_id, is_active_subscriber) values
    ('dddddddd-0000-0000-0000-000000000021','GL2a','marketer','dddddddd-0000-0000-0000-000000000020', true),
    ('dddddddd-0000-0000-0000-000000000022','GL2b','marketer','dddddddd-0000-0000-0000-000000000021', true);

  select * into r from evaluate_rank(R0);
  raise notice '──── 균형 회복(소실적 37.5%%) ────';
  raise notice 'total=%, major=%, minor=%, pct=%', r.total_active, r.major_leg, r.other_minor, r.balance_pct;
  perform pg_temp.chk('total_active', r.total_active, 8);
  perform pg_temp.chk('other_minor', r.other_minor, 3);
  perform pg_temp.chk('balance_pct(≥0.30)', r.balance_pct, 0.375);
  perform pg_temp.chk('balance_ok(참)', case when r.balance_ok then 1 else 0 end, 1);
  perform pg_temp.chk('직급 R5(유지)', r.rank, 5);
  perform pg_temp.chk('공유수당 차단(거짓)', case when r.blocked_by_balance then 1 else 0 end, 0);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 직급 강등 없음 + 공유수당 게이트(몰빵 차단 / 균형 허용)';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

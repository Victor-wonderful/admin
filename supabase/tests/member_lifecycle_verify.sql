-- member_lifecycle_verify.sql — 회원 생애주기 (등록→충전→구독→마케터) 검증 (0019)
-- 실행: npm run test:lifecycle
-- BEGIN…ROLLBACK. 신규 등록회원 1명으로 전 단계 + 가드 검증.

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got,-999999) - p_want) <= 0.01 then raise notice 'PASS  % : %', rpad(p_label,26), p_got;
  else insert into _fail values (p_label,p_got,p_want); raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,26), p_got, p_want; end if;
end; $f$;

-- 신규 등록회원(지갑 없음)
insert into members (id, display_name, email, role, is_active_subscriber)
values ('face0000-0000-0000-0000-000000000001','LC','lc@test.io','registered', false);

do $$
declare
  R uuid := 'face0000-0000-0000-0000-000000000001';
  v_bal numeric; v_role text; n int; raised boolean;
begin
  -- 가드: 잔액 0 에서 구독 시도 → 예외
  raised := false;
  begin perform subscribe_member(R); exception when others then raised := true; end;
  raise notice '──── 가드 ────';
  perform pg_temp.chk('잔액부족 구독 차단', case when raised then 1 else 0 end, 1);

  -- 충전 500
  perform record_deposit(R, 500);
  select balance_usd into v_bal from wallets where member_id = R;
  raise notice '──── 충전 ────';
  perform pg_temp.chk('충전 후 잔액', v_bal, 500);

  -- 구독 (등록 → 구독회원, -120)
  perform subscribe_member(R, 120, '2026-06-15');
  select role::text into v_role from members where id = R;
  select balance_usd into v_bal from wallets where member_id = R;
  select count(*) into n from subscriptions where member_id = R and status = 'active';
  raise notice '──── 구독 ────';
  perform pg_temp.chk('role=subscriber', case when v_role='subscriber' then 1 else 0 end, 1);
  perform pg_temp.chk('구독 후 잔액(500-120)', v_bal, 380);
  perform pg_temp.chk('활성 구독 1건', n, 1);
  perform pg_temp.chk('is_active_subscriber', (select case when is_active_subscriber then 1 else 0 end from members where id=R), 1);

  -- 승급 (구독 → 마케터, -200)
  perform upgrade_to_marketer(R, 200, '2026-06-15');
  select role::text into v_role from members where id = R;
  select balance_usd into v_bal from wallets where member_id = R;
  select count(*) into n from annual_memberships where member_id = R;
  raise notice '──── 마케터 승급 ────';
  perform pg_temp.chk('role=marketer', case when v_role='marketer' then 1 else 0 end, 1);
  perform pg_temp.chk('승급 후 잔액(380-200)', v_bal, 180);
  perform pg_temp.chk('연회비 1건', n, 1);

  -- 가드: 등록회원 아닌데(이미 마케터) 승급 → 예외
  raised := false;
  begin perform upgrade_to_marketer(R); exception when others then raised := true; end;
  perform pg_temp.chk('비구독 승급 차단', case when raised then 1 else 0 end, 1);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 회원 생애주기(등록→충전→구독→마케터)';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

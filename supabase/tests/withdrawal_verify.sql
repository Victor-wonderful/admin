-- withdrawal_verify.sql — 출금 엔진 결정적 검증
-- 실행: docker exec -i supabase_db_admin psql -U postgres -d postgres < supabase/tests/withdrawal_verify.sql
--   또는 npm run test:withdrawal
--
-- 전략: BEGIN…ROLLBACK 안에서 테스트 회원 1명만 추가(출금 엔진은 회원별 동작 → 전역 삭제 불필요).
-- 시나리오:
--   잔액 1000 시작
--   w1 = request(300, fee1) → 홀드 → 잔액 699
--   approve(w1) → 잔액 699 (변화 없음)
--   send(w1) → sending,  complete(w1, HASH1) → completed, 잔액 699 확정
--   w2 = request(200, fee1) → 잔액 498
--   reject(w2) → 환불 201 → 잔액 699
--   오버드로 request(99999) → 예외 발생해야 함
--   불법 전이 completed→pending, pending→completed → 예외
-- 불변식: 잔액 699 = 1000 − (300+1 완료),  완료 1건 · 거절 1건,  원장 w1=completed · w2=failed

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got, -999999) - p_want) <= 0.01 then
    raise notice 'PASS  % : %', rpad(p_label,24), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,24), p_got, p_want;
  end if;
end;
$f$;

-- 테스트 회원 + 지갑 (잔액 1000)
insert into members (id, display_name, email, role, is_active_subscriber)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','WTEST','wtest@test.io','marketer', true);
insert into wallets (member_id, balance_usd, deposit_address)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1000, 'test-W');

do $$
declare
  M uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  w1 uuid; w2 uuid; v_bal numeric; n int; raised boolean;
begin
  -- w1 신청 → 홀드
  w1 := request_withdrawal(M, 300, '0xdead', 'TRC20', 1);
  select balance_usd into v_bal from wallets where member_id = M;
  raise notice '──── 신청(홀드) ────';
  perform pg_temp.chk('신청 후 잔액(1000-301)', v_bal, 699);

  -- approve → sending → complete
  perform transition_withdrawal(w1, 'approved');
  select balance_usd into v_bal from wallets where member_id = M;
  perform pg_temp.chk('승인 후 잔액(불변)', v_bal, 699);

  perform transition_withdrawal(w1, 'sending');
  perform transition_withdrawal(w1, 'completed', 'HASH1');
  select balance_usd into v_bal from wallets where member_id = M;
  raise notice '──── 완료 ────';
  perform pg_temp.chk('완료 후 잔액(확정)', v_bal, 699);

  -- w2 신청 → 거절 → 환불
  w2 := request_withdrawal(M, 200, '0xbeef', 'TRC20', 1);
  select balance_usd into v_bal from wallets where member_id = M;
  perform pg_temp.chk('w2 신청 후 잔액(699-201)', v_bal, 498);

  perform transition_withdrawal(w2, 'rejected');
  select balance_usd into v_bal from wallets where member_id = M;
  raise notice '──── 거절(환불) ────';
  perform pg_temp.chk('거절 환불 후 잔액', v_bal, 699);

  -- 상태/카운트
  select count(*) into n from withdrawals where member_id = M and status = 'completed';
  perform pg_temp.chk('완료 출금 건수', n, 1);
  select count(*) into n from withdrawals where member_id = M and status = 'rejected';
  perform pg_temp.chk('거절 출금 건수', n, 1);

  -- 원장 상태
  select count(*) into n from wallet_transactions where withdrawal_id = w1 and status = 'completed' and tx_hash = 'HASH1';
  perform pg_temp.chk('w1 원장 completed', n, 1);
  select count(*) into n from wallet_transactions where withdrawal_id = w2 and status = 'failed';
  perform pg_temp.chk('w2 원장 failed(환불)', n, 1);

  raise notice '──── 가드(예외) ────';
  -- 오버드로
  raised := false;
  begin
    perform request_withdrawal(M, 99999, '0x00', 'TRC20', 1);
  exception when others then raised := true;
  end;
  if raised then raise notice 'PASS  오버드로 차단(예외)'; else insert into _fail values('오버드로 미차단',0,1); raise warning 'FAIL 오버드로 미차단 <<<'; end if;

  -- 불법 전이: completed → pending
  raised := false;
  begin
    perform transition_withdrawal(w1, 'pending');
  exception when others then raised := true;
  end;
  if raised then raise notice 'PASS  불법전이 completed→pending 차단'; else insert into _fail values('completed→pending 허용됨',0,1); raise warning 'FAIL <<<'; end if;

  -- 불법 전이: pending 단계 건너뛴 complete (새 신청 후 바로 completed)
  raised := false;
  declare w3 uuid;
  begin
    w3 := request_withdrawal(M, 10, '0x33', 'TRC20', 1);
    begin
      perform transition_withdrawal(w3, 'completed', 'X');
    exception when others then raised := true;
    end;
  end;
  if raised then raise notice 'PASS  불법전이 pending→completed 차단'; else insert into _fail values('pending→completed 허용됨',0,1); raise warning 'FAIL <<<'; end if;

  -- 최종 잔액 불변식: 1000 − 301(완료) − 11(w3 홀드 pending) = 688
  select balance_usd into v_bal from wallets where member_id = M;
  perform pg_temp.chk('최종 잔액(불변식)', v_bal, 688);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 출금 엔진 검증 통과';
  else raise exception '❌ % 건 FAIL — 위 <<< 라인 확인', n; end if;
end;
$$;

rollback;

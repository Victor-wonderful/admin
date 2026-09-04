-- 0035_subscribe_wording.sql — 회원 화면 오류 문구 용어 정리
-- 0019 의 subscribe_member / record_deposit 가 "충전" 용어를 쓴다. 회원 화면은 "입금"(회사 주소로 USDT 송금)으로
-- 전환됐으므로(b87b7fcd) 오류 메시지도 맞춘다. 동작은 동일.

create or replace function record_deposit(p_member uuid, p_amount numeric)
returns void language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 then raise exception '입금 금액은 0보다 커야 합니다'; end if;
  perform ensure_wallet(p_member);
  update wallets set balance_usd = balance_usd + p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'deposit', p_amount, 'TRC20', 'completed');
end;
$$;

create or replace function subscribe_member(p_member uuid, p_amount numeric default 120, p_as_of date default current_date)
returns text language plpgsql as $$
declare v_bal numeric; v_role member_role;
begin
  select role into v_role from members where id = p_member;
  if v_role is null then raise exception '회원을 찾을 수 없습니다'; end if;
  if v_role = 'marketer' then raise exception '이미 파트너입니다'; end if;

  perform ensure_wallet(p_member);
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal < p_amount then raise exception '잔액 부족: 보유 % < 구독료 %. 먼저 입금하세요.', v_bal, p_amount; end if;

  update wallets set balance_usd = balance_usd - p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', p_amount, '구독 결제', 'completed');
  insert into subscriptions(member_id, amount_usd, period_start, period_end, paid_at, status)
    values (p_member, p_amount, p_as_of, p_as_of + 30, now(), 'active');   -- 실시간 수당 트리거 발화
  update members set role = 'subscriber' where id = p_member and role = 'registered';
  update members set is_active_subscriber = true where id = p_member and is_active_subscriber = false;
  return 'subscribed';
end;
$$;

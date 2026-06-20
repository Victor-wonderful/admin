-- 0019_member_lifecycle.sql — 회원 생애주기 (등록 → 구독 → 마케터)
-- 3단계 등급 전환을 지갑 결제로 실행:
--   등록회원 → (구독 $120 결제) → 구독회원   subscribe_member
--   구독회원 → (연회비 $200 결제) → 마케터    upgrade_to_marketer
-- 결제는 지갑 잔액에서 차감. 등록회원은 지갑이 없으므로 ensure_wallet 로 생성, record_deposit 로 충전.
-- 구독 INSERT 는 실시간 수당 트리거(settle_payment_event)를 발화 → 상위 자격자 즉시 지급.

-- 지갑 없으면 생성(결정적 주소)
create or replace function ensure_wallet(p_member uuid)
returns void language plpgsql as $$
begin
  insert into wallets(member_id, balance_usd, deposit_address, network)
  select p_member, 0, 'TR' || upper(substr(md5(p_member::text), 1, 12)), 'TRC20'
  where not exists (select 1 from wallets where member_id = p_member);
end;
$$;

-- 입금(충전) 반영. (실서비스는 온체인 감지; 프로토타입은 명시 호출)
create or replace function record_deposit(p_member uuid, p_amount numeric)
returns void language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 then raise exception '충전 금액은 0보다 커야 합니다'; end if;
  perform ensure_wallet(p_member);
  update wallets set balance_usd = balance_usd + p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'deposit', p_amount, 'TRC20', 'completed');
end;
$$;

-- 등록회원 → 구독회원: $120 차감 + 구독 생성 + role 전환
create or replace function subscribe_member(p_member uuid, p_amount numeric default 120, p_as_of date default current_date)
returns text language plpgsql as $$
declare v_bal numeric; v_role member_role;
begin
  select role into v_role from members where id = p_member;
  if v_role is null then raise exception '회원을 찾을 수 없습니다'; end if;
  if v_role = 'marketer' then raise exception '이미 마케터입니다'; end if;

  perform ensure_wallet(p_member);
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal < p_amount then raise exception '잔액 부족: 보유 % < 구독료 %. 먼저 충전하세요.', v_bal, p_amount; end if;

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

-- 구독회원 → 마케터: $200 연회비 차감 + 연회비 생성 + role 전환
create or replace function upgrade_to_marketer(p_member uuid, p_amount numeric default 200, p_as_of date default current_date)
returns text language plpgsql as $$
declare v_bal numeric; v_role member_role;
begin
  select role into v_role from members where id = p_member;
  if v_role <> 'subscriber' then raise exception '구독회원만 마케터로 승급할 수 있습니다 (현재 %)', v_role; end if;

  perform ensure_wallet(p_member);
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal < p_amount then raise exception '잔액 부족: 보유 % < 연회비 %. 먼저 충전하세요.', v_bal, p_amount; end if;

  update wallets set balance_usd = balance_usd - p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', p_amount, '연회비 결제', 'completed');
  insert into annual_memberships(member_id, amount_usd, period_start, period_end, paid_at)
    values (p_member, p_amount, p_as_of, p_as_of + 365, now());   -- 실시간 수당 트리거 발화
  update members set role = 'marketer' where id = p_member;
  return 'upgraded';
end;
$$;

grant execute on function ensure_wallet(uuid), record_deposit(uuid, numeric),
  subscribe_member(uuid, numeric, date), upgrade_to_marketer(uuid, numeric, date) to service_role;

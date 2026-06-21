-- 0015_withdrawal_engine.sql — 출금 엔진 (신청→승인/거절→송금→완료)
-- 모델: '신청 시 지갑 홀드' — 신청 즉시 (금액+수수료)를 지갑에서 차감(홀드)하여
--       이중 인출/오버드로를 원천 차단. 거절 시 환불, 완료 시 확정.
-- 불변식: wallets.balance_usd = Σ적립(commission/deposit) − Σ(pending|approved|sending|completed 출금의 금액+수수료).
--         rejected 는 환불되어 잔액에 영향 없음.
-- 멱등: 상태 전이는 현재 상태를 잠그고(FOR UPDATE) 허용 전이만 수행. 동일 상태 재요청은 무동작.

-- 통합 원장 ↔ 출금 연결 (환불 대상 홀드를 정확히 식별)
alter table wallet_transactions
  add column if not exists withdrawal_id uuid references withdrawals(id) on delete set null;
create index if not exists idx_wtx_withdrawal on wallet_transactions(withdrawal_id);

-- 출금 신청: 잔액 검증 → 홀드(차감) → withdrawals(pending) + 원장(pending)
create or replace function request_withdrawal(
  p_member uuid, p_amount numeric, p_to_address text,
  p_network text default 'TRC20', p_fee numeric default 1
) returns uuid
language plpgsql as $$
declare
  v_bal numeric; v_id uuid; v_need numeric;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception '출금 금액은 0보다 커야 합니다';
  end if;
  v_need := p_amount + coalesce(p_fee, 0);

  -- 지갑 행 잠금 + 잔액 검증
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal is null then
    raise exception '지갑이 없습니다 (member=%)', p_member;
  end if;
  if v_bal < v_need then
    raise exception '잔액 부족: 보유 % < 필요 %(금액 %+수수료 %)', v_bal, v_need, p_amount, p_fee;
  end if;

  -- 홀드(차감)
  update wallets set balance_usd = balance_usd - v_need, updated_at = now()
  where member_id = p_member;

  insert into withdrawals(member_id, amount_usd, fee_usd, to_address, network, status)
  values (p_member, p_amount, coalesce(p_fee, 0), p_to_address, p_network, 'pending')
  returning id into v_id;

  insert into wallet_transactions(member_id, tx_type, amount_usd, fee_usd, network, status, withdrawal_id)
  values (p_member, 'withdrawal', p_amount, coalesce(p_fee, 0), p_network, 'pending', v_id);

  return v_id;
end;
$$;

-- 상태 전이 (state machine). 허용:
--   pending → approved | rejected,  approved → sending | rejected,  sending → completed
-- 거절: 실제 홀드(연결 원장 pending/sending)가 있으면 환불 + 원장 failed.  (레거시 시드행은 홀드 없음 → 환불 생략)
-- 완료: processed_at/tx_hash 확정 + 원장 completed.
create or replace function transition_withdrawal(
  p_id uuid, p_to text, p_tx_hash text default null
) returns text
language plpgsql as $$
declare
  v_cur text; v_member uuid; v_amt numeric; v_fee numeric; v_refund numeric;
begin
  select status, member_id, amount_usd, fee_usd
    into v_cur, v_member, v_amt, v_fee
  from withdrawals where id = p_id for update;
  if v_cur is null then
    raise exception '출금 신청을 찾을 수 없습니다 (id=%)', p_id;
  end if;

  if v_cur = p_to then return v_cur; end if;  -- 멱등: 이미 목표 상태

  -- 허용 전이 검증
  if not (
       (v_cur = 'pending'  and p_to in ('approved','rejected'))
    or (v_cur = 'approved' and p_to in ('sending','rejected'))
    or (v_cur = 'sending'  and p_to = 'completed')
  ) then
    raise exception '허용되지 않은 전이: % → %', v_cur, p_to;
  end if;

  if p_to = 'rejected' then
    -- 실제 홀드가 걸린 원장만 환불(이중 환불/레거시 과다환불 방지)
    select coalesce(sum(amount_usd + fee_usd), 0) into v_refund
    from wallet_transactions
    where withdrawal_id = p_id and tx_type = 'withdrawal' and status in ('pending','sending');
    if v_refund > 0 then
      update wallets set balance_usd = balance_usd + v_refund, updated_at = now()
      where member_id = v_member;
      update wallet_transactions set status = 'failed'
      where withdrawal_id = p_id and tx_type = 'withdrawal' and status in ('pending','sending');
    end if;
    update withdrawals set status = 'rejected', processed_at = now() where id = p_id;

  elsif p_to = 'completed' then
    update withdrawals set status = 'completed', processed_at = now(), tx_hash = p_tx_hash where id = p_id;
    update wallet_transactions set status = 'completed', tx_hash = p_tx_hash
    where withdrawal_id = p_id and tx_type = 'withdrawal';

  else  -- approved | sending : 홀드 유지, 상태만 전이 (+ sending 은 원장도 sending)
    update withdrawals set status = p_to where id = p_id;
    if p_to = 'sending' then
      update wallet_transactions set status = 'sending'
      where withdrawal_id = p_id and tx_type = 'withdrawal' and status = 'pending';
    end if;
  end if;

  return p_to;
end;
$$;

grant execute on function request_withdrawal(uuid, numeric, text, text, numeric) to service_role;
grant execute on function transition_withdrawal(uuid, text, text) to service_role;

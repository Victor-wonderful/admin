-- 0051. 출금 '송금 중' 상태에서도 반려(환불) 허용.
-- 배경(2026-09-06 운영 실증): 관리자가 '송금 시작'을 눌렀는데 회사 지갑 잔액 부족 등으로 실제 송금을 못 하면
-- sending → completed 만 허용돼 되돌릴 길이 없었다. 지갑 앱에서 아직 보내지 않은 경우에 한해 반려(홀드 환불)한다.
-- 그 외 로직(멱등, 환불 계산, completed 처리)은 0015 그대로.

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

  -- 허용 전이 검증 (sending → rejected 추가)
  if not (
       (v_cur = 'pending'  and p_to in ('approved','rejected'))
    or (v_cur = 'approved' and p_to in ('sending','rejected'))
    or (v_cur = 'sending'  and p_to in ('completed','rejected'))
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

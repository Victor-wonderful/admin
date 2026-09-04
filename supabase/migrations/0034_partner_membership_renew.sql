-- 0034. 파트너 멤버십(연회비) 갱신 결제.
-- 규칙: 파트너가 유효기간 종료 30일 전부터, 또는 만료 후 언제든 잔액으로 갱신할 수 있다.
--       만료 전 갱신 → 기존 종료일 다음 날부터 365일. 만료 후 갱신 → 오늘부터 365일.
--       금액은 상품 카탈로그(annual_fee) 현재가.

create or replace function renew_partner_membership(p_member uuid, p_amount numeric default null, p_as_of date default current_date)
returns text
language plpgsql as $$
declare
  v_role  member_role;
  v_bal   numeric;
  v_price numeric;
  v_last  date;
  v_start date;
begin
  select role into v_role from members where id = p_member;
  if v_role is null then raise exception '회원을 찾을 수 없습니다'; end if;
  if v_role <> 'marketer' then raise exception '파트너만 멤버십을 갱신할 수 있습니다'; end if;

  v_price := coalesce(p_amount, product_price('annual_fee'), 200);
  select max(period_end) into v_last from annual_memberships where member_id = p_member;

  -- 종료 30일 전부터만 허용(너무 이른 선결제 방지)
  if v_last is not null and v_last - p_as_of > 30 then
    raise exception '멤버십 종료 30일 전부터 갱신할 수 있습니다 (종료일 %)', v_last;
  end if;

  perform ensure_wallet(p_member);
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal is null or v_bal < v_price then
    raise exception '잔액 부족: 보유 % < 멤버십 %. 먼저 입금하세요.', coalesce(v_bal, 0), v_price;
  end if;

  v_start := case when v_last is not null and v_last >= p_as_of then v_last + 1 else p_as_of end;

  update wallets set balance_usd = balance_usd - v_price, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', v_price, '파트너 멤버십 갱신', 'completed');
  insert into annual_memberships(member_id, amount_usd, period_start, period_end, paid_at)
    values (p_member, v_price, v_start, v_start + 365, now());   -- 실시간 수당 트리거 발화
  return 'renewed:' || v_start || '~' || (v_start + 365);
end $$;

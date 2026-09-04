-- 0029. 즉시 재구독(만료 후 수동 갱신) — 구독회원·마케터 공용.
-- subscribe_member 는 등록회원→구독회원 전환용이라 마케터를 거부한다. 만료된 구독회원/마케터가
-- 직접 갱신할 때는 이 함수를 쓴다: 잔액에서 구독료를 결제하고 오늘부터 30일 활성.

create or replace function renew_subscription_now(p_member uuid, p_amount numeric default 120, p_as_of date default current_date)
returns text
language plpgsql as $$
declare
  v_role member_role;
  v_bal  numeric;
  v_prod uuid;
begin
  select role into v_role from members where id = p_member;
  if v_role is null then raise exception '회원을 찾을 수 없습니다'; end if;
  if v_role = 'registered' then raise exception '등록회원은 구독 시작(subscribe_member)을 이용하세요'; end if;
  if exists (select 1 from subscriptions where member_id = p_member and status = 'active' and period_end >= p_as_of) then
    raise exception '이미 이용 중인 구독이 있습니다';
  end if;

  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal is null or v_bal < p_amount then
    raise exception '잔액 부족: 보유 % < 구독료 %. 먼저 입금하세요.', coalesce(v_bal, 0), p_amount;
  end if;

  select product_id into v_prod from subscriptions where member_id = p_member order by period_end desc limit 1;

  update wallets set balance_usd = balance_usd - p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', p_amount, '구독 갱신', 'completed');
  insert into subscriptions(member_id, product_id, amount_usd, period_start, period_end, paid_at, status)
    values (p_member, v_prod, p_amount, p_as_of, p_as_of + 30, now(), 'active');   -- 실시간 수당 트리거 발화
  update members set is_active_subscriber = true where id = p_member and not is_active_subscriber;
  return 'renewed';
end $$;

-- 갱신 예정 안내 대상: p_days 일 안에 종료되는 활성 구독 중 잔액이 구독료보다 적은 회원(이메일 있는 회원만).
create or replace function list_renewal_reminders(p_today date default current_date, p_days int default 3)
returns table(member_id uuid, email text, display_name text, period_end date, amount_usd numeric, balance_usd numeric)
language sql stable as $$
  select m.id, m.email, m.display_name, s.period_end, s.amount_usd, coalesce(w.balance_usd, 0)
    from subscriptions s
    join members m on m.id = s.member_id
    left join wallets w on w.member_id = m.id
   where s.status = 'active'
     and s.period_end between p_today and p_today + p_days
     and m.email is not null
     and coalesce(w.balance_usd, 0) < s.amount_usd;
$$;

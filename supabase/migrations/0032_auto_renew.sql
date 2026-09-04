-- 0032. 구독 자동 갱신 on/off (회원이 구독 관리에서 해지 예약). off 면 종료일에 갱신하지 않고 만료된다.

alter table members add column if not exists auto_renew boolean not null default true;

create or replace function renew_member_subscription(p_member uuid, p_today date default current_date)
returns text
language plpgsql as $$
declare
  v_last  subscriptions%rowtype;
  v_bal   numeric;
  v_price numeric;
  v_n     int := 0;
  v_role  member_role;
  v_auto  boolean;
begin
  select role, auto_renew into v_role, v_auto from members where id = p_member;
  if v_role is null or v_role = 'registered' then return 'none'; end if;

  select * into v_last from subscriptions
   where member_id = p_member
   order by period_end desc, created_at desc
   limit 1;
  if not found then return 'none'; end if;

  if v_last.period_end >= p_today and v_last.status = 'active' then return 'active'; end if;
  if v_last.status <> 'active' then return 'expired'; end if;

  -- 자동 갱신 해지 예약: 종료일이 지나면 갱신 없이 만료
  if not coalesce(v_auto, true) then
    update subscriptions set status = 'expired' where id = v_last.id and status = 'active';
    update members set is_active_subscriber = false where id = p_member and is_active_subscriber;
    return 'expired';
  end if;

  v_price := coalesce(product_price('bot_sub'), v_last.amount_usd, 120);

  loop
    exit when v_last.period_end >= p_today;
    select balance_usd into v_bal from wallets where member_id = p_member for update;
    if v_bal is null or v_bal < v_price then
      update subscriptions set status = 'expired' where id = v_last.id and status = 'active';
      update members set is_active_subscriber = false where id = p_member and is_active_subscriber;
      return case when v_n > 0 then 'renewed:' || v_n || ',expired' else 'expired' end;
    end if;

    update wallets set balance_usd = balance_usd - v_price, updated_at = now() where member_id = p_member;
    insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
      values (p_member, 'payment', v_price, '구독 자동갱신', 'completed');
    update subscriptions set status = 'expired' where id = v_last.id;
    insert into subscriptions(member_id, product_id, amount_usd, period_start, period_end, paid_at, status)
      values (p_member, coalesce((select id from products where code = 'bot_sub'), v_last.product_id), v_price, v_last.period_end, v_last.period_end + 30, now(), 'active')
      returning * into v_last;
    v_n := v_n + 1;
    exit when v_n >= 12;
  end loop;

  update members set is_active_subscriber = true where id = p_member and not is_active_subscriber;
  return 'renewed:' || v_n;
end $$;

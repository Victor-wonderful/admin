-- 0028. 구독 자동 갱신 + 만료.
-- 규칙: 구독 종료일(period_end)이 지나면 잔액에서 구독료를 자동 결제해 30일 연장한다.
--       잔액이 부족하면 구독을 만료(expired) 처리하고 활성 플래그를 내린다.
--       공백 기간이 여러 주기면 잔액이 허용하는 만큼 연속 갱신한다(각 결제마다 실시간 수당 트리거 발화).

-- 회원 1명 갱신 처리. 반환: 'renewed:N' | 'renewed:N,expired' | 'expired' | 'active' | 'none'(구독 이력 없음)
create or replace function renew_member_subscription(p_member uuid, p_today date default current_date)
returns text
language plpgsql as $$
declare
  v_last  subscriptions%rowtype;
  v_bal   numeric;
  v_price numeric;
  v_n     int := 0;
  v_role  member_role;
begin
  select role into v_role from members where id = p_member;
  if v_role is null or v_role = 'registered' then return 'none'; end if;

  select * into v_last from subscriptions
   where member_id = p_member
   order by period_end desc, created_at desc
   limit 1;
  if not found then return 'none'; end if;

  -- 아직 기간 안이면 할 일 없음
  if v_last.period_end >= p_today and v_last.status = 'active' then return 'active'; end if;
  -- 이미 만료 처리된 구독(수동 만료 등)은 갱신 대상에서 제외 — 회원이 직접 재구독해야 한다
  if v_last.status <> 'active' then return 'expired'; end if;

  v_price := coalesce(v_last.amount_usd, 120);

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
      values (p_member, v_last.product_id, v_price, v_last.period_end, v_last.period_end + 30, now(), 'active')
      returning * into v_last;
    v_n := v_n + 1;
    exit when v_n >= 12; -- 안전장치: 한 번에 최대 12주기
  end loop;

  update members set is_active_subscriber = true where id = p_member and not is_active_subscriber;
  return 'renewed:' || v_n;
end $$;

-- 전체 배치(크론용). 종료일이 지난 활성 구독 회원 전부 처리. 반환: 갱신/만료/검사 건수.
create or replace function process_subscription_renewals(p_today date default current_date)
returns table(renewed int, expired int, checked int)
language plpgsql as $$
declare
  r record;
  v_res text;
  v_renewed int := 0;
  v_expired int := 0;
  v_checked int := 0;
begin
  for r in
    select distinct s.member_id
      from subscriptions s
      join members m on m.id = s.member_id
     where s.status = 'active' and s.period_end < p_today and m.role <> 'registered'
  loop
    v_checked := v_checked + 1;
    v_res := renew_member_subscription(r.member_id, p_today);
    if v_res like 'renewed:%' then v_renewed := v_renewed + 1; end if;
    if v_res like '%expired%' then v_expired := v_expired + 1; end if;
  end loop;
  -- 배치 마지막에 전체 플래그 정합(갱신·만료 외 케이스 포함)
  perform refresh_active_subscribers(p_today);
  return query select v_renewed, v_expired, v_checked;
end $$;

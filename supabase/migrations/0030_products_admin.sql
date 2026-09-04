-- 0030. 상품 카탈로그 관리 — 관리자 추가/수정/활성 + 회원 화면 가격 연동.
-- products 에 운영 컬럼 추가. 구독(bot_sub)·연회비(annual_fee) 가격은 이제 코드 고정값이 아니라 이 테이블을 따른다.

alter table products add column if not exists is_active     boolean not null default true;   -- 판매 중
alter table products add column if not exists pool_eligible boolean not null default true;   -- 매출을 수당 풀에 포함
alter table products add column if not exists counts_active boolean not null default false;  -- 구매 시 활성 구독자 카운팅(직급 자격)
alter table products add column if not exists description   text;
alter table products add column if not exists sort_order    int not null default 100;
alter table products add column if not exists updated_at    timestamptz not null default now();

-- 시드 상품 기본값
update products set counts_active = true,  sort_order = 10 where code = 'bot_sub';
update products set counts_active = false, sort_order = 20 where code = 'annual_fee';
update products set sort_order = 30 where code = 'coin_visa';
update products set sort_order = 40 where code = 'exchange_fee_share';

-- 현재 판매가 조회(활성 상품만). 없으면 null → 앱은 기본값(120/200)으로 폴백.
create or replace function product_price(p_code text)
returns numeric
language sql stable as $$
  select price_usd from products where code = p_code and is_active limit 1;
$$;

-- 자동 갱신은 "현재 구독 상품가"로 결제한다(마지막 결제액이 아니라). 상품이 비활성/미설정이면 마지막 결제액.
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

  if v_last.period_end >= p_today and v_last.status = 'active' then return 'active'; end if;
  if v_last.status <> 'active' then return 'expired'; end if;

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

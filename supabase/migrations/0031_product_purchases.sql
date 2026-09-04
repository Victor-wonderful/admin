-- 0031. 상품 구매(구독·멤버십 외 카탈로그 상품). 회원이 잔액으로 결제 → 구매 이력.
-- 정산(수당 풀 배분·활성 카운팅) 연결은 다음 단계 — 여기서는 결제·이력만.

create table if not exists product_purchases (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  product_id  uuid not null references products(id),
  product_name text not null,                 -- 구매 시점 이름(상품명 변경에 영향 없게)
  amount_usd  numeric(14,2) not null,
  billing     text not null,                  -- monthly | yearly | event (구매 시점)
  period_start date,                          -- monthly/yearly 만
  period_end   date,
  paid_at     timestamptz not null default now(),
  status      text not null default 'completed',
  created_at  timestamptz not null default now()
);
create index if not exists product_purchases_member_idx on product_purchases(member_id, paid_at desc);
grant all on table product_purchases to anon, authenticated, service_role;

-- 구매: 판매 중이고 가격이 있는 상품만. 잔액 차감 + 원장 기록 + 구매 이력. 반환: 구매 id.
create or replace function purchase_product(p_member uuid, p_product uuid, p_as_of date default current_date)
returns uuid
language plpgsql as $$
declare
  v_prod products%rowtype;
  v_bal  numeric;
  v_id   uuid;
  v_ps   date;
  v_pe   date;
begin
  select * into v_prod from products where id = p_product;
  if not found or not v_prod.is_active then raise exception '판매 중인 상품이 아닙니다'; end if;
  if v_prod.price_usd is null then raise exception '가격이 정해지지 않은 상품입니다 (문의 필요)'; end if;
  if v_prod.code in ('bot_sub', 'annual_fee') then raise exception '구독·멤버십은 전용 결제를 이용하세요'; end if;
  if not exists (select 1 from members where id = p_member) then raise exception '회원을 찾을 수 없습니다'; end if;

  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal is null or v_bal < v_prod.price_usd then
    raise exception '잔액 부족: 보유 % < 상품가 %. 먼저 입금하세요.', coalesce(v_bal, 0), v_prod.price_usd;
  end if;

  if v_prod.billing = 'monthly' then v_ps := p_as_of; v_pe := p_as_of + 30;
  elsif v_prod.billing = 'yearly' then v_ps := p_as_of; v_pe := p_as_of + 365;
  end if;

  update wallets set balance_usd = balance_usd - v_prod.price_usd, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', v_prod.price_usd, v_prod.name || ' 구매', 'completed');
  insert into product_purchases(member_id, product_id, product_name, amount_usd, billing, period_start, period_end)
    values (p_member, p_product, v_prod.name, v_prod.price_usd, v_prod.billing, v_ps, v_pe)
    returning id into v_id;
  return v_id;
end $$;

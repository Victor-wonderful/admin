-- 0042_allocate_products.sql — 상품(카탈로그) 구매 매출도 60/20/10/10 배분에 포함 (Victor 결정 2026-09-05)
-- 구독·파트너 멤버십과 같은 매출로 본다. 상품 구매 INSERT 때 해당 사이클 배분을 재계산한다.
-- (리워드 지급은 구독·멤버십 결제만 — 상품 매출은 풀에 들어가되 실시간 리워드 트리거는 붙이지 않는다)

create or replace function allocate_revenue(p_cycle text)
returns table(revenue_total numeric, pool_commission numeric, pool_company numeric, pool_equity numeric, pool_reserve numeric)
language plpgsql as $$
declare
  v_rev numeric; r_comm numeric := 0.60; r_co numeric := 0.20; r_eq numeric := 0.10; r_res numeric := 0.10;
begin
  select coalesce((select sum(amount_usd) from subscriptions
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
       + coalesce((select sum(amount_usd) from annual_memberships
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
       + coalesce((select sum(amount_usd) from product_purchases
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle
                     and coalesce(status, 'completed') not in ('refunded', 'failed')), 0)
    into v_rev;

  insert into revenue_allocations(cycle, revenue_total, pool_commission, pool_company, pool_equity, pool_reserve)
  values (p_cycle, v_rev, round(v_rev * r_comm, 2), round(v_rev * r_co, 2), round(v_rev * r_eq, 2), round(v_rev * r_res, 2))
  on conflict (cycle) do update set
    revenue_total = excluded.revenue_total, pool_commission = excluded.pool_commission,
    pool_company = excluded.pool_company, pool_equity = excluded.pool_equity,
    pool_reserve = excluded.pool_reserve, created_at = now();

  update system_wallets w set balance_usd = a.amt
  from (
    select 'pool_company' as kind, coalesce(sum(ra.pool_company), 0) as amt from revenue_allocations ra
    union all select 'pool_equity',  coalesce(sum(ra.pool_equity), 0)  from revenue_allocations ra
    union all select 'pool_reserve', coalesce(sum(ra.pool_reserve), 0) from revenue_allocations ra
  ) a
  where w.kind = a.kind;

  perform sync_pool_commission();

  return query
    select ra.revenue_total, ra.pool_commission, ra.pool_company, ra.pool_equity, ra.pool_reserve
    from revenue_allocations ra where ra.cycle = p_cycle;
end;
$$;

-- 상품 구매 시 배분 재계산(리워드 없음)
create or replace function trg_allocate_on_purchase() returns trigger language plpgsql as $$
begin
  perform allocate_revenue(to_char(coalesce(new.paid_at at time zone 'UTC', now() at time zone 'UTC'), 'YYYY-MM'));
  return new;
end;
$$;
drop trigger if exists trg_product_purchase_allocate on product_purchases;
create trigger trg_product_purchase_allocate
  after insert on product_purchases
  for each row execute function trg_allocate_on_purchase();

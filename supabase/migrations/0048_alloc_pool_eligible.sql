-- 0048_alloc_pool_eligible.sql — 상품의 '수당 풀 적용'(products.pool_eligible) 플래그를 배분 엔진이 실제로 읽게
--  종전: 0030 에서 컬럼만 추가되고 allocate_revenue 는 모든 상품 매출을 60/20/10/10 배분 → 화면 토글이 아무 효과 없었음.
--  이제: pool_eligible = true 인 상품(및 구독·멤버십)은 설정 비율로 배분, false 인 상품 매출은 배분 없이 회사 수익(pool_company)으로 100%.
--  revenue_total 은 여전히 전체 매출(집계·매출현황과 일치).

create or replace function allocate_revenue(p_cycle text)
returns table(revenue_total numeric, pool_commission numeric, pool_company numeric, pool_equity numeric, pool_reserve numeric)
language plpgsql as $$
declare
  v_eligible numeric; v_excluded numeric;
  r_comm numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_commission_pct'), 0.60);
  r_co   numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_company_pct'),    0.20);
  r_eq   numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_equity_pct'),     0.10);
  r_res  numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_reserve_pct'),    0.10);
begin
  -- 배분 대상 매출: 구독 + 멤버십 + 풀 적용 상품(제품 정보 없으면 포함)
  select coalesce((select sum(amount_usd) from subscriptions
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
       + coalesce((select sum(amount_usd) from annual_memberships
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
       + coalesce((select sum(pp.amount_usd) from product_purchases pp
                   left join products pr on pr.id = pp.product_id
                   where to_char(pp.paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle
                     and coalesce(pp.status, 'completed') not in ('refunded', 'failed')
                     and coalesce(pr.pool_eligible, true)), 0)
    into v_eligible;
  -- 풀 제외 상품 매출 → 회사 수익 100%
  select coalesce((select sum(pp.amount_usd) from product_purchases pp
                   join products pr on pr.id = pp.product_id
                   where to_char(pp.paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle
                     and coalesce(pp.status, 'completed') not in ('refunded', 'failed')
                     and pr.pool_eligible = false), 0)
    into v_excluded;

  insert into revenue_allocations(cycle, revenue_total, pool_commission, pool_company, pool_equity, pool_reserve)
  values (p_cycle, v_eligible + v_excluded,
          round(v_eligible * r_comm, 2), round(v_eligible * r_co, 2) + round(v_excluded, 2),
          round(v_eligible * r_eq, 2), round(v_eligible * r_res, 2))
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

-- 상품의 풀 적용 플래그를 바꾸면 당월 배분을 다시 계산(관리자 저장 시 앱에서도 호출하지만, 트리거로 안전망)
create or replace function trg_products_realloc() returns trigger language plpgsql as $$
begin
  if new.pool_eligible is distinct from old.pool_eligible then
    perform allocate_revenue(to_char(now() at time zone 'UTC', 'YYYY-MM'));
  end if;
  return new;
end;
$$;
drop trigger if exists trg_products_realloc on products;
create trigger trg_products_realloc after update on products for each row execute function trg_products_realloc();

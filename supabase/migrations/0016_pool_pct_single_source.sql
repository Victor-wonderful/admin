-- 0016_pool_pct_single_source.sql — 수당풀 비율 단일 소스화
-- 문제: allocate_revenue 는 수당풀을 60% '하드코딩'하는데, run_settlement 비례조정 캡은
--   comp_settings.pool_commission_pct 를 사용 → 둘이 어긋나면 pool_reconciliation 가
--   엉뚱한 소진율을 보고(예: 풀 768 vs 캡 384 → 50% 오표시). 기본값(60=60)에선 잠복.
-- 해결: 수당풀 비율 = comp_settings.pool_commission_pct '단일 소스'.
--   allocate_revenue 도 이 값을 읽어 수당풀 = pool_pct%, 나머지(100-pool_pct)%를
--   회사/지분/예비비에 기존 20:10:10 비율(=나머지의 50:25:25)로 배분.
--   기본 60 일 때: 수당60 / 회사20 / 지분10 / 예비10 (현행과 동일).

create or replace function allocate_revenue(p_cycle text)
returns table(revenue_total numeric, pool_commission numeric, pool_company numeric, pool_equity numeric, pool_reserve numeric)
language plpgsql as $$
declare
  v_rev numeric;
  v_pool_pct numeric;
  r_comm numeric; r_rest numeric; r_co numeric; r_eq numeric; r_res numeric;
begin
  -- 수당풀 비율(단일 소스). 나머지를 회사/지분/예비비에 50:25:25 로 분배.
  v_pool_pct := coalesce((select value from comp_settings where key = 'pool_commission_pct'), 60);
  r_comm := v_pool_pct / 100.0;
  r_rest := 1 - r_comm;
  r_co   := r_rest * 0.50;   -- 기본 60% 풀 → 나머지 40% 중 20%
  r_eq   := r_rest * 0.25;   -- 10%
  r_res  := r_rest * 0.25;   -- 10%

  select coalesce((select sum(amount_usd) from subscriptions
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
       + coalesce((select sum(amount_usd) from annual_memberships
                   where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
    into v_rev;

  insert into revenue_allocations(cycle, revenue_total, pool_commission, pool_company, pool_equity, pool_reserve)
  values (p_cycle, v_rev, round(v_rev * r_comm, 2), round(v_rev * r_co, 2), round(v_rev * r_eq, 2), round(v_rev * r_res, 2))
  on conflict (cycle) do update set
    revenue_total = excluded.revenue_total, pool_commission = excluded.pool_commission,
    pool_company = excluded.pool_company, pool_equity = excluded.pool_equity,
    pool_reserve = excluded.pool_reserve, created_at = now();

  -- 회사/지분/예비비는 유출 없으므로 누적 인플로 = 잔액
  update system_wallets w set balance_usd = a.amt
  from (
    select 'pool_company' as kind, coalesce(sum(ra.pool_company), 0) as amt from revenue_allocations ra
    union all select 'pool_equity',  coalesce(sum(ra.pool_equity), 0)  from revenue_allocations ra
    union all select 'pool_reserve', coalesce(sum(ra.pool_reserve), 0) from revenue_allocations ra
  ) a
  where w.kind = a.kind;

  -- 수당풀은 인플로 − 지급(파생)
  perform sync_pool_commission();

  return query
    select ra.revenue_total, ra.pool_commission, ra.pool_company, ra.pool_equity, ra.pool_reserve
    from revenue_allocations ra where ra.cycle = p_cycle;
end;
$$;

grant execute on function allocate_revenue(text) to service_role;

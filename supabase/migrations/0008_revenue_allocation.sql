-- 0008_revenue_allocation.sql — 매출 1차 배분
-- 입금(매출 = 구독 결제 + 연회비)을 4개 풀로 1차 배분: 수당풀 60 / 회사 20 / 지분자 10 / 예비비 10.
-- 사이클별 배분 원장(revenue_allocations)에 기록하고, system_wallets 풀 잔액을 전 사이클 누적 인플로로 갱신.
-- 풀 차감(정산·출금 지급)과 엔진 정합은 다음 단계(별도).

create table if not exists revenue_allocations (
  cycle           text primary key,            -- 'YYYY-MM'
  revenue_total   numeric(14, 2) not null,
  pool_commission numeric(14, 2) not null,     -- 60%
  pool_company    numeric(14, 2) not null,     -- 20%
  pool_equity     numeric(14, 2) not null,     -- 10%
  pool_reserve    numeric(14, 2) not null,     -- 10%
  created_at      timestamptz not null default now()
);

grant all on table revenue_allocations to anon, authenticated, service_role;

-- 1차 배분 실행(멱등). p_cycle 의 매출을 60/20/10/10 으로 배분.
create or replace function allocate_revenue(p_cycle text)
returns table(
  revenue_total   numeric,
  pool_commission numeric,
  pool_company    numeric,
  pool_equity     numeric,
  pool_reserve    numeric
)
language plpgsql as $$
declare
  v_rev  numeric;
  r_comm numeric := 0.60;
  r_co   numeric := 0.20;
  r_eq   numeric := 0.10;
  r_res  numeric := 0.10;
begin
  -- 사이클 매출 = 구독 결제 + 연회비 (해당 월 paid_at, UTC 기준 — finance.ts 와 동일)
  select coalesce((
            select sum(amount_usd) from subscriptions
            where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
       + coalesce((
            select sum(amount_usd) from annual_memberships
            where to_char(paid_at at time zone 'UTC', 'YYYY-MM') = p_cycle), 0)
    into v_rev;

  -- 사이클 배분 원장 upsert
  insert into revenue_allocations(cycle, revenue_total, pool_commission, pool_company, pool_equity, pool_reserve)
  values (p_cycle, v_rev,
          round(v_rev * r_comm, 2), round(v_rev * r_co, 2),
          round(v_rev * r_eq, 2),   round(v_rev * r_res, 2))
  on conflict (cycle) do update set
    revenue_total   = excluded.revenue_total,
    pool_commission = excluded.pool_commission,
    pool_company    = excluded.pool_company,
    pool_equity     = excluded.pool_equity,
    pool_reserve    = excluded.pool_reserve,
    created_at      = now();

  -- system_wallets 풀 잔액 = 전 사이클 배분 누적(인플로). 차감은 다음 단계에서.
  update system_wallets w
  set balance_usd = a.amt
  from (
    select 'pool_commission' as kind, coalesce(sum(ra.pool_commission), 0) as amt from revenue_allocations ra
    union all select 'pool_company',  coalesce(sum(ra.pool_company), 0)  from revenue_allocations ra
    union all select 'pool_equity',   coalesce(sum(ra.pool_equity), 0)   from revenue_allocations ra
    union all select 'pool_reserve',  coalesce(sum(ra.pool_reserve), 0)  from revenue_allocations ra
  ) a
  where w.kind = a.kind;

  return query
    select ra.revenue_total, ra.pool_commission, ra.pool_company, ra.pool_equity, ra.pool_reserve
    from revenue_allocations ra where ra.cycle = p_cycle;
end;
$$;

grant execute on function allocate_revenue(text) to service_role;

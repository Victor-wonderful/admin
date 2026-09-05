-- 0047_comp_settings_alloc.sql — 수당체계 화면에서 수당 설정을 실제로 수정할 수 있게
--  (1) 매출 1차 배분 비율(수당풀/회사/지분/예비비)을 comp_settings 로 이동 — allocate_revenue 가 읽는다(기본 60/20/10/10)
--  (2) 검증 포함 일괄 저장 함수 update_comp_settings(jsonb): 레벨 요율·게이트 0~100, 배분 4개 합 100
--  (3) 엔진 풀 상한(pool_commission_pct, 0011/0016/0018 이 읽음)은 alloc_commission_pct 와 항상 같게 동기화
--  레벨 1·2대 요율(level_gen1_pct/level_gen2_pct)은 0009 부터 이미 comp_settings 를 읽음.

insert into comp_settings(key, value, label) values
  ('alloc_commission_pct', 60, '매출 배분 · 수당 풀(%)'),
  ('alloc_company_pct',    20, '매출 배분 · 회사 수익(%)'),
  ('alloc_equity_pct',     10, '매출 배분 · 지분자 배당(%)'),
  ('alloc_reserve_pct',    10, '매출 배분 · 예비비(%)')
on conflict (key) do nothing;

create or replace function allocate_revenue(p_cycle text)
returns table(revenue_total numeric, pool_commission numeric, pool_company numeric, pool_equity numeric, pool_reserve numeric)
language plpgsql as $$
declare
  v_rev numeric;
  r_comm numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_commission_pct'), 0.60);
  r_co   numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_company_pct'),    0.20);
  r_eq   numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_equity_pct'),     0.10);
  r_res  numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_reserve_pct'),    0.10);
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

-- 일괄 저장 + 검증. p_values 예: {"level_gen1_pct": 25, "alloc_commission_pct": 60, ...}
-- 예외: UNKNOWN_KEY / OUT_OF_RANGE / ALLOC_SUM (배분 4개 합이 100 이 아님)
create or replace function update_comp_settings(p_values jsonb)
returns void language plpgsql as $$
declare
  k text; v numeric;
  allowed text[] := array['level_gen1_pct','level_gen2_pct','balance_gate_pct','alloc_commission_pct','alloc_company_pct','alloc_equity_pct','alloc_reserve_pct'];
  s_sum numeric;
begin
  for k, v in select key, (value)::numeric from jsonb_each_text(p_values) loop
    if not (k = any(allowed)) then raise exception 'UNKNOWN_KEY %', k; end if;
    if v is null or v < 0 or v > 100 then raise exception 'OUT_OF_RANGE %', k; end if;
    insert into comp_settings(key, value) values (k, v)
    on conflict (key) do update set value = excluded.value;
  end loop;
  select sum(value) into s_sum from comp_settings where key like 'alloc_%_pct';
  if abs(coalesce(s_sum, 0) - 100) > 0.001 then raise exception 'ALLOC_SUM %', s_sum; end if;
  -- 정산 엔진의 수당풀 상한(pool_commission_pct)은 1차 배분의 수당 풀 비율과 같아야 한다.
  insert into comp_settings(key, value, label)
  select 'pool_commission_pct', value, '수당풀 비율(매출 %)' from comp_settings where key = 'alloc_commission_pct'
  on conflict (key) do update set value = excluded.value;
end $$;

grant execute on function update_comp_settings(jsonb) to service_role;

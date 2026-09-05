-- 0049_alloc_pool_pct_single_source.sql — 수당 풀 비율 단일 소스 복원(0016 규칙)
--  0047 이 alloc_commission_pct 를 새로 두고 pool_commission_pct 를 '동기화'했지만, 배분 함수가 alloc_* 만 읽어
--  pool_commission_pct 를 직접 바꾸는 경우(정산 비례조정 테스트 등)와 어긋났다.
--  이제 allocate_revenue 의 수당 풀 비율은 pool_commission_pct(엔진 풀 상한과 같은 키)를 읽고, 없을 때만 alloc_commission_pct → 60.
--  update_comp_settings 는 alloc_commission_pct 저장 시 pool_commission_pct 도 같은 값으로(기존), 반대 방향도 맞춘다.

create or replace function allocate_revenue(p_cycle text)
returns table(revenue_total numeric, pool_commission numeric, pool_company numeric, pool_equity numeric, pool_reserve numeric)
language plpgsql as $$
declare
  v_eligible numeric; v_excluded numeric;
  r_comm numeric := coalesce((select value / 100 from comp_settings where key = 'pool_commission_pct'),
                             (select value / 100 from comp_settings where key = 'alloc_commission_pct'), 0.60);
  r_co   numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_company_pct'),    0.20);
  r_eq   numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_equity_pct'),     0.10);
  r_res  numeric := coalesce((select value / 100 from comp_settings where key = 'alloc_reserve_pct'),    0.10);
begin
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

-- 양방향 동기화: alloc_commission_pct ↔ pool_commission_pct 는 같은 값.
create or replace function update_comp_settings(p_values jsonb)
returns void language plpgsql as $$
declare
  k text; v numeric;
  allowed text[] := array['level_gen1_pct','level_gen2_pct','balance_gate_pct','pool_commission_pct','alloc_commission_pct','alloc_company_pct','alloc_equity_pct','alloc_reserve_pct'];
  s_sum numeric;
begin
  for k, v in select key, (value)::numeric from jsonb_each_text(p_values) loop
    if not (k = any(allowed)) then raise exception 'UNKNOWN_KEY %', k; end if;
    if v is null or v < 0 or v > 100 then raise exception 'OUT_OF_RANGE %', k; end if;
    insert into comp_settings(key, value) values (k, v)
    on conflict (key) do update set value = excluded.value;
    if k = 'alloc_commission_pct' then
      insert into comp_settings(key, value, label) values ('pool_commission_pct', v, '수당풀 비율(매출 %)')
      on conflict (key) do update set value = excluded.value;
    elsif k = 'pool_commission_pct' then
      insert into comp_settings(key, value, label) values ('alloc_commission_pct', v, '매출 배분 · 수당 풀(%)')
      on conflict (key) do update set value = excluded.value;
    end if;
  end loop;
  select sum(value) into s_sum from comp_settings where key like 'alloc_%_pct';
  if abs(coalesce(s_sum, 0) - 100) > 0.001 then raise exception 'ALLOC_SUM %', s_sum; end if;
end $$;

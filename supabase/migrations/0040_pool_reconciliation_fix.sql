-- 0040_pool_reconciliation_fix.sql — 수당 풀 정합: 실시간 기지급분 반영
-- 종전: remaining = 풀 − 엔진 산정 합계. 월말 산정 전에는 산정이 0이라 실시간으로 이미 나간 금액이 빠지지 않아 "풀 잔여"가 과대 표시.
-- 변경: 소진액 = greatest(산정 합계, 실지급 누적). remaining/utilization 도 같은 기준.
create or replace function pool_reconciliation(p_cycle text)
returns table(
  pool_allocated  numeric,
  computed_payout numeric,
  paid_out        numeric,
  remaining       numeric,
  utilization_pct numeric,
  over_pool       boolean
)
language sql stable as $$
  select
    coalesce(ra.pool_commission, 0),
    c.comp,
    coalesce(p.paid, 0),
    coalesce(ra.pool_commission, 0) - greatest(c.comp, coalesce(p.paid, 0)),
    case when coalesce(ra.pool_commission, 0) > 0
         then round(greatest(c.comp, coalesce(p.paid, 0)) / ra.pool_commission * 100, 1) else 0 end,
    greatest(c.comp, coalesce(p.paid, 0)) > coalesce(ra.pool_commission, 0)
  from (select coalesce(sum(total_amount), 0) as comp from settlements where cycle = p_cycle) c
  left join revenue_allocations ra on ra.cycle = p_cycle
  left join (select coalesce(sum(amount_usd), 0) as paid from commission_payouts where cycle = p_cycle) p on true;
$$;

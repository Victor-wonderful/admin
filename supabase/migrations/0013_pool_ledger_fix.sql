-- 0013_pool_ledger_fix.sql — 코드리뷰 5건 수정 (풀 원장 정합)
--   (1) allocate_revenue 가 풀 잔액을 누적 인플로로 덮어써 지급분이 사라지던 문제
--   (2) 실시간 지급이 풀을 floor 없이 차감 → 음수/오버드로
--   (3) commission_payouts upsert 의미가 SET(pay_commission) vs ACCUMULATE(credit_commission) 로 불일치
--   (4) 실시간 사이클 키(period_start) ≠ 배치(paid_at UTC)
--   (5) 트리거 시점 is_active_subscriber stale
-- 핵심: 수당풀 잔액 = 누적 배분(인플로) − 누적 지급(아웃플로) 파생값으로 일원화.
--       지급 원장(commission_payouts)은 양쪽 모두 '누적 지급액' 의미로 통일.

-- 수당풀 잔액 파생(멱등): 배분 합 − 지급 합. 인라인 차감/SET 대신 항상 이걸로 동기화.
create or replace function sync_pool_commission()
returns void language sql as $$
  update system_wallets w
  set balance_usd = coalesce((select sum(pool_commission) from revenue_allocations), 0)
                  - coalesce((select sum(amount_usd) from commission_payouts), 0)
  where w.kind = 'pool_commission';
$$;

-- (2)(3) credit_commission: 인라인 풀 차감 제거 → 지급원장 누적 + sync 로 잔액 파생
create or replace function credit_commission(p_member uuid, p_cycle text, p_amount numeric)
returns void language plpgsql as $$
begin
  if p_amount is null or p_amount <= 0 then return; end if;
  update wallets set balance_usd = balance_usd + p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'commission', p_amount, '실시간 수당', 'completed');
  insert into commission_payouts(cycle, member_id, scope, amount_usd)
    values (p_cycle, p_member, 'instant', p_amount)
    on conflict (cycle, member_id, scope)
    do update set amount_usd = commission_payouts.amount_usd + excluded.amount_usd, paid_at = now();
  perform sync_pool_commission();
end;
$$;

-- (3) pay_commission: 지급원장을 SET 이 아니라 ACCUMULATE(+delta) 로 통일. 풀은 sync 로 파생.
create or replace function pay_commission(p_cycle text, p_scope text, p_as_of date default current_date)
returns table(members_paid int, total_paid numeric)
language plpgsql as $$
declare
  r record; v_owed numeric; v_already numeric; v_delta numeric;
  v_cnt int := 0; v_sum numeric := 0;
begin
  for r in
    select s.member_id,
      case when p_scope = 'instant' then s.level_amount + s.rank_amount
           when p_scope = 'share'   then s.share_amount
           else 0 end as owed
    from settlements s where s.cycle = p_cycle
  loop
    v_owed := coalesce(r.owed, 0);
    if v_owed <= 0 then continue; end if;
    select coalesce(cp.amount_usd, 0) into v_already
    from commission_payouts cp
    where cp.cycle = p_cycle and cp.member_id = r.member_id and cp.scope = p_scope;
    v_already := coalesce(v_already, 0);
    v_delta := v_owed - v_already;
    if v_delta <= 0 then continue; end if;       -- 이미(실시간 포함) 전액 지급됨

    update wallets set balance_usd = balance_usd + v_delta, updated_at = now() where member_id = r.member_id;
    insert into wallet_transactions(member_id, tx_type, amount_usd, network, status, created_at)
      values (r.member_id, 'commission', v_delta, '수당 풀 분배', 'completed', now());
    insert into commission_payouts(cycle, member_id, scope, amount_usd)
      values (p_cycle, r.member_id, p_scope, v_delta)
      on conflict (cycle, member_id, scope)
      do update set amount_usd = commission_payouts.amount_usd + excluded.amount_usd, paid_at = now();

    v_cnt := v_cnt + 1;
    v_sum := v_sum + v_delta;
  end loop;
  perform sync_pool_commission();
  return query select v_cnt, v_sum;
end;
$$;

-- (1) allocate_revenue: 풀 4종 인플로 반영 후 수당풀만 sync(인플로−지급)로 보정 → 지급분 보존
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
    into v_rev;

  insert into revenue_allocations(cycle, revenue_total, pool_commission, pool_company, pool_equity, pool_reserve)
  values (p_cycle, v_rev, round(v_rev * r_comm, 2), round(v_rev * r_co, 2), round(v_rev * r_eq, 2), round(v_rev * r_res, 2))
  on conflict (cycle) do update set
    revenue_total = excluded.revenue_total, pool_commission = excluded.pool_commission,
    pool_company = excluded.pool_company, pool_equity = excluded.pool_equity,
    pool_reserve = excluded.pool_reserve, created_at = now();

  -- 회사/지분자/예비비는 유출이 없으므로 누적 인플로 = 잔액
  update system_wallets w set balance_usd = a.amt
  from (
    select 'pool_company' as kind, coalesce(sum(ra.pool_company), 0) as amt from revenue_allocations ra
    union all select 'pool_equity',  coalesce(sum(ra.pool_equity), 0)  from revenue_allocations ra
    union all select 'pool_reserve', coalesce(sum(ra.pool_reserve), 0) from revenue_allocations ra
  ) a
  where w.kind = a.kind;

  -- 수당풀은 인플로 − 지급(파생). 재실행해도 지급분이 보존됨.
  perform sync_pool_commission();

  return query
    select ra.revenue_total, ra.pool_commission, ra.pool_company, ra.pool_equity, ra.pool_reserve
    from revenue_allocations ra where ra.cycle = p_cycle;
end;
$$;

-- (4)(5) 트리거: 사이클 키를 paid_at(UTC) 기준으로 통일 + 결제회원 활성 플래그 즉시 반영
create or replace function trg_settle_payment() returns trigger language plpgsql as $$
declare v_asof date;
begin
  v_asof := coalesce((new.paid_at at time zone 'UTC')::date, current_date);
  -- (5) 방금 결제한 구독회원을 활성으로 즉시 반영(직급 카운트 정합). 구독 트리거만.
  if tg_table_name = 'subscriptions' and coalesce(new.status, 'active') = 'active' then
    update members set is_active_subscriber = true where id = new.member_id and is_active_subscriber = false;
  end if;
  perform settle_payment_event(new.member_id, new.amount_usd, v_asof);
  return new;
end;
$$;

grant execute on function sync_pool_commission() to service_role;

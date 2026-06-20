-- 0017_settlement_workflow.sql — 정산 확정 워크플로 (calculated→confirmed→paid, held)
-- run_settlement 은 'calculated' 로 기록. 운영자가 검토 후 'confirmed'(일괄 확정),
-- pay_commission 으로 전액 지급되면 'paid'. 개별 'held'(보류)는 지급에서 제외.
--   상태 흐름:  calculated ─확정→ confirmed ─지급→ paid
--                   └────────── held(보류, 지급 제외) ──────────┘

-- 일괄 확정: calculated → confirmed
create or replace function confirm_settlements(p_cycle text)
returns int language plpgsql as $$
declare v_cnt int;
begin
  update settlements set status = 'confirmed'
  where cycle = p_cycle and status = 'calculated';
  get diagnostics v_cnt = row_count;
  return v_cnt;
end;
$$;

-- 개별 보류/해제 (지급완료 건은 불가)
create or replace function set_settlement_hold(p_cycle text, p_member uuid, p_hold boolean)
returns text language plpgsql as $$
declare v_new text;
begin
  v_new := case when p_hold then 'held' else 'confirmed' end;
  update settlements set status = v_new
  where cycle = p_cycle and member_id = p_member and status <> 'paid';
  return v_new;
end;
$$;

-- pay_commission: 보류(held) 제외 + 전액 지급 시 'paid' 마킹. (0013 기반)
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
    from settlements s
    where s.cycle = p_cycle and s.status <> 'held'        -- 보류 제외
  loop
    v_owed := coalesce(r.owed, 0);
    if v_owed <= 0 then continue; end if;

    select coalesce(cp.amount_usd, 0) into v_already
    from commission_payouts cp
    where cp.cycle = p_cycle and cp.member_id = r.member_id and cp.scope = p_scope;
    v_already := coalesce(v_already, 0);

    v_delta := v_owed - v_already;
    if v_delta <= 0 then continue; end if;

    update wallets set balance_usd = balance_usd + v_delta, updated_at = now()
    where member_id = r.member_id;
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

  -- 누적 지급액이 산정 총액 이상이면 'paid' (보류 제외)
  update settlements s set status = 'paid'
  where s.cycle = p_cycle and s.status in ('calculated','confirmed')
    and s.total_amount <= (
      select coalesce(sum(cp.amount_usd), 0) from commission_payouts cp
      where cp.cycle = s.cycle and cp.member_id = s.member_id
    );

  return query select v_cnt, v_sum;
end;
$$;

grant execute on function confirm_settlements(text) to service_role;
grant execute on function set_settlement_hold(text, uuid, boolean) to service_role;
grant execute on function pay_commission(text, text, date) to service_role;

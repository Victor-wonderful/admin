-- 0012_realtime_payout.sql — 결제 발생 시 instant 수당(직추+직급) 실시간 지급 (req2 자동화)
--   subscriptions / annual_memberships INSERT → 그 결제 볼륨이 두 트리를 타고
--   상위 자격자에게 즉시 지급(지갑 적립 + commission_payouts 누적 + 풀 차감).
--   공유 수당은 월 1회 배치(pay_commission 'share') 유지.

-- 자격 마케터 = 활성 구독 + 활성 연회비
create or replace function is_qualified_marketer(m_id uuid, as_of date default current_date)
returns boolean language sql stable as $$
  select exists (
    select 1 from members m
    where m.id = m_id and m.role = 'marketer' and m.is_active_subscriber
      and exists (select 1 from annual_memberships a
                  where a.member_id = m.id and as_of between a.period_start and a.period_end)
  );
$$;

-- 단일 수령자 지급: 지갑 적립 + 통합원장 + 지급원장 누적 + 풀 차감
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
  update system_wallets set balance_usd = balance_usd - p_amount where kind = 'pool_commission';
end;
$$;

-- 결제 1건의 instant 수당(직추 2대 + 직급 차액)을 상위 자격자에게 즉시 지급
create or replace function settle_payment_event(p_member uuid, p_amount numeric, p_as_of date default current_date)
returns numeric language plpgsql as $$
declare
  c_l1 numeric; c_l2 numeric; v_cycle text; v_paid numeric := 0;
  v_rec1 uuid; v_rec2 uuid; r record;
begin
  if p_amount is null or p_amount <= 0 then return 0; end if;
  c_l1 := coalesce((select value / 100 from comp_settings where key = 'level_gen1_pct'), 0.25);
  c_l2 := coalesce((select value / 100 from comp_settings where key = 'level_gen2_pct'), 0.09);
  v_cycle := to_char(p_as_of, 'YYYY-MM');

  -- 레벨 1·2대 (각 대 자격자만, 승급 없음)
  select recommender_id into v_rec1 from members where id = p_member;
  if v_rec1 is not null and is_qualified_marketer(v_rec1, p_as_of) then
    perform credit_commission(v_rec1, v_cycle, round(c_l1 * p_amount, 2));
    v_paid := v_paid + round(c_l1 * p_amount, 2);
  end if;
  if v_rec1 is not null then
    select recommender_id into v_rec2 from members where id = v_rec1;
    if v_rec2 is not null and is_qualified_marketer(v_rec2, p_as_of) then
      perform credit_commission(v_rec2, v_cycle, round(c_l2 * p_amount, 2));
      v_paid := v_paid + round(c_l2 * p_amount, 2);
    end if;
  end if;

  -- 직급 차액 (후원 조상 중 자격자, 차액차등 + 브레이크어웨이)
  for r in
    with anc as (
      select pc.ancestor_id as mid, pc.depth, er.rate_pct
      from placement_closure pc
      cross join lateral evaluate_rank(pc.ancestor_id) er
      where pc.descendant_id = p_member and pc.depth >= 1
        and er.rank > 0 and is_qualified_marketer(pc.ancestor_id, p_as_of)
    ),
    diff as (
      select mid,
        greatest(0, rate_pct - coalesce(
          max(rate_pct) over (order by depth asc rows between unbounded preceding and 1 preceding), 0)) as drate
      from anc
    )
    select mid, drate from diff where drate > 0
  loop
    perform credit_commission(r.mid, v_cycle, round(r.drate / 100.0 * p_amount, 2));
    v_paid := v_paid + round(r.drate / 100.0 * p_amount, 2);
  end loop;

  return v_paid;
end;
$$;

-- 트리거: 결제(구독/연회비) INSERT 시 instant 수당 즉시 지급
create or replace function trg_settle_payment() returns trigger language plpgsql as $$
begin
  perform settle_payment_event(new.member_id, new.amount_usd, coalesce(new.period_start, current_date));
  return new;
end;
$$;

drop trigger if exists trg_settle_payment_sub on subscriptions;
create trigger trg_settle_payment_sub
  after insert on subscriptions
  for each row execute function trg_settle_payment();

drop trigger if exists trg_settle_payment_annual on annual_memberships;
create trigger trg_settle_payment_annual
  after insert on annual_memberships
  for each row execute function trg_settle_payment();

grant execute on function is_qualified_marketer(uuid, date), credit_commission(uuid, text, numeric),
  settle_payment_event(uuid, numeric, date) to service_role;

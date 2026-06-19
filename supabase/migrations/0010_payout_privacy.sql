-- 0010_payout_privacy.sql — 정리 2차 잔여 처리
--   (2) 직추·직급 = 상시(instant) 지급 / 공유 = 월 1회(share) 지급  → pay_commission(scope)
--   (8) 상위 수당 비공개  → visible_settlements(viewer): 본인+하위만, 상위 제외
--   (1) 풀↔엔진 정합     → pool_reconciliation(cycle): 수당풀 배분액 대비 지급액 소진율

-- ── (2) 수당 지급(payout) ──────────────────────────────────────────────
-- 지급 원장: 사이클·회원·스코프당 누적 지급액 1행 (멱등 키)
create table if not exists commission_payouts (
  id         uuid primary key default gen_random_uuid(),
  cycle      text not null,
  member_id  uuid not null references members(id) on delete cascade,
  scope      text not null,               -- 'instant'(레벨+직급) | 'share'(공유)
  amount_usd numeric(12, 2) not null,
  paid_at    timestamptz not null default now(),
  unique (cycle, member_id, scope)
);
grant all on table commission_payouts to anon, authenticated, service_role;

-- 지급 실행: settlements 의 산정액 중 미지급분(delta)만 지갑에 적립 + 풀에서 차감.
-- scope='instant' → 레벨+직급(상시), scope='share' → 공유(월 1회).
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
    where s.cycle = p_cycle
  loop
    v_owed := coalesce(r.owed, 0);
    if v_owed <= 0 then continue; end if;

    select coalesce(cp.amount_usd, 0) into v_already
    from commission_payouts cp
    where cp.cycle = p_cycle and cp.member_id = r.member_id and cp.scope = p_scope;
    v_already := coalesce(v_already, 0);

    v_delta := v_owed - v_already;
    if v_delta <= 0 then continue; end if;   -- 이미 전액 지급됨

    -- 지갑 적립 + 통합 원장
    update wallets set balance_usd = balance_usd + v_delta, updated_at = now()
    where member_id = r.member_id;
    insert into wallet_transactions(member_id, tx_type, amount_usd, network, status, created_at)
    values (r.member_id, 'commission', v_delta, '수당 풀 분배', 'completed', now());

    -- 지급 원장 누적 upsert
    insert into commission_payouts(cycle, member_id, scope, amount_usd)
    values (p_cycle, r.member_id, p_scope, v_owed)
    on conflict (cycle, member_id, scope)
    do update set amount_usd = excluded.amount_usd, paid_at = now();

    v_cnt := v_cnt + 1;
    v_sum := v_sum + v_delta;
  end loop;

  -- 수당 풀에서 지급분 차감(60% 풀이 재원)
  if v_sum > 0 then
    update system_wallets set balance_usd = balance_usd - v_sum where kind = 'pool_commission';
  end if;

  return query select v_cnt, v_sum;
end;
$$;
grant execute on function pay_commission(text, text, date) to service_role;

-- ── (8) 상위 수당 비공개: 본인 + 하위(후원/직추)만 조회 ────────────────────
-- security definer 로 settlements 전체를 owner 권한으로 읽되, 함수가 viewer 의
-- 본인 + 하위만 반환 → 상위(업라인) 수당은 절대 노출되지 않음.
create or replace function visible_settlements(p_viewer uuid, p_cycle text)
returns table(
  member_id uuid,
  level_amount numeric,
  rank_amount numeric,
  share_amount numeric,
  total_amount numeric,
  status text,
  relation text
)
language sql stable security definer as $$
  with recursive referral_downline as (
    select id from members where recommender_id = p_viewer
    union all
    select m.id from members m join referral_downline d on m.recommender_id = d.id
  )
  select s.member_id, s.level_amount, s.rank_amount, s.share_amount, s.total_amount, s.status,
    case
      when s.member_id = p_viewer then 'self'
      when exists (select 1 from placement_closure pc
                   where pc.ancestor_id = p_viewer and pc.descendant_id = s.member_id and pc.depth >= 1) then 'placement'
      else 'referral'
    end as relation
  from settlements s
  where s.cycle = p_cycle
    and (
      s.member_id = p_viewer
      or exists (select 1 from placement_closure pc
                 where pc.ancestor_id = p_viewer and pc.descendant_id = s.member_id and pc.depth >= 1)
      or s.member_id in (select id from referral_downline)
    );
$$;
grant execute on function visible_settlements(uuid, text) to anon, authenticated, service_role;

-- ── (1) 풀 ↔ 엔진 정합: 수당풀 배분액 대비 산정 지급액 소진율 ───────────────
create or replace function pool_reconciliation(p_cycle text)
returns table(
  pool_allocated  numeric,   -- 매출 60% 배분된 수당풀
  computed_payout numeric,   -- 엔진 산정 합계(레벨+직급+공유)
  paid_out        numeric,   -- 실제 지급된 누적액
  remaining       numeric,   -- 풀 − 산정
  utilization_pct numeric,   -- 산정 / 풀
  over_pool       boolean    -- 산정 > 풀 (재원 초과 경고)
)
language sql stable as $$
  select
    coalesce(ra.pool_commission, 0),
    c.comp,
    coalesce(p.paid, 0),
    coalesce(ra.pool_commission, 0) - c.comp,
    case when coalesce(ra.pool_commission, 0) > 0
         then round(c.comp / ra.pool_commission * 100, 1) else 0 end,
    c.comp > coalesce(ra.pool_commission, 0)
  from (select coalesce(sum(total_amount), 0) as comp from settlements where cycle = p_cycle) c
  left join revenue_allocations ra on ra.cycle = p_cycle
  left join (select coalesce(sum(amount_usd), 0) as paid from commission_payouts where cycle = p_cycle) p on true;
$$;
grant execute on function pool_reconciliation(text) to anon, authenticated, service_role;

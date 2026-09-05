-- 0037_placement_slots.sql — 후원배치 자리(slot) 규칙 (2026-09-05 Victor 확정)
--  · 회원은 후원 부모 아래 "자리 번호"를 가진다. 1번 자리 = 주력 라인(좌측) 머리.
--  · 1번 자리는 파트너 전용: 추천인의 직추 중 처음 파트너가 되는 사람이 전환 시점에 시스템이 고정(잠금).
--    이미 2번 이후에 배치된 구독회원이 나중에 파트너가 돼도 자리는 그대로(1번은 다음 '미배치 첫 파트너'를 기다린다).
--  · 구독 시작한 직추는 추천인의 "배치 대기"에 오르고, 추천인(파트너)이 자기 후원 조직 안 원하는 노드 아래에 한 번 배치한다.
--  · 후원배치는 딱 한 번. 확정 후 파트너는 변경 불가. 관리자만 사유를 남기고 이동.
--  · 7일 이상 미배치면 시스템이 1번 라인 최하단(없으면 추천인 바로 아래)에 자동 배치·확정.
--  · 주력 라인(대실적) = 1번 자리 라인. 1번이 없으면 종전대로 활성 최다 라인.

alter table members
  add column if not exists placement_slot   integer,
  add column if not exists placed_at        timestamptz,
  add column if not exists placed_by        text,      -- system | partner | admin | seed
  add column if not exists placement_locked boolean not null default false,
  add column if not exists placement_note   text;

create unique index if not exists uq_members_parent_slot
  on members(parent_id, placement_slot) where parent_id is not null and placement_slot is not null;

-- 부모의 1번 자리(주력 라인 머리). 없으면 null.
create or replace function first_line_head(p_parent uuid)
returns uuid language sql stable as $$
  select id from members where parent_id = p_parent and placement_slot = 1 limit 1;
$$;

-- 부모 아래 다음 빈 자리(2번 이상)
create or replace function next_placement_slot(p_parent uuid)
returns integer language sql stable as $$
  select greatest(coalesce(max(placement_slot), 1) + 1, 2) from members where parent_id = p_parent;
$$;

-- 후원배치 실행(한 번만). p_by: 'partner' | 'system' | 'admin'. p_slot=1 은 system/admin + 파트너 + 빈 1번일 때만.
create or replace function place_member(p_member uuid, p_new_parent uuid, p_by text, p_note text default null, p_slot integer default null)
returns integer language plpgsql as $$
declare
  v_role member_role; v_locked boolean; v_parent uuid; v_rec uuid; v_slot integer;
begin
  select role, placement_locked, parent_id, recommender_id
    into v_role, v_locked, v_parent, v_rec
  from members where id = p_member for update;
  if v_role is null then raise exception '회원을 찾을 수 없습니다'; end if;
  if p_new_parent is null or p_new_parent = p_member then raise exception '배치 위치가 올바르지 않습니다'; end if;
  if not exists (select 1 from members where id = p_new_parent) then raise exception '배치 위치 회원을 찾을 수 없습니다'; end if;

  if p_by <> 'admin' then
    if v_locked then raise exception '후원배치는 한 번만 할 수 있습니다. 이미 확정된 배치입니다.'; end if;
    if v_role = 'registered' then raise exception '구독을 시작한 회원만 배치할 수 있습니다'; end if;
  end if;
  if p_by = 'partner' then
    if v_rec is null then raise exception '추천인이 없는 회원입니다'; end if;
    -- 추천인 본인 또는 추천인의 후원 조직 안에만
    if p_new_parent <> v_rec and not exists (
      select 1 from placement_closure where ancestor_id = v_rec and descendant_id = p_new_parent
    ) then raise exception '내 후원 조직 안에만 배치할 수 있습니다'; end if;
  end if;

  if p_slot = 1 then
    if p_by = 'partner' then raise exception '1번 자리는 시스템이 첫 파트너에게 자동 배정합니다'; end if;
    if v_role <> 'marketer' then raise exception '1번 자리는 파트너만 들어갈 수 있습니다'; end if;
    if first_line_head(p_new_parent) is not null and first_line_head(p_new_parent) <> p_member then
      raise exception '1번 자리가 이미 차 있습니다';
    end if;
    v_slot := 1;
  else
    v_slot := next_placement_slot(p_new_parent);
  end if;

  -- 자리 번호를 먼저 비워 unique 충돌 방지 후 트리 이동(미배치도 self 클로저가 있어 같은 함수로 처리)
  update members set placement_slot = null where id = p_member;
  perform move_placement_subtree(p_member, p_new_parent);
  update members
    set placement_slot = v_slot, placed_at = now(), placed_by = p_by, placement_locked = true,
        placement_note = coalesce(p_note, placement_note)
    where id = p_member;
  return v_slot;
end $$;

-- 파트너 전환 시: 미배치 + 추천인의 1번 자리가 비어 있으면 1번 고정. 이미 배치돼 있으면 그대로.
create or replace function place_first_partner(p_member uuid)
returns text language plpgsql as $$
declare v_parent uuid; v_rec uuid;
begin
  select parent_id, recommender_id into v_parent, v_rec from members where id = p_member;
  if v_parent is not null then return 'kept'; end if;
  if v_rec is null then return 'no_recommender'; end if;
  if first_line_head(v_rec) is null then
    perform place_member(p_member, v_rec, 'system', '첫 파트너 · 1번 라인 자동 고정', 1);
    return 'fixed_first';
  end if;
  return 'pending';
end $$;

-- 구독회원 → 파트너 (0033 정의 + 1번 자리 자동 고정)
create or replace function upgrade_to_marketer(p_member uuid, p_amount numeric default 200, p_as_of date default current_date)
returns text
language plpgsql as $$
declare v_bal numeric; v_role member_role;
begin
  select role into v_role from members where id = p_member;
  if v_role <> 'subscriber' then raise exception '구독회원만 파트너로 전환할 수 있습니다 (현재 %)', v_role; end if;

  perform ensure_wallet(p_member);
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal < p_amount then raise exception '잔액 부족: 보유 % < 멤버십 %. 먼저 입금하세요.', v_bal, p_amount; end if;

  update wallets set balance_usd = balance_usd - p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', p_amount, '파트너 멤버십 결제', 'completed');
  insert into annual_memberships(member_id, amount_usd, period_start, period_end, paid_at)
    values (p_member, p_amount, p_as_of, p_as_of + 365, now());   -- 실시간 수당 트리거 발화
  update members set role = 'marketer' where id = p_member;
  perform ensure_referral_code(p_member);
  perform place_first_partner(p_member);
  return 'upgraded';
end $$;

-- 1번 라인 최하단(없으면 null)
create or replace function lowest_node_of_first_line(p_parent uuid)
returns uuid language sql stable as $$
  select pc.descendant_id
  from placement_closure pc
  where pc.ancestor_id = first_line_head(p_parent)
  order by pc.depth desc, pc.descendant_id
  limit 1;
$$;

-- 미배치 자동 처리: 첫 구독 결제 후 p_days 지나도 미배치면 1번 라인 최하단(없으면 추천인 바로 아래)으로.
create or replace function auto_place_pending(p_days integer default 7)
returns integer language plpgsql as $$
declare r record; v_target uuid; v_n integer := 0;
begin
  for r in
    select m.id, m.recommender_id
    from members m
    where m.parent_id is null and m.recommender_id is not null
      and m.role in ('subscriber', 'marketer') and not m.placement_locked
      and exists (select 1 from subscriptions s where s.member_id = m.id and s.paid_at <= now() - make_interval(days => p_days))
  loop
    v_target := lowest_node_of_first_line(r.recommender_id);
    if v_target is not null then
      perform place_member(r.id, v_target, 'system', format('%s일 미배치 · 1번 라인 최하단 자동 배치', p_days));
    else
      perform place_member(r.id, r.recommender_id, 'system', format('%s일 미배치 · 추천인 아래 자동 배치', p_days));
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- 주력 라인 = 1번 자리 라인(없으면 활성 최다 라인)
create or replace function get_major_minor(m_id uuid)
returns table(major_leg bigint, other_minor bigint, total_active bigint, leg_count bigint)
language sql stable as $$
  with legs as (
    select l.leg_root, l.active_count, m.placement_slot
    from get_marketer_legs(m_id) l join members m on m.id = l.leg_root
  ),
  major as (
    select active_count from legs order by (placement_slot = 1) desc nulls last, active_count desc, leg_root limit 1
  )
  select coalesce((select active_count from major), 0)                                 as major_leg,
         coalesce(sum(active_count), 0) - coalesce((select active_count from major), 0) as other_minor,
         coalesce(sum(active_count), 0)                                                 as total_active,
         count(*)                                                                       as leg_count
  from legs;
$$;

create or replace function lowest_node_of_major_leg(m_id uuid)
returns uuid language sql stable as $$
  with legs as (
    select l.leg_root, l.active_count, m.placement_slot
    from get_marketer_legs(m_id) l join members m on m.id = l.leg_root
  ),
  major as (select leg_root from legs order by (placement_slot = 1) desc nulls last, active_count desc, leg_root limit 1)
  select pc.descendant_id
  from placement_closure pc
  join major on pc.ancestor_id = major.leg_root
  order by pc.depth desc, pc.descendant_id
  limit 1;
$$;

-- 시드 backfill: 이미 parent_id 가 있는 회원에게 자리 번호 부여.
-- 부모별로 파트너 라인 우선 → 활성 하위 많은 순 → 가입 순. 1번은 파트너 라인이 있을 때만.
with legs as (
  select c.id, c.parent_id, c.role, c.created_at,
         (select count(*) from placement_closure pc join members d on d.id = pc.descendant_id
           where pc.ancestor_id = c.id and d.is_active_subscriber) as active_cnt
  from members c where c.parent_id is not null and c.placement_slot is null
),
ranked as (
  select id, parent_id, role,
         row_number() over (partition by parent_id order by (role = 'marketer') desc, active_cnt desc, created_at, id) as rn,
         bool_or(role = 'marketer') over (partition by parent_id) as has_partner
  from legs
)
update members m
set placement_slot = case when r.has_partner then r.rn else r.rn + 1 end,
    placed_at = coalesce(m.placed_at, m.created_at), placed_by = coalesce(m.placed_by, 'seed'), placement_locked = true
from ranked r where r.id = m.id;

grant execute on function first_line_head(uuid), next_placement_slot(uuid), place_member(uuid, uuid, text, text, integer),
  place_first_partner(uuid), lowest_node_of_first_line(uuid), auto_place_pending(integer) to service_role;

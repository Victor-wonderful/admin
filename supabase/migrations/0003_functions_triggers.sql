-- 0003_functions_triggers.sql — 함수 / 트리거 / 보상 집계 RPC

-- =====================================================================
-- 활성 구독자 플래그 재계산 (= 월별 크론/스케줄러 역할). 데모는 버튼이 호출.
-- =====================================================================
create or replace function refresh_active_subscribers(as_of date default current_date)
returns void language sql as $$
  update members m set is_active_subscriber = exists (
    select 1 from subscriptions s
    where s.member_id = m.id
      and s.status = 'active'
      and as_of between s.period_start and s.period_end
  );
$$;

-- =====================================================================
-- R1. recommender_id 는 반드시 마케터여야 함 (레퍼럴 권한은 마케터만)
-- =====================================================================
create or replace function assert_recommender_is_marketer()
returns trigger language plpgsql as $$
begin
  if new.recommender_id is not null then
    if not exists (
      select 1 from members r
      where r.id = new.recommender_id and r.role = 'marketer'
    ) then
      raise exception 'recommender_id(%) must reference a marketer (R1)', new.recommender_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_assert_recommender
  before insert or update of recommender_id on members
  for each row execute function assert_recommender_is_marketer();

-- =====================================================================
-- 후원 트리 Closure 유지: 멤버 INSERT 시 self(depth 0) + 부모 경로 삽입
-- (parent 가 먼저 존재해야 하므로 seed 는 부모->자식 순서로 insert)
-- =====================================================================
create or replace function placement_closure_on_insert()
returns trigger language plpgsql as $$
begin
  -- self
  insert into placement_closure(ancestor_id, descendant_id, depth)
  values (new.id, new.id, 0);

  -- 부모의 모든 조상 + 1 깊이로 연결
  if new.parent_id is not null then
    insert into placement_closure(ancestor_id, descendant_id, depth)
    select c.ancestor_id, new.id, c.depth + 1
    from placement_closure c
    where c.descendant_id = new.parent_id;
  end if;

  return new;
end;
$$;

create trigger trg_placement_closure_insert
  after insert on members
  for each row execute function placement_closure_on_insert();

-- =====================================================================
-- 스필오버 재배치: node 서브트리를 new_parent 밑으로 이동 (표준 closure move)
-- =====================================================================
create or replace function move_placement_subtree(p_node uuid, p_new_parent uuid)
returns void language plpgsql as $$
begin
  if p_node = p_new_parent then
    raise exception 'cannot move a node under itself';
  end if;

  -- 사이클 방지: new_parent 가 node 의 서브트리 안에 있으면 거부
  if exists (
    select 1 from placement_closure
    where ancestor_id = p_node and descendant_id = p_new_parent
  ) then
    raise exception 'cannot move node under its own descendant (cycle)';
  end if;

  -- 1) 서브트리와 (node 기존 조상들) 사이의 엣지 제거
  delete from placement_closure
  where descendant_id in (
          select descendant_id from placement_closure where ancestor_id = p_node)
    and ancestor_id in (
          select ancestor_id from placement_closure
          where descendant_id = p_node and ancestor_id <> p_node);

  -- 2) new_parent 의 조상(자기 포함) x node 서브트리 cross join 으로 새 엣지 삽입
  insert into placement_closure(ancestor_id, descendant_id, depth)
  select super.ancestor_id, sub.descendant_id, super.depth + sub.depth + 1
  from placement_closure super
  cross join placement_closure sub
  where super.descendant_id = p_new_parent
    and sub.ancestor_id = p_node;

  -- 3) 인접 리스트도 갱신
  update members set parent_id = p_new_parent where id = p_node;
end;
$$;

-- =====================================================================
-- 보상 집계: 마케터의 레그별 활성 구독자 수
-- =====================================================================
create or replace function get_marketer_legs(m_id uuid)
returns table(leg_root uuid, leg_name text, active_count bigint)
language sql stable as $$
  select dc.id as leg_root,
         dc.display_name as leg_name,
         count(*) filter (where mem.is_active_subscriber) as active_count
  from members dc
  join placement_closure pc on pc.ancestor_id = dc.id        -- 서브트리(self 포함, depth 0)
  join members mem on mem.id = pc.descendant_id
  where dc.parent_id = m_id
  group by dc.id, dc.display_name;
$$;

-- 대실적(MAX) / 기타소실적(SUM - MAX)
create or replace function get_major_minor(m_id uuid)
returns table(major_leg bigint, other_minor bigint, total_active bigint, leg_count bigint)
language sql stable as $$
  with legs as (select active_count from get_marketer_legs(m_id))
  select coalesce(max(active_count), 0)                                   as major_leg,
         coalesce(sum(active_count), 0) - coalesce(max(active_count), 0)  as other_minor,
         coalesce(sum(active_count), 0)                                   as total_active,
         count(*)                                                         as leg_count
  from legs;
$$;

-- 대실적 라인의 최하단 노드(스필오버 배치 대상). 동률은 깊이 -> id 순.
create or replace function lowest_node_of_major_leg(m_id uuid)
returns uuid language sql stable as $$
  with legs as (select leg_root, active_count from get_marketer_legs(m_id)),
  major as (select leg_root from legs order by active_count desc, leg_root limit 1)
  select pc.descendant_id
  from placement_closure pc
  join major on pc.ancestor_id = major.leg_root
  order by pc.depth desc, pc.descendant_id
  limit 1;
$$;

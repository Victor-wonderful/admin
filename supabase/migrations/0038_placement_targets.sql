-- 0038_placement_targets.sql — 후원배치 위치 후보를 DB 에서 한 번에 조회
-- (조직이 크면 회원 id 목록을 URL 로 넘기는 방식이 길이 제한에 걸려 빈 목록이 됐다)
create or replace function placement_targets(p_owner uuid, p_limit integer default 2000)
returns table(id uuid, role member_role, depth integer, placement_slot integer, parent_id uuid, is_active_subscriber boolean, on_first_line boolean)
language sql stable as $$
  with fl as (select first_line_head(p_owner) as head)
  select m.id, m.role, pc.depth, m.placement_slot, m.parent_id, m.is_active_subscriber,
         exists (
           select 1 from placement_closure f, fl
           where fl.head is not null and f.ancestor_id = fl.head and f.descendant_id = m.id
         ) as on_first_line
  from placement_closure pc
  join members m on m.id = pc.descendant_id
  where pc.ancestor_id = p_owner
  order by pc.depth, m.placement_slot nulls last, m.created_at, m.id
  limit p_limit;
$$;

grant execute on function placement_targets(uuid, integer) to service_role;

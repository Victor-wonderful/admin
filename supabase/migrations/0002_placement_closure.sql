-- 0002_placement_closure.sql — 후원(Placement) 트리 Closure Table
-- 직접추천 트리는 Closure 없이 recommender_id 인접 리스트만 유지(재귀 CTE로 충분).

create table placement_closure (
  ancestor_id   uuid not null references members(id) on delete cascade,
  descendant_id uuid not null references members(id) on delete cascade,
  depth         int  not null,            -- 0 = self
  primary key (ancestor_id, descendant_id)
);
create index closure_anc_idx  on placement_closure(ancestor_id);
create index closure_desc_idx on placement_closure(descendant_id);

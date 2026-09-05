import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import { toUid } from "@/lib/uid";
import type { MemberRow, TreeNode } from "@/lib/supabase/types";

// 평면 회원 행을 한 번에 가져와 JS 에서 두 종류 트리를 빌드(N+1 회피).
export async function getAllMembers(): Promise<MemberRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("members")
    .select("id, display_name, email, role, recommender_id, parent_id, joined_at, is_active_subscriber, created_at, placement_slot")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

function toNode(m: MemberRow): TreeNode {
  return {
    id: m.id,
    name: toUid(m.id),
    role: m.role,
    isActive: m.is_active_subscriber,
    children: [],
    meta: { recommenderId: m.recommender_id, parentId: m.parent_id, slot: m.placement_slot ?? null },
  };
}

// parentKey: 'recommender_id'(직접추천) | 'parent_id'(후원)
function buildTree(members: MemberRow[], rootId: string, parentKey: "recommender_id" | "parent_id"): TreeNode | null {
  const nodes = new Map<string, TreeNode>();
  members.forEach((m) => nodes.set(m.id, toNode(m)));
  for (const m of members) {
    const pid = m[parentKey];
    if (pid && nodes.has(pid)) nodes.get(pid)!.children.push(nodes.get(m.id)!);
  }
  // 후원 트리는 자리 번호 순(1번 = 좌측 주력 라인). 자리 없는 노드는 뒤로.
  if (parentKey === "parent_id") {
    for (const n of nodes.values()) n.children.sort((a, b) => (a.meta?.slot ?? 999) - (b.meta?.slot ?? 999));
  }
  // 활성 산하 수를 각 노드 meta 에 집계(서브트리 내 활성 구독자 수)
  const countActive = (n: TreeNode): number => {
    let c = n.isActive ? 1 : 0;
    for (const ch of n.children) c += countActive(ch);
    n.meta = { ...n.meta, activeCount: c };
    return c;
  };
  const root = nodes.get(rootId) ?? null;
  if (root) countActive(root);
  return root;
}

export async function getUnilevelTree(rootId: string): Promise<TreeNode | null> {
  const members = await getAllMembers();
  return buildTree(members, rootId, "recommender_id");
}

// 조직도 기본 기준 회원 — 활성 마케터 중, 후원 트리에 활성 자식을 가지고
// 활성 하위가 가장 많은 회원(비활성 루트·비활성 주력 라인 회피).
export async function getActiveRootId(): Promise<string | null> {
  const members = await getAllMembers();
  const placeChildren = new Map<string, MemberRow[]>();
  for (const m of members) {
    if (m.parent_id) {
      const arr = placeChildren.get(m.parent_id) ?? [];
      arr.push(m);
      placeChildren.set(m.parent_id, arr);
    }
  }
  const cache = new Map<string, number>();
  const activeSubtree = (id: string): number => {
    if (cache.has(id)) return cache.get(id)!;
    let s = 0;
    for (const c of placeChildren.get(id) ?? []) s += (c.is_active_subscriber ? 1 : 0) + activeSubtree(c.id);
    cache.set(id, s);
    return s;
  };
  let best: { id: string; size: number } | null = null;
  for (const m of members) {
    if (m.role !== "marketer" || !m.is_active_subscriber) continue;
    const kids = placeChildren.get(m.id) ?? [];
    if (!kids.some((k) => k.is_active_subscriber)) continue; // 활성 주력 라인 확보
    const s = activeSubtree(m.id);
    if (s > 0 && (!best || s > best.size)) best = { id: m.id, size: s };
  }
  return best?.id ?? null;
}

export async function getPlacementTree(rootId: string): Promise<TreeNode | null> {
  const members = await getAllMembers();
  return buildTree(members, rootId, "parent_id");
}

// 두 트리를 한 번의 fetch 로 같이 빌드(대시보드용).
export async function getBothTrees(rootId: string): Promise<{ unilevel: TreeNode | null; placement: TreeNode | null; members: MemberRow[] }> {
  const members = await getAllMembers();
  return {
    unilevel: buildTree(members, rootId, "recommender_id"),
    placement: buildTree(members, rootId, "parent_id"),
    members,
  };
}

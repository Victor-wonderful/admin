import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import type { MemberRow, TreeNode } from "@/lib/supabase/types";

// 평면 회원 행을 한 번에 가져와 JS 에서 두 종류 트리를 빌드(N+1 회피).
export async function getAllMembers(): Promise<MemberRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("members")
    .select("id, display_name, email, role, recommender_id, parent_id, joined_at, is_active_subscriber, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

function toNode(m: MemberRow): TreeNode {
  return {
    id: m.id,
    name: m.display_name,
    role: m.role,
    isActive: m.is_active_subscriber,
    children: [],
    meta: { recommenderId: m.recommender_id, parentId: m.parent_id },
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

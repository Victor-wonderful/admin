import "server-only";
import { listMembers, getMemberStats } from "@/lib/queries/members";
import { toUid } from "@/lib/uid";
import type { ExplorerRow } from "@/components/members/members-explorer";
import type { MemberRole } from "@/lib/supabase/types";

// 회원관리(부모/하위) 공용 데이터 — 전체 회원을 받아 추천인 맵으로 표시하고
// role 이 주어지면 해당 역할만 필터.
export async function getMembersView(role?: MemberRole) {
  const [stats, members] = await Promise.all([getMemberStats(), listMembers()]);
  const nameById = new Map(members.map((m) => [m.id, m.display_name]));

  const all: ExplorerRow[] = members.map((m) => ({
    id: m.id,
    name: toUid(m.id),
    email: m.email,
    role: m.role,
    active: m.is_active_subscriber,
    recommenderName: m.recommender_id && nameById.has(m.recommender_id) ? toUid(m.recommender_id) : null,
    joinedAt: m.created_at.slice(0, 10),
  }));

  const rows = role ? all.filter((r) => r.role === role) : all;
  const counts = {
    all: stats.total,
    registered: stats.registered,
    subscriber: stats.subscriber,
    marketer: stats.marketer,
  };
  return { rows, counts };
}

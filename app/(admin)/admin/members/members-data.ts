import "server-only";
import { listMembers, getMemberStats } from "@/lib/queries/members";
import { getMemberRanksMap } from "@/lib/queries/ranks";
import { toUid } from "@/lib/uid";
import type { ExplorerRow } from "@/components/members/members-explorer";
import type { MemberRole } from "@/lib/supabase/types";

// 회원관리(부모/하위) 공용 데이터 — 전체 회원을 받아 추천인 맵으로 표시하고
// role 이 주어지면 해당 역할만 필터. 마케터는 직급(R1~R9)도 함께.
export async function getMembersView(role?: MemberRole) {
  const [stats, members, ranks] = await Promise.all([
    getMemberStats(),
    listMembers(),
    getMemberRanksMap(),
  ]);
  const nameById = new Map(members.map((m) => [m.id, m.display_name]));

  const all: ExplorerRow[] = members.map((m) => {
    const rk = ranks.get(m.id);
    return {
      id: m.id,
      name: toUid(m.id),
      email: m.email,
      role: m.role,
      active: m.is_active_subscriber,
      recommenderName: m.recommender_id && nameById.has(m.recommender_id) ? toUid(m.recommender_id) : null,
      joinedAt: m.created_at.slice(0, 10),
      // 마케터만 직급 보유. rank=0(무직급)도 마케터면 명시, 비마케터는 null.
      rank: m.role === "marketer" ? (rk?.rank ?? 0) : null,
    };
  });

  const rows = role ? all.filter((r) => r.role === role) : all;
  const counts = {
    all: stats.total,
    registered: stats.registered,
    subscriber: stats.subscriber,
    marketer: stats.marketer,
  };
  return { rows, counts };
}

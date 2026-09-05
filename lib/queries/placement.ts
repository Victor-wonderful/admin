import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { toUid } from "@/lib/uid";
import type { MemberRole } from "@/lib/supabase/types";

// 후원배치 조회 — 배치 대기 목록, 배치 가능한 위치(내 후원 조직), 권장 위치(1번 라인 최하단)

export interface PendingPlacement {
  id: string;
  uid: string;
  role: MemberRole;
  is_active_subscriber: boolean;
  created_at: string;
  first_paid_at: string | null; // 첫 구독 결제(자동 배치 기준일)
  days_left: number | null; // 자동 배치까지 남은 일수(서버 계산)
}

export interface PlacementTarget {
  id: string;
  uid: string;
  role: MemberRole;
  depth: number; // 기준 파트너로부터의 깊이(0 = 본인)
  slot: number | null;
  parent_id: string | null;
  is_active_subscriber: boolean;
  on_first_line: boolean; // 1번 라인 위의 노드
}

// 추천인의 직추 중 구독은 시작했으나 아직 후원배치되지 않은 회원
export async function listPendingPlacements(recommenderId: string, autoDays = 7): Promise<PendingPlacement[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("members")
    .select("id, role, is_active_subscriber, created_at, subscriptions(paid_at)")
    .eq("recommender_id", recommenderId)
    .is("parent_id", null)
    .in("role", ["subscriber", "marketer"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; role: MemberRole; is_active_subscriber: boolean; created_at: string; subscriptions: Array<{ paid_at: string }> | null }>).map((m) => ({
    id: m.id,
    uid: toUid(m.id),
    role: m.role,
    is_active_subscriber: m.is_active_subscriber,
    created_at: m.created_at,
    first_paid_at: (m.subscriptions ?? []).map((s) => s.paid_at).sort()[0] ?? null,
    days_left: null,
  })).map((p) => ({
    ...p,
    days_left: p.first_paid_at ? Math.max(0, autoDays - Math.floor((Date.now() - new Date(p.first_paid_at).getTime()) / 86400000)) : null,
  }));
}

// 기준 파트너 본인 + 후원 조직 전체 — 배치 위치 선택지(DB 함수 placement_targets, 깊이·자리 순).
export async function listPlacementTargets(ownerId: string, limit = 2000): Promise<PlacementTarget[]> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("placement_targets", { p_owner: ownerId, p_limit: limit });
  if (error) throw error;
  type Row = { id: string; role: MemberRole; depth: number; placement_slot: number | null; parent_id: string | null; is_active_subscriber: boolean; on_first_line: boolean };
  return ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    uid: toUid(r.id),
    role: r.role,
    depth: Number(r.depth),
    slot: r.placement_slot,
    parent_id: r.parent_id,
    is_active_subscriber: r.is_active_subscriber,
    on_first_line: r.on_first_line,
  }));
}

// 권장 위치: 1번 라인 최하단. 1번 라인이 없으면 null(→ 본인 바로 아래 다음 자리).
export async function getRecommendedPlacementTarget(ownerId: string): Promise<{ id: string; uid: string } | null> {
  const sb = getServerClient();
  const { data } = await sb.rpc("lowest_node_of_first_line", { p_parent: ownerId });
  const id = (data as string | null) ?? null;
  return id ? { id, uid: toUid(id) } : null;
}

export async function getNextSlot(parentId: string): Promise<number> {
  const sb = getServerClient();
  const { data } = await sb.rpc("next_placement_slot", { p_parent: parentId });
  return Number(data ?? 2);
}

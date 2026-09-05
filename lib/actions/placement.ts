"use server";

import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/session";
import { audit } from "@/lib/audit";
import { checkCapability } from "@/lib/admin-guard";
import { toUid } from "@/lib/uid";

type Result = { ok: true; slot: number } | { ok: false; error: string };

function refresh() {
  revalidatePath("/marketer/genealogy");
  revalidatePath("/marketer/dashboard");
  revalidatePath("/admin/org");
  revalidatePath("/admin/members");
}

// 파트너 본인이 자기 직추를 자기 후원 조직 안에 배치(한 번만). 검증은 DB place_member 가 최종 수행.
export async function placeMemberByPartner(targetId: string, parentId: string): Promise<Result> {
  const me = await getCurrentMember();
  if (!me || me.role !== "marketer") return { ok: false, error: "파트너만 배치할 수 있습니다" };
  const sb = getServerClient();
  const { data: target } = await sb.from("members").select("recommender_id, parent_id").eq("id", targetId).maybeSingle();
  const t = target as { recommender_id: string | null; parent_id: string | null } | null;
  if (!t || t.recommender_id !== me.id) return { ok: false, error: "내가 초대한 회원만 배치할 수 있습니다" };
  if (t.parent_id) return { ok: false, error: "이미 배치된 회원입니다" };

  const { data, error } = await sb.rpc("place_member", { p_member: targetId, p_new_parent: parentId, p_by: "partner", p_note: "파트너 수동 배치" });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, slot: Number(data) };
}

// 관리자 이동 — 확정 후에도 가능하되 사유 필수.
export async function placeMemberByAdmin(targetId: string, parentId: string, note: string): Promise<Result> {
  const g = await checkCapability("members.write", "회원 후원배치 이동");
  if (!g.ok) return { ok: false, error: g.error };
  if (!note.trim()) return { ok: false, error: "이동 사유를 입력하세요" };
  const sb = getServerClient();
  const { data, error } = await sb.rpc("place_member", { p_member: targetId, p_new_parent: parentId, p_by: "admin", p_note: `관리자 이동 · ${note.trim()}` });
  if (error) {
    await audit({ category: "member", action: "member_place_admin", target: `회원 ${toUid(targetId)} 후원배치 이동 실패 · ${error.message}`, targetId, ok: false, risk: true });
    return { ok: false, error: error.message };
  }
  await audit({ category: "member", action: "member_place_admin", target: `회원 ${toUid(targetId)} 후원배치 이동 → ${toUid(parentId)} ${Number(data)}번 자리 · 사유: ${note.trim()}`, targetId, risk: true });
  refresh();
  revalidatePath(`/admin/members/${targetId}`);
  return { ok: true, slot: Number(data) };
}

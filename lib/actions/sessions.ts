"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { checkCapability } from "@/lib/admin-guard";
import { toUid } from "@/lib/uid";

// 관리자: 회원의 활성 세션을 모두 폐기(강제 로그아웃). 회원은 다음 요청에서 /login?reason=admin 으로 이동.
export async function revokeMemberSessions(memberId: string): Promise<{ ok: boolean; error?: string }> {
  const g = await checkCapability("members.write", "회원 강제 로그아웃");
  if (!g.ok) return { ok: false, error: g.error };
  const sb = getServerClient();
  const { error } = await sb
    .from("member_sessions")
    .update({ revoked_at: new Date().toISOString(), revoke_reason: "admin" })
    .eq("member_id", memberId)
    .is("revoked_at", null);
  if (error) return { ok: false, error: error.message };
  await audit({ category: "member", action: "member_force_logout", target: `회원 ${toUid(memberId)} 강제 로그아웃(세션 전부 종료)`, targetId: memberId });
  revalidatePath(`/admin/members/${memberId}`);
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";

// 관리자: 회원의 활성 세션을 모두 폐기(강제 로그아웃). 회원은 다음 요청에서 /login?reason=admin 으로 이동.
export async function revokeMemberSessions(memberId: string): Promise<{ ok: boolean; error?: string }> {
  const sb = getServerClient();
  const { error } = await sb
    .from("member_sessions")
    .update({ revoked_at: new Date().toISOString(), revoke_reason: "admin" })
    .eq("member_id", memberId)
    .is("revoked_at", null);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/members/${memberId}`);
  return { ok: true };
}

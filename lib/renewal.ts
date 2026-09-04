import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import { today } from "@/lib/dates";
import type { MemberRow } from "@/lib/supabase/types";

// 회원이 포털에 들어올 때 본인 구독을 즉시 갱신/만료 처리한다(크론이 돌기 전이라도 화면이 최신 상태가 되도록).
// 결과: 'renewed:N' | 'expired' | 'active' | 'none'. 실패해도 화면을 막지 않는다.
export async function renewOnVisit(member: MemberRow): Promise<string | null> {
  if (member.role === "registered") return null;
  const sb = getServerClient();
  const { data, error } = await sb.rpc("renew_member_subscription", { p_member: member.id, p_today: today() });
  if (error) {
    console.warn("[renewal] renew_member_subscription 실패:", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}

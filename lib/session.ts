import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { getMember } from "@/lib/queries/members";
import type { MemberRow, MemberRole } from "@/lib/supabase/types";

// 세션 쿠키에는 무작위 토큰만 들어간다. 서버는 토큰의 sha256 으로 member_sessions 를 찾는다.
// 로그인 시 같은 회원의 다른 세션은 모두 폐기된다(1기기 제한) — lib/actions/auth.ts 참고.
export const SESSION_COOKIE = "ft_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7일

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// 역할별 홈 경로
export function roleHome(role: MemberRole): string {
  if (role === "marketer") return "/marketer/dashboard";
  if (role === "subscriber") return "/portal/subscriber";
  return "/portal/registered";
}

type SessionLookup = { memberId: string | null; revokeReason: string | null };

// 쿠키 토큰 → 세션 조회(활성이면 회원 id, 폐기됐으면 사유). 요청당 여러 번 불려도 DB 는 한 번만.
async function lookupSession(): Promise<SessionLookup> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return { memberId: null, revokeReason: null };

  const sb = getServerClient();
  const { data, error } = await sb.rpc("touch_member_session", { p_token_hash: hashSessionToken(token) });
  if (error) return { memberId: null, revokeReason: null };
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { memberId: null, revokeReason: null };
  return { memberId: (row.member_id as string | null) ?? null, revokeReason: (row.revoke_reason as string | null) ?? null };
}

// 세션 쿠키의 회원 id (로그인 안 했거나 세션이 폐기됐으면 null)
export async function getSessionMemberId(): Promise<string | null> {
  return (await lookupSession()).memberId;
}

// 현재 로그인 회원(없으면 null)
export async function getCurrentMember(): Promise<MemberRow | null> {
  const id = await getSessionMemberId();
  if (!id) return null;
  return getMember(id);
}

// 로그인 필수 + 역할 가드. 미로그인 → /login(세션이 다른 기기 로그인으로 끊긴 경우 사유 전달), 역할 불일치 → 본인 역할 홈.
export async function requireMember(expected?: MemberRole): Promise<MemberRow> {
  const { memberId, revokeReason } = await lookupSession();
  const member = memberId ? await getMember(memberId) : null;
  if (!member) redirect(revokeReason ? `/login?reason=${encodeURIComponent(revokeReason)}` : "/login");
  if (expected && member.role !== expected) redirect(roleHome(member.role));
  return member;
}

// 파트너 화면 뷰어 id — 로그인한 파트너 본인. 미로그인/타 등급은 requireMember 가 각자 홈으로 보낸다(M0 폴백 없음).
export async function getMarketerViewerId(): Promise<string> {
  const member = await requireMember("marketer");
  return member.id;
}

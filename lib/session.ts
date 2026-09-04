import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMember } from "@/lib/queries/members";
import type { MemberRow, MemberRole } from "@/lib/supabase/types";

export const SESSION_COOKIE = "ag_member";

// 역할별 홈 경로
export function roleHome(role: MemberRole): string {
  if (role === "marketer") return "/marketer/dashboard";
  if (role === "subscriber") return "/portal/subscriber";
  return "/portal/registered";
}

// 세션 쿠키의 회원 id (로그인 안 했으면 null)
export async function getSessionMemberId(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

// 현재 로그인 회원(없으면 null)
export async function getCurrentMember(): Promise<MemberRow | null> {
  const id = await getSessionMemberId();
  if (!id) return null;
  return getMember(id);
}

// 로그인 필수 + 역할 가드. 미로그인 → /login, 역할 불일치 → 본인 역할 홈으로 리다이렉트.
// 통과 시 로그인 회원 반환.
export async function requireMember(expected?: MemberRole): Promise<MemberRow> {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  if (expected && member.role !== expected) redirect(roleHome(member.role));
  return member;
}

// 마케터 화면 뷰어 id — 로그인한 마케터 본인. 미로그인/타 등급은 requireMember 가 각자 홈으로 보낸다(M0 폴백 없음).
export async function getMarketerViewerId(): Promise<string> {
  const member = await requireMember("marketer");
  return member.id;
}

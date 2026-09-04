import "server-only";
import { getServerClient } from "@/lib/supabase/server";

export interface MemberSessionRow {
  id: string;
  member_id: string;
  user_agent: string | null;
  ip: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
}

// 회원의 최근 세션(접속 기록). 최신순.
export async function listMemberSessions(memberId: string, limit = 8): Promise<MemberSessionRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("member_sessions")
    .select("id, member_id, user_agent, ip, created_at, last_seen_at, revoked_at, revoke_reason")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as MemberSessionRow[];
}

// User-Agent 문자열 → 짧은 기기 표기 (예: "Windows · Chrome", "iPhone · Safari")
export function describeDevice(ua: string | null): string {
  if (!ua) return "알 수 없는 기기";
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "기타";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : "브라우저";
  return `${os} · ${browser}`;
}

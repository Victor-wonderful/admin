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

// 회원별 마지막 접속 시각(활성·종료 세션 모두 포함) — 회원 목록의 "마지막 접속" 열·필터용.
export async function getLastSeenMap(): Promise<Map<string, string>> {
  const sb = getServerClient();
  const out = new Map<string, string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from("member_sessions")
      .select("member_id, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ member_id: string; last_seen_at: string }>;
    for (const r of rows) if (!out.has(r.member_id)) out.set(r.member_id, r.last_seen_at);
    if (rows.length < PAGE) break;
  }
  return out;
}

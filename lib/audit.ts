import "server-only";
import { headers } from "next/headers";

import { getServerClient } from "@/lib/supabase/server";
import { getCurrentAdmin } from "@/lib/admin-session";

// 관리자 감사 로그 기록. 어떤 경우에도 호출 측 흐름을 막지 않는다(실패는 경고 로그만).
//   actor 생략      → 현재 로그인 관리자(세션 쿠키)로 기록
//   actor: null     → 익명(예: 로그인 실패 전 단계)
//   actor: {email}  → 이메일만 아는 경우(로그인 실패·재설정 요청)
//   actor: {id}     → id 로 관리자 이름·이메일을 조회해 스냅샷

export type AuditCategory = "auth" | "permission" | "settlement" | "finance" | "member" | "catalog";

export interface AuditActor { id?: string | null; name?: string | null; email?: string | null }

export interface AuditEntry {
  category: AuditCategory;
  action: string;
  target?: string | null;
  targetId?: string | null;
  ok?: boolean;
  risk?: boolean;
  meta?: Record<string, unknown> | null;
  actor?: AuditActor | null;
}

async function resolveActor(actor: AuditActor | null | undefined): Promise<AuditActor> {
  if (actor === null) return {};
  if (actor === undefined) {
    const cur = await getCurrentAdmin().catch(() => null);
    return cur ? { id: cur.admin.id, name: cur.admin.display_name, email: cur.admin.email } : {};
  }
  if (actor.id && (!actor.name || !actor.email)) {
    const sb = getServerClient();
    const { data } = await sb.from("admins").select("display_name, email").eq("id", actor.id).maybeSingle();
    const a = data as { display_name: string; email: string } | null;
    if (a) return { id: actor.id, name: actor.name ?? a.display_name, email: actor.email ?? a.email };
  }
  return actor;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const [actor, h] = await Promise.all([resolveActor(entry.actor), headers()]);
    const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
    const sb = getServerClient();
    const { error } = await sb.from("admin_audit_logs").insert({
      admin_id: actor.id ?? null,
      admin_name: actor.name ?? null,
      admin_email: actor.email ?? null,
      category: entry.category,
      action: entry.action,
      target: entry.target ?? null,
      target_id: entry.targetId ?? null,
      ok: entry.ok ?? true,
      risk: entry.risk ?? false,
      ip: ip || null,
      user_agent: (h.get("user-agent") ?? "").slice(0, 300) || null,
      meta: entry.meta ?? null,
    });
    if (error) console.warn("[audit] 기록 실패:", error.message);
  } catch (e) {
    console.warn("[audit] 기록 예외:", e instanceof Error ? e.message : e);
  }
}

import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import { currentCycle, today } from "@/lib/dates";
import type { AuditCategory } from "@/lib/audit";

export interface AuditRow {
  id: number;
  at: string;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  category: AuditCategory;
  action: string;
  target: string | null;
  target_id: string | null;
  ok: boolean;
  risk: boolean;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
}

export interface AuditStats {
  today: number;
  month: number;
  prevMonth: number;
  riskMonth: number;
  loginFailMonth: number;
  lockedMonth: number;
}

// 서울 기준 경계를 UTC 순간으로.
const seoulStart = (ymd: string) => new Date(`${ymd}T00:00:00+09:00`).toISOString();
function prevCycle(cycle: string): string {
  const [y, m] = cycle.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function listAuditLogs(limit = 2000): Promise<AuditRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("admin_audit_logs")
    .select("id, at, admin_id, admin_name, admin_email, category, action, target, target_id, ok, risk, ip, user_agent, meta")
    .order("at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AuditRow[];
}

export async function getAuditStats(): Promise<AuditStats> {
  const sb = getServerClient();
  const cyc = currentCycle();
  const monthStart = seoulStart(`${cyc}-01`);
  const prevStart = seoulStart(`${prevCycle(cyc)}-01`);
  const dayStart = seoulStart(today());
  const count = (q: (b: ReturnType<typeof base>) => ReturnType<typeof base>) =>
    q(base()).then(({ count, error }) => { if (error) throw error; return count ?? 0; });
  const base = () => sb.from("admin_audit_logs").select("id", { count: "exact", head: true });

  const [todayN, month, prevMonth, riskMonth, loginFailMonth, lockedMonth] = await Promise.all([
    count((b) => b.gte("at", dayStart)),
    count((b) => b.gte("at", monthStart)),
    count((b) => b.gte("at", prevStart).lt("at", monthStart)),
    count((b) => b.gte("at", monthStart).eq("risk", true)),
    count((b) => b.gte("at", monthStart).in("action", ["login_failed", "login_locked", "mfa_failed"])),
    count((b) => b.gte("at", monthStart).eq("action", "login_locked")),
  ]);
  return { today: todayN, month, prevMonth, riskMonth, loginFailMonth, lockedMonth };
}

import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admin-session";
import { canView } from "@/lib/admin-permissions";
import { getWithdrawalSummary } from "@/lib/queries/finance";
import { getDepositSummary } from "@/lib/queries/deposits";
import { getServerClient } from "@/lib/supabase/server";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

export type AdminNotificationItem = { id: string; tone: "info" | "warning" | "negative" | "green"; title: string; sub: string; href?: string };

// 관리자 콘솔 상단 종 — 처리 대기 항목(출금 승인·미확인 입금)과 오늘의 보안 이벤트(로그인 실패·잠금). 역할이 볼 수 있는 화면만.
export async function GET() {
  const cur = await getCurrentAdmin();
  if (!cur || !cur.mfaOk) return NextResponse.json({ items: [] as AdminNotificationItem[] });
  const role = cur.admin.role;
  const sb = getServerClient();
  const dayStart = new Date(`${today()}T00:00:00+09:00`).toISOString();

  const [wd, dep, fails] = await Promise.all([
    canView(role, "withdrawals") ? getWithdrawalSummary() : null,
    canView(role, "deposits") ? getDepositSummary() : null,
    sb.from("admin_audit_logs").select("id", { count: "exact", head: true }).gte("at", dayStart).in("action", ["login_failed", "login_locked", "mfa_failed"]),
  ]);

  const items: AdminNotificationItem[] = [];
  if (wd && wd.pendingCount > 0) {
    items.push({ id: "wd-pending", tone: "warning", title: `출금 승인 대기 ${wd.pendingCount}건`, sub: `합계 $${Math.round(wd.pendingAmount).toLocaleString()} · 출금내역에서 승인/반려`, href: "/admin/withdrawals" });
  }
  if (wd && wd.sendingCount > 0) {
    items.push({ id: "wd-sending", tone: "info", title: `송금 중 ${wd.sendingCount}건 · tx_hash 입력 대기`, sub: "지갑 앱에서 보낸 뒤 해시를 입력해 완료 처리", href: "/admin/withdrawals" });
  }
  if (dep && dep.unmatchedCount > 0) {
    items.push({ id: "dep-unmatched", tone: "warning", title: `미확인 입금 ${dep.unmatchedCount}건`, sub: `합계 $${Math.round(dep.unmatchedAmount).toLocaleString()} · 회원 매칭 또는 무시 처리`, href: "/admin/deposits" });
  }
  const failCount = fails.count ?? 0;
  if (failCount > 0) {
    items.push({ id: "auth-fails", tone: failCount >= 5 ? "negative" : "info", title: `오늘 관리자 로그인 실패 ${failCount}건`, sub: "감사 로그 · 인증 탭에서 확인", href: canView(role, "audit") ? "/admin/audit" : undefined });
  }
  return NextResponse.json({ items });
}

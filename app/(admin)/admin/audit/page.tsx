import { Topbar } from "@/components/shell/topbar";
import { AuditExplorer } from "@/components/audit/audit-explorer";
import { requireAdmin } from "@/lib/admin-session";
import { listAuditLogs, getAuditStats } from "@/lib/queries/audit";

export const dynamic = "force-dynamic";

// 감사 로그 — 관리자 행위 기록(실데이터). 기록은 각 서버 액션의 audit() 호출로 쌓인다(lib/audit.ts).
export default async function AdminAuditPage() {
  const me = await requireAdmin();
  const [rows, stats] = await Promise.all([listAuditLogs(2000), getAuditStats()]);
  return (
    <>
      <Topbar title="감사 로그" sub="운영자 활동 기록 · 변경 이력 · 보안 이벤트 · 최근 2,000건" uid={me.display_name} />
      <AuditExplorer rows={rows} stats={stats} />
    </>
  );
}

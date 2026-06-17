import {
  CalendarCheckIcon,
  ActivityIcon,
  TriangleAlertIcon,
  XCircleIcon,
  UserRoundIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const KPIS = [
  { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 이벤트", value: "248건" },
  { icon: ActivityIcon, tone: "info" as const, label: "당월 이벤트", value: "6,420건" },
  { icon: TriangleAlertIcon, tone: "warning" as const, label: "위험 액션", value: "12건" },
  { icon: XCircleIcon, tone: "negative" as const, label: "로그인 실패", value: "5건" },
];

const TABS = ["전체", "인증", "정산", "권한", "회원"];

const LOGS = [
  { dt: "06-17 14:32", admin: "이정산", action: "정산 확정", tone: "green" as const, target: "2026-06 정산 사이클", ip: "121.78.x.x", result: "성공", rt: "green" as const },
  { dt: "06-17 14:02", admin: "이정산", action: "출금 승인", tone: "warning" as const, target: "AG·8F3A21 · $5,000", ip: "121.78.x.x", result: "성공", rt: "green" as const },
  { dt: "06-17 11:20", admin: "김운영", action: "권한 변경", tone: "crypto" as const, target: "박매니저 → 운영매니저", ip: "211.45.x.x", result: "성공", rt: "green" as const },
  { dt: "06-17 09:15", admin: "—", action: "로그인 실패", tone: "negative" as const, target: "settle@alphagate.io (3회)", ip: "45.62.x.x", result: "실패", rt: "negative" as const },
  { dt: "06-16 22:40", admin: "박매니저", action: "회원 정지", tone: "negative" as const, target: "AG·7C0F19", ip: "59.20.x.x", result: "성공", rt: "green" as const },
];

export default function AdminAuditPage() {
  return (
    <>
      <Topbar title="감사 로그" sub="관리자 활동 추적 · 보안 이벤트" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <Panel
          title="감사 로그"
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[auto_0.9fr_auto_1.4fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>시각</span><span>관리자</span><span>액션</span><span>대상·상세</span><span>IP</span><span className="text-right">결과</span>
            </div>
            {LOGS.map((l, i) => (
              <div key={i} className="grid grid-cols-[auto_0.9fr_auto_1.4fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{l.dt}</span>
                <span className="flex items-center gap-2 font-medium text-text-primary">
                  <span className="grid size-6 place-items-center rounded-full bg-surface-muted text-text-tertiary">
                    <UserRoundIcon className="size-3" />
                  </span>
                  {l.admin}
                </span>
                <span><Pill tone={l.tone}>{l.action}</Pill></span>
                <span className="text-text-secondary">{l.target}</span>
                <span className="text-xs text-text-tertiary tabular-nums">{l.ip}</span>
                <span className="justify-self-end"><Pill tone={l.rt}>{l.result}</Pill></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  CalendarCheckIcon,
  ArrowDownToLineIcon,
  SigmaIcon,
  ClockIcon,
  TriangleAlertIcon,
  HashIcon,
  ExternalLinkIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { toUid } from "@/lib/uid";
import { getDepositStats, listTransactions } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const TABS = ["전체", "엔진 구독", "연회비", "상품"];

export default async function AdminDepositsPage() {
  const [stats, rows] = await Promise.all([getDepositStats(), listTransactions({ type: "payment", limit: 12 })]);

  const kpis = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당월 입금", value: usd(stats.monthSum) },
    { icon: ArrowDownToLineIcon, tone: "green" as const, label: "누적 입금", value: usd(stats.monthSum) },
    { icon: SigmaIcon, tone: "neutral" as const, label: "입금 건수", value: `${stats.count.toLocaleString()}건` },
    { icon: ClockIcon, tone: "info" as const, label: "평균 확인", value: "1.2분" },
    { icon: TriangleAlertIcon, tone: "warning" as const, label: "대기·미확인", value: `${stats.pending}건` },
  ];

  return (
    <>
      <Topbar title="입금내역" sub="구독료·연회비·상품 대금 유입 · 온체인" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <Panel
          title="입금 원장"
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[auto_1fr_1.2fr_auto_auto_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>일시</span><span>회원</span><span>항목</span><span>금액</span><span>네트워크</span><span>TxHash</span><span className="text-right">확인</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[auto_1fr_1.2fr_auto_auto_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{r.created_at.slice(5, 16).replace("T", " ")}</span>
                <span className="font-semibold text-text-primary">{toUid(r.member_id)}</span>
                <span className="text-text-secondary">{Number(r.amount_usd) >= 200 ? "마케터 연회비" : "Alpha Engine 구독"}</span>
                <span className="font-semibold tabular-nums text-green-700">+{usd(r.amount_usd)}</span>
                <span className="text-xs text-text-tertiary">{r.network}</span>
                <span className="flex items-center gap-1 text-xs text-text-tertiary"><HashIcon className="size-3" />{r.tx_hash?.slice(0, 8)}<ExternalLinkIcon className="size-3" /></span>
                <span className="justify-self-end"><Pill tone={r.status === "completed" ? "green" : "warning"} dot={r.status === "completed"}>{r.status === "completed" ? "완료" : "확인중"}</Pill></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

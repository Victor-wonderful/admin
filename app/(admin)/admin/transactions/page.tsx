import {
  CalendarCheckIcon,
  ArrowLeftRightIcon,
  SigmaIcon,
  FuelIcon,
  TriangleAlertIcon,
  HashIcon,
  ExternalLinkIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { toUid } from "@/lib/uid";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getTransactionStats, listTransactions } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const TABS = ["전체", "입금", "출금", "실패"];

const TYPE: Record<string, { label: string; dir: "in" | "out" }> = {
  deposit: { label: "입금", dir: "in" },
  commission: { label: "수당", dir: "in" },
  payment: { label: "결제", dir: "out" },
  withdrawal: { label: "출금", dir: "out" },
};
const STATE: Record<string, { label: string; tone: "green" | "info" | "negative" }> = {
  completed: { label: "완료", tone: "green" },
  pending: { label: "확인중", tone: "info" },
  sending: { label: "송금 중", tone: "info" },
  failed: { label: "실패", tone: "negative" },
};

export default async function AdminTransactionsPage() {
  const [stats, rows] = await Promise.all([getTransactionStats(), listTransactions({ limit: 12 })]);

  const kpis = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당월 거래", value: `${stats.total.toLocaleString()}건` },
    { icon: ArrowLeftRightIcon, tone: "info" as const, label: "당월 거래량", value: usd(stats.monthVolume) },
    { icon: SigmaIcon, tone: "neutral" as const, label: "누적 거래", value: `${stats.total.toLocaleString()}건` },
    { icon: FuelIcon, tone: "warning" as const, label: "평균 수수료", value: `$${stats.avgFee.toFixed(2)}` },
    { icon: TriangleAlertIcon, tone: "negative" as const, label: "실패·재시도", value: `${stats.failed}건` },
  ];

  return (
    <>
      <Topbar title="트랜잭션" sub="온체인 통합 원장 · 입출금 전체" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <Panel
          title="온체인 통합 원장"
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>일시</span><span>유형</span><span>회원</span><span>금액</span><span>네트워크</span><span>TxHash</span><span className="text-right">상태</span>
            </div>
            {rows.map((r) => {
              const ty = TYPE[r.tx_type] ?? { label: r.tx_type, dir: "out" as const };
              const st = STATE[r.status] ?? { label: r.status, tone: "info" as const };
              return (
                <div key={r.id} className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                  <span className="text-text-tertiary tabular-nums">{r.created_at.slice(5, 16).replace("T", " ")}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    {ty.dir === "in" ? <ArrowDownLeftIcon className="size-3.5 text-green-600" /> : <ArrowUpRightIcon className="size-3.5 text-info" />}
                    {ty.label}
                  </span>
                  <span className="font-semibold text-text-primary">{toUid(r.member_id)}</span>
                  <span className={cn("font-semibold tabular-nums", ty.dir === "in" ? "text-green-700" : "text-text-primary")}>
                    {ty.dir === "in" ? "+" : "−"}{usd(r.amount_usd)}
                  </span>
                  <span className="text-xs text-text-tertiary">{r.network ?? "—"}</span>
                  <span className="flex items-center gap-1 text-xs text-text-tertiary"><HashIcon className="size-3" />{r.tx_hash?.slice(0, 8) ?? "—"}<ExternalLinkIcon className="size-3" /></span>
                  <span className="justify-self-end"><Pill tone={st.tone} dot={r.status === "completed"}>{st.label}</Pill></span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

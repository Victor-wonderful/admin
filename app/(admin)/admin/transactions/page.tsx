import { CalendarCheckIcon, ArrowLeftRightIcon, SigmaIcon, FuelIcon, TriangleAlertIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { TransactionsExplorer } from "@/components/transactions/transactions-explorer";
import { listAdminTransactions } from "@/lib/queries/admin-finance";
import { currentCycle } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 트랜잭션 — 회원 지갑 통합 원장(입금·결제·출금·리워드) 실데이터.
const SUBCARD = "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";
const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700", crypto: "bg-crypto-soft text-crypto", info: "bg-info-soft text-info", negative: "bg-negative-soft text-negative", neutral: "bg-n-100 text-n-500",
};
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const compact = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : usd(n));

export default async function AdminTransactionsPage() {
  const { rows, stats } = await listAdminTransactions(2000);
  const cycle = currentCycle();
  const KPIS = [
    { icon: CalendarCheckIcon, tone: "green", label: "당일 거래", value: `${stats.todayCount}건`, info: `입금 ${stats.todayDeposit} · 출금 ${stats.todayWithdrawal}` },
    { icon: ArrowLeftRightIcon, tone: "info", label: "당월 거래량", value: compact(stats.monthVolume), info: `${cycle} · ${stats.monthCount.toLocaleString()}건` },
    { icon: SigmaIcon, tone: "neutral", label: "누적 거래 (전체)", value: compact(stats.totalVolume), info: `${stats.totalCount.toLocaleString()}건` },
    { icon: FuelIcon, tone: "crypto", label: "평균 출금 수수료", value: `$${stats.avgFee.toFixed(2)}`, info: "출금 건 기준" },
    { icon: TriangleAlertIcon, tone: "negative", label: "대기·실패", value: `${stats.problem}건`, info: stats.problem ? "출금 대기·송금 중·실패 포함" : "없음", warn: stats.problem > 0 },
  ];
  return (
    <>
      <Topbar title="트랜잭션" sub="회원 지갑 통합 원장 · 입금 · 결제 · 출금 · 리워드 (USDT)" uid="운영자" />
      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}><k.icon className="size-[18px]" /></div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[24px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              <span className={cn("text-[11px] font-medium", "warn" in k && k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
            </div>
          ))}
        </section>
        <TransactionsExplorer rows={rows} stats={stats} cycle={cycle} />
      </div>
    </>
  );
}

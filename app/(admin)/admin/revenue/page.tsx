import {
  CalendarCheckIcon,
  TrendingUpIcon,
  SigmaIcon,
  UsersIcon,
  RotateCcwIcon,
  PercentIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getRevenueSummary } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const compact = (n: number) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : usd(n));

const TREND = [62, 70, 58, 78, 84, 72, 90, 82, 96, 88, 104, 118];
const COMPOSITION = [
  { label: "Alpha Engine 구독", pct: 62, color: "bg-green-500" },
  { label: "마케터 연회비", pct: 21, color: "bg-crypto" },
  { label: "상품 매출", pct: 17, color: "bg-info" },
];

export default async function AdminRevenuePage() {
  const rev = await getRevenueSummary();
  const m = rev.monthTotal;
  const alloc = [
    { label: "수당 풀", pct: 60, value: usd(m * 0.6), color: "bg-green-500", soft: "text-green-700" },
    { label: "회사 수익", pct: 20, value: usd(m * 0.2), color: "bg-info", soft: "text-info" },
    { label: "지분자 배당", pct: 10, value: usd(m * 0.1), color: "bg-crypto", soft: "text-crypto" },
    { label: "예비비", pct: 10, value: usd(m * 0.1), color: "bg-n-400", soft: "text-n-600" },
  ];

  const kpis = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 매출", value: "$8,940" },
    { icon: TrendingUpIcon, tone: "green" as const, label: "당월 매출", value: usd(m) },
    { icon: SigmaIcon, tone: "neutral" as const, label: "연 누적", value: compact(rev.total) },
    { icon: UsersIcon, tone: "info" as const, label: "결제 건수", value: `${(rev.subCount + rev.annualCount).toLocaleString()}건` },
    { icon: RotateCcwIcon, tone: "warning" as const, label: "당월 환불", value: "$1,240" },
    { icon: PercentIcon, tone: "crypto" as const, label: "순마진", value: "70.1%" },
  ];

  return (
    <>
      <Topbar title="매출현황" sub="수익 분석 · USDT" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        <Panel title="순매출 배분" sub={`당월 매출 ${usd(m)} → 1차 배분`} action={<Pill tone="green">합계 100%</Pill>}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex flex-col justify-center rounded-lg bg-feature px-6 py-5 text-white lg:w-56">
              <div className="text-xs font-medium text-white/60">총 매출 (당월)</div>
              <div className="mt-1 text-3xl font-bold tabular-nums">{usd(m)}</div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
              {alloc.map((a) => (
                <div key={a.label} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">{a.label}</span>
                    <span className={cn("text-xs font-bold", a.soft)}>{a.pct}%</span>
                  </div>
                  <div className="mt-2 text-lg font-bold tabular-nums text-text-primary">{a.value}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", a.color)} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1fr_388px]">
          <Panel title="매출 추이" sub="최근 12개월 (USDT)" action={<Pill tone="green" dot>당월 {usd(m)}</Pill>}>
            <div className="flex h-44 items-end gap-2">
              {TREND.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end">
                  <div className={cn("rounded-t", i === TREND.length - 1 ? "bg-green-600" : "bg-green-300")} style={{ height: `${h * 0.8}%` }} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="매출 구성" sub="당월 항목별">
            <div className="space-y-4">
              {COMPOSITION.map((c) => (
                <div key={c.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-text-secondary">{c.label}</span>
                    <span className="font-bold text-text-primary">{c.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", c.color)} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

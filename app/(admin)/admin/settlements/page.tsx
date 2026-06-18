import {
  CoinsIcon,
  Share2Icon,
  LayersIcon,
  UsersIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  RefreshCwIcon,
  CheckCheckIcon,
  SendIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { toUid } from "@/lib/uid";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getSettlementSummary, listSettlements } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYCLE = "2026-06";
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

const PIPELINE = [
  { label: "산정 완료", done: true },
  { label: "확정 검토", current: true },
  { label: "지급 실행" },
];

const STATE_TONE: Record<string, "green" | "info" | "warning" | "negative" | "neutral"> = {
  paid: "green",
  confirmed: "info",
  calculated: "neutral",
  held: "negative",
};
const STATE_LABEL: Record<string, string> = {
  paid: "완료",
  confirmed: "확정",
  calculated: "산정",
  held: "보류",
};

export default async function AdminSettlementsPage() {
  const [sum, rows] = await Promise.all([
    getSettlementSummary(CYCLE),
    listSettlements(CYCLE, 12),
  ]);

  const kpis = [
    { icon: CoinsIcon, tone: "green" as const, label: "당월 수당 총액", value: usd(sum.total) },
    { icon: Share2Icon, tone: "green" as const, label: "직접추천", value: usd(sum.level) },
    { icon: LayersIcon, tone: "crypto" as const, label: "직급", value: usd(sum.rank) },
    { icon: UsersIcon, tone: "info" as const, label: "공유", value: usd(sum.share) },
    { icon: ClockIcon, tone: "warning" as const, label: "지급 대기", value: usd(sum.pending) },
  ];

  const pct = (n: number) => (sum.total ? Math.round((n / sum.total) * 100) : 0);
  const composition = [
    { label: "직접추천 수당", pct: pct(sum.level), color: "bg-green-500" },
    { label: "직급 수당", pct: pct(sum.rank), color: "bg-crypto" },
    { label: "공유 수당", pct: pct(sum.share), color: "bg-info" },
  ];

  return (
    <>
      <Topbar title="수당 정산" sub={`${CYCLE} 사이클 · ${sum.count.toLocaleString()}명`} uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button className="grid size-8 place-items-center rounded-md ring-1 ring-border text-text-secondary"><ChevronLeftIcon className="size-4" /></button>
              <span className="text-sm font-bold text-text-primary">2026년 6월 정산</span>
              <button className="grid size-8 place-items-center rounded-md ring-1 ring-border text-text-secondary"><ChevronRightIcon className="size-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              {PIPELINE.map((p, i) => (
                <div key={p.label} className="flex items-center gap-2">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", p.done ? "bg-green-50 text-green-700" : p.current ? "bg-warning-soft text-warning" : "bg-surface-muted text-text-tertiary")}>{p.label}</span>
                  {i < PIPELINE.length - 1 ? <ChevronRightIcon className="size-3 text-text-tertiary" /> : null}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong"><RefreshCwIcon className="size-3.5" /> 재산정</button>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong"><CheckCheckIcon className="size-3.5" /> 일괄 확정</button>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[13px] font-semibold text-white"><SendIcon className="size-3.5" /> 지급 실행</button>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1fr_388px]">
          <Panel title="수당 구성" sub="당월 지급 기준">
            <div className="space-y-4">
              {composition.map((c) => (
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

          <Panel title="공유수당 풀" sub="적립률 3%">
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-xs text-green-700">당월 공유 분배</div>
              <div className="text-2xl font-bold text-green-700 tabular-nums">{usd(sum.share)}</div>
            </div>
          </Panel>
        </div>

        <Panel title="마케터별 정산" sub={`상위 ${rows.length}명`}>
          <div>
            <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>회원</span><span>직접추천</span><span>직급</span><span>공유</span><span>합계</span><span className="text-right">상태</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{toUid(r.member_id)}</span>
                <span className="text-text-secondary tabular-nums">{usd(r.level_amount)}</span>
                <span className="text-text-secondary tabular-nums">{usd(r.rank_amount)}</span>
                <span className="text-text-secondary tabular-nums">{usd(r.share_amount)}</span>
                <span className="font-bold tabular-nums text-text-primary">{usd(r.total_amount)}</span>
                <span className="justify-self-end"><Pill tone={STATE_TONE[r.status] ?? "neutral"}>{STATE_LABEL[r.status] ?? r.status}</Pill></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

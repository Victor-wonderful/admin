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
  CheckIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  SlidersHorizontalIcon,
  DownloadIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 수당 정산 — Pencil 디자인(o9CRw) 1:1. 집계 연동 전까지 디자인 수치 고정.
const TOTAL = 52_910;

const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-n-100 text-n-500",
};

// ── 상단 KPI 5종 ──
const KPIS = [
  { icon: CoinsIcon, tone: "green" as const, label: "당월 수당 총액", value: "$52,910", delta: 8.4, deltaLabel: "vs 전월", info: null as string | null },
  { icon: Share2Icon, tone: "green" as const, label: "직접추천수당", value: "$23,810", delta: null, info: "구성 45%" },
  { icon: LayersIcon, tone: "crypto" as const, label: "직급수당", value: "$20,106", delta: null, info: "구성 38%" },
  { icon: UsersIcon, tone: "info" as const, label: "공유수당", value: "$8,994", delta: null, info: "구성 17%" },
  { icon: ClockIcon, tone: "warning" as const, label: "지급 대기", value: "$16,430", delta: null, info: "85건 대기", warn: true },
];

// ── 정산 파이프라인 ──
const PIPELINE = [
  { label: "산정 완료", state: "done" },
  { label: "확정 검토", state: "current" },
  { label: "지급 실행", state: "todo" },
];

// ── 수당 구성(도넛) ──
const COMPOSITION = [
  { label: "직접추천수당", sub: "레벨 1~3 · 직추 기반", value: "$23,810", pct: 45, hex: "#1f9d55", dot: "bg-green-500" },
  { label: "직급수당", sub: "R1~R9 직급 달성", value: "$20,106", pct: 38, hex: "#7c3aed", dot: "bg-crypto" },
  { label: "공유수당", sub: "매출 3% 공유 분배", value: "$8,994", pct: 17, hex: "#2f6fed", dot: "bg-info" },
];

// ── 공유수당 풀 ──
const POOL = [
  { label: "당월 적립 (매출 3%)", value: "+$5,328", tone: "text-positive" },
  { label: "당월 분배 (마케터 412명)", value: "−$8,994", tone: "text-negative" },
  { label: "분배 대상 마케터", value: "412명", tone: "text-text-primary" },
  { label: "1인 평균 분배", value: "$21.8", tone: "text-text-primary" },
];

// ── 마케터별 정산 ──
type Status = "paid" | "confirmed" | "held";
const ROWS: { uid: string; rank: string; level: string; rankAmt: string; share: string; total: string; status: Status }[] = [
  { uid: "AG-8F3A21", rank: "R6", level: "$1,240", rankAmt: "$980", share: "$210", total: "$2,430", status: "paid" },
  { uid: "AG-2B91C0", rank: "R5", level: "$980", rankAmt: "$720", share: "$180", total: "$1,880", status: "paid" },
  { uid: "AG-77D4E2", rank: "R5", level: "$640", rankAmt: "$540", share: "$150", total: "$1,330", status: "confirmed" },
  { uid: "AG-19A0FF", rank: "R4", level: "$590", rankAmt: "$460", share: "$160", total: "$1,210", status: "confirmed" },
  { uid: "AG-5C32B8", rank: "R4", level: "$420", rankAmt: "$300", share: "$110", total: "$830", status: "confirmed" },
  { uid: "AG-A1B2C3", rank: "R3", level: "$310", rankAmt: "$190", share: "$80", total: "$580", status: "held" },
  { uid: "AG-6E7F88", rank: "R3", level: "$190", rankAmt: "$90", share: "$60", total: "$330", status: "confirmed" },
];

const COLS = "grid-cols-[1.7fr_1fr_1fr_1fr_1.1fr_120px]";

export default function AdminSettlementsPage() {
  return (
    <>
      <Topbar title="수당 정산" sub="산정 → 직접추천 · 직급 · 공유 수당 · USDT" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 상단 KPI 5종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}>
                  <k.icon className="size-[18px]" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[26px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              {k.delta !== null ? (
                <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", k.delta >= 0 ? "text-positive" : "text-negative")}>
                  {k.delta >= 0 ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
                  {k.delta >= 0 ? "+" : ""}{k.delta.toFixed(1)}%
                  <span className="font-medium text-text-tertiary">{k.deltaLabel}</span>
                </span>
              ) : (
                <span className={cn("text-[11px] font-medium", "warn" in k && k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
              )}
            </div>
          ))}
        </section>

        {/* ── 정산 액션 바 ── */}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronLeftIcon className="size-4" /></button>
              <span className="text-sm font-bold text-text-primary">2026년 6월 정산</span>
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronRightIcon className="size-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              {PIPELINE.map((p, i) => (
                <div key={p.label} className="flex items-center gap-2">
                  <span className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    p.state === "done" ? "bg-green-50 text-green-700" : p.state === "current" ? "bg-warning-soft text-warning" : "bg-surface-muted text-text-tertiary",
                  )}>{p.label}</span>
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

        {/* ── 수당 구성 + 공유수당 풀 ── */}
        <div className="grid gap-[18px] lg:grid-cols-[1fr_388px]">
          <Panel title="수당 구성" sub="당월 · 직접추천 · 직급 · 공유 USDT">
            <div className="flex items-center gap-7">
              <div
                className="relative grid size-40 shrink-0 place-items-center rounded-full"
                style={{ background: "conic-gradient(#1f9d55 0% 45%, #7c3aed 45% 83%, #2f6fed 83% 100%)" }}
              >
                <div className="grid size-[104px] place-items-center rounded-full bg-card text-center">
                  <div>
                    <div className="text-[21px] font-bold tabular-nums text-text-primary">$52.9K</div>
                    <div className="text-[11px] text-text-tertiary">당월 수당</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3.5">
                {COMPOSITION.map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", c.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-text-primary">{c.label}</div>
                      <div className="text-[11px] text-text-tertiary">{c.sub}</div>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums text-text-primary">{c.value}</span>
                    <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="공유수당 풀" action={<Pill tone="green">적립률 3%</Pill>}>
            <div className="rounded-lg bg-green-50 px-4 py-3.5">
              <div className="text-xs font-medium text-green-700">당월 분배 가능 잔액</div>
              <div className="text-[28px] leading-none font-bold tabular-nums text-green-700">$14,260</div>
            </div>
            <div className="mt-3 divide-y divide-border">
              {POOL.map((p) => (
                <div key={p.label} className="flex items-center justify-between py-2.5">
                  <span className="text-[13px] text-text-secondary">{p.label}</span>
                  <span className={cn("text-[13px] font-bold tabular-nums", p.tone)}>{p.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── 마케터별 정산 ── */}
        <Panel
          title="마케터별 정산"
          sub="2026년 6월 · 지급 USDT"
          action={
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><SlidersHorizontalIcon className="size-4" /> 상태</button>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
            </div>
          }
          bodyClassName="overflow-x-auto"
        >
          <div className="min-w-[760px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>회원</span>
              <span className="text-right">직접추천</span>
              <span className="text-right">직급</span>
              <span className="text-right">공유</span>
              <span className="text-right">합계</span>
              <span className="text-right">상태</span>
            </div>
            {ROWS.map((r) => (
              <div key={r.uid} className={cn("grid items-center gap-3 border-b py-3.5 last:border-0", COLS)}>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-n-100 text-[10px] font-bold text-n-500">{r.uid.slice(3, 5)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{r.uid}</div>
                    <span className="text-[10px] font-bold text-crypto">{r.rank}</span>
                  </div>
                </div>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{r.level}</span>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{r.rankAmt}</span>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{r.share}</span>
                <span className="text-right text-[13px] font-bold tabular-nums text-text-primary">{r.total}</span>
                <span className="flex justify-end">
                  {r.status === "paid" ? (
                    <Pill tone="green" dot>지급 완료</Pill>
                  ) : r.status === "held" ? (
                    <Pill tone="neutral">보류</Pill>
                  ) : (
                    <button className="inline-flex items-center gap-1 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white">
                      <CheckIcon className="size-3.5" /> 지급
                    </button>
                  )}
                </span>
              </div>
            ))}
            <div className={cn("grid items-center gap-3 pt-3.5 text-[13px] font-bold text-text-primary", COLS)}>
              <span>당월 합계 · 212명</span>
              <span className="text-right tabular-nums text-text-secondary">$23,810</span>
              <span className="text-right tabular-nums text-text-secondary">$20,106</span>
              <span className="text-right tabular-nums text-text-secondary">$8,994</span>
              <span className="text-right tabular-nums">${TOTAL.toLocaleString()}</span>
              <span className="flex justify-end"><Pill tone="green">지급률 71%</Pill></span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

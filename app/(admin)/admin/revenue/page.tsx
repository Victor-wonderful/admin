import {
  CalendarCheckIcon,
  TrendingUpIcon,
  SigmaIcon,
  CoinsIcon,
  RotateCcwIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  DownloadIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 매출현황 — Pencil 디자인(JJpIh) 1:1. 시드/집계 연동 전까지 디자인 수치 고정.
const MONTH_TOTAL = 184_260;

const CARD =
  "rounded-xl bg-card p-[22px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";
const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

// ── 상단 KPI 5종 ──
const KPIS = [
  { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 매출 (USDT)", value: "$8,940", delta: 12.4, deltaLabel: "vs 어제" },
  { icon: TrendingUpIcon, tone: "green" as const, label: "당월 매출 (USDT)", value: "$184,260", delta: 18.6, deltaLabel: "vs 전월" },
  { icon: SigmaIcon, tone: "neutral" as const, label: "누적 매출", value: "$2,418,900", delta: null, deltaLabel: "전체 기간" },
  { icon: CoinsIcon, tone: "crypto" as const, label: "객단가 (ARPU)", value: "$148.6", delta: 6.0, deltaLabel: "vs 전월" },
  { icon: RotateCcwIcon, tone: "negative" as const, label: "당월 환불", value: "$2,160", delta: -1.2, deltaLabel: "vs 전월" },
];

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  negative: "bg-negative-soft text-negative",
  neutral: "bg-n-100 text-n-500",
};

// ── 당월 매출 배분 ──
const ALLOC = [
  { label: "수당 풀", pct: 60, value: "$110,556", color: "bg-green-500", soft: "text-green-700" },
  { label: "회사 수익", pct: 20, value: "$36,852", color: "bg-info", soft: "text-info" },
  { label: "지분자 배당", pct: 10, value: "$18,426", color: "bg-crypto", soft: "text-crypto" },
  { label: "예비비", pct: 10, value: "$18,426", color: "bg-n-400", soft: "text-n-600" },
];

// ── 매출 추이(12개월 · 항목별 스택) ──
const TREND: { m: string; e: number; a: number; p: number }[] = [
  { m: "7", e: 78, a: 24, p: 18 },
  { m: "8", e: 82, a: 26, p: 19 },
  { m: "9", e: 80, a: 25, p: 17 },
  { m: "10", e: 88, a: 28, p: 21 },
  { m: "11", e: 92, a: 30, p: 22 },
  { m: "12", e: 96, a: 29, p: 24 },
  { m: "1", e: 101, a: 32, p: 25 },
  { m: "2", e: 98, a: 31, p: 23 },
  { m: "3", e: 106, a: 34, p: 27 },
  { m: "4", e: 110, a: 35, p: 28 },
  { m: "5", e: 113, a: 37, p: 30 },
  { m: "6", e: 114, a: 39, p: 31 },
];
const TREND_MAX = Math.max(...TREND.map((t) => t.e + t.a + t.p));

// ── 매출 구성(도넛) ──
const COMPOSITION = [
  { label: "엔진 구독", value: "$114,240", pct: 62, hex: "#1f9d55", dot: "bg-green-500" },
  { label: "연회비", value: "$38,690", pct: 21, hex: "#7c3aed", dot: "bg-crypto" },
  { label: "상품", value: "$31,330", pct: 17, hex: "#d97706", dot: "bg-warning" },
];

// ── 결제 네트워크별 매출 ──
const NETWORKS = [
  { label: "TRC20", sub: "Tron", value: "$96,840", pct: 52, color: "bg-green-500" },
  { label: "ERC20", sub: "Ethereum", value: "$48,210", pct: 26, color: "bg-green-300" },
  { label: "Polygon", sub: "Polygon", value: "$27,560", pct: 15, color: "bg-crypto" },
  { label: "BSC", sub: "BNB Chain", value: "$11,550", pct: 7, color: "bg-n-300" },
];

// ── 상품별 매출 ──
const PRODUCTS = [
  { name: "Alpha Engine 구독", price: "$120 / 월", dot: "bg-green-500", count: "952건", avg: "$120.0", value: "$114,240", pct: 62, delta: 8.2 },
  { name: "마케터 연회비", price: "$200 / 년", dot: "bg-crypto", count: "193건", avg: "$200.0", value: "$38,690", pct: 21, delta: 3.4 },
  { name: "크립토카드", price: "$300 · 일회성", dot: "bg-info", count: "64건", avg: "$300.0", value: "$19,200", pct: 10, delta: 5.0 },
  { name: "기타 수수료", price: "변동", dot: "bg-warning", count: "—", avg: "—", value: "$8,930", pct: 5, delta: -3.9 },
  { name: "기타 상품", price: "변동", dot: "bg-n-400", count: "41건", avg: "$78.0", value: "$3,200", pct: 2, delta: 1.0 },
];

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return <span className="text-[11px] font-medium text-text-tertiary">{label}</span>;
  }
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", up ? "text-positive" : "text-negative")}>
      {up ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
      {up ? "+" : ""}{value.toFixed(1)}%
      <span className="font-medium text-text-tertiary">{label}</span>
    </span>
  );
}

export default function AdminRevenuePage() {
  return (
    <>
      <Topbar title="매출현황" sub="Alpha Engine · 수익 분석 · USDT" uid="운영자" />

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
              <Delta value={k.delta} label={k.deltaLabel} />
            </div>
          ))}
        </section>

        {/* ── 당월 매출 배분 ── */}
        <Panel
          title="당월 매출 배분"
          sub="순매출 1차 배분 · USDT"
          action={<Pill tone="green">합계 100%</Pill>}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex flex-col justify-center rounded-lg bg-feature px-6 py-5 text-white lg:w-60">
              <div className="text-xs font-medium text-white/60">당월 매출 (총액)</div>
              <div className="mt-1.5 text-[32px] leading-none font-bold tabular-nums">$184,260</div>
              <div className="mt-2 text-[11px] text-white/45">2026년 6월 · 100%</div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
              {ALLOC.map((a) => (
                <div key={a.label} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">{a.label}</span>
                    <span className={cn("text-xs font-bold", a.soft)}>{a.pct}%</span>
                  </div>
                  <div className="mt-2 text-lg font-bold tabular-nums text-text-primary">{a.value}</div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", a.color)} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ── 매출 추이 + 매출 구성 ── */}
        <div className="grid gap-[18px] lg:grid-cols-[1fr_388px]">
          <Panel
            title="매출 추이"
            sub="최근 12개월 · 항목별 (USDT)"
            action={
              <div className="flex items-center gap-2">
                <div className="flex gap-1 rounded-md bg-surface-muted p-1 text-[12px] ring-1 ring-border">
                  {["일", "주", "월"].map((t, i) => (
                    <span key={t} className={cn("rounded px-2.5 py-1", i === 2 ? "bg-card font-semibold text-text-primary shadow-sm" : "text-text-secondary")}>{t}</span>
                  ))}
                </div>
                <span className="rounded-md bg-surface-muted px-2.5 py-1.5 text-[12px] font-medium text-text-secondary ring-1 ring-border">2026년</span>
              </div>
            }
          >
            {/* 범례 */}
            <div className="mb-4 flex items-center gap-4">
              {COMPOSITION.map((c) => (
                <span key={c.label} className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
                  <span className={cn("size-2.5 rounded-full", c.dot)} />
                  {c.label}
                </span>
              ))}
            </div>
            {/* 스택 막대 */}
            <div className="flex h-52 items-end gap-2">
              {TREND.map((t, i) => {
                const total = t.e + t.a + t.p;
                const last = i === TREND.length - 1;
                return (
                  <div key={t.m} className="flex h-full flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full flex-1 flex-col justify-end">
                      <div
                        className={cn("flex w-full flex-col justify-end overflow-hidden rounded-t", last && "ring-2 ring-green-500/30")}
                        style={{ height: `${(total / TREND_MAX) * 100}%` }}
                      >
                        <div className="bg-warning" style={{ height: `${(t.p / total) * 100}%` }} />
                        <div className="bg-crypto" style={{ height: `${(t.a / total) * 100}%` }} />
                        <div className={cn(last ? "bg-green-600" : "bg-green-500")} style={{ height: `${(t.e / total) * 100}%` }} />
                      </div>
                    </div>
                    <span className={cn("text-[10px]", last ? "font-semibold text-text-secondary" : "text-text-tertiary")}>{last ? "이번달" : `${t.m}월`}</span>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="매출 구성" sub="당월 · 2026년 6월">
            <div className="flex flex-col items-center gap-5">
              <div
                className="relative grid size-44 place-items-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#1f9d55 0% 62%, #7c3aed 62% 83%, #d97706 83% 100%)",
                }}
              >
                <div className="grid size-28 place-items-center rounded-full bg-card text-center">
                  <div>
                    <div className="text-[22px] font-bold tabular-nums text-text-primary">$184K</div>
                    <div className="text-[11px] text-text-tertiary">당월 매출</div>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-2.5">
                {COMPOSITION.map((c) => (
                  <div key={c.label} className="flex items-center gap-2.5">
                    <span className={cn("size-2.5 rounded-full", c.dot)} />
                    <span className="flex-1 text-[13px] font-medium text-text-secondary">{c.label}</span>
                    <span className="text-[13px] font-bold tabular-nums text-text-primary">{c.value}</span>
                    <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── 반복매출(MRR) + 결제 네트워크별 매출 ── */}
        <div className="grid gap-[18px] lg:grid-cols-2">
          <Panel title="반복매출 (MRR)" sub="구독 기반 월반복 매출 · USDT">
            <div className="flex items-end justify-between">
              <div className="text-[34px] leading-none font-bold tabular-nums text-text-primary">$114,240</div>
              <span className="pb-1 text-[13px] font-semibold text-text-tertiary">ARR $1.37M</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { l: "갱신율", v: "92.4%", tone: "text-positive", s: "구독 유지" },
                { l: "신규 (net)", v: "+14건", tone: "text-text-primary", s: "당월 순증" },
                { l: "이탈률 (churn)", v: "7.6%", tone: "text-negative", s: "당월 해지" },
              ].map((x) => (
                <div key={x.l} className="rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                  <div className="text-[11px] font-medium text-text-tertiary">{x.l}</div>
                  <div className={cn("mt-1.5 text-xl font-bold tabular-nums", x.tone)}>{x.v}</div>
                  <div className="mt-0.5 text-[11px] text-text-tertiary">{x.s}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="결제 네트워크별 매출" sub="당월 · 온체인 수신 기준">
            <div className="space-y-3.5">
              {NETWORKS.map((n) => (
                <div key={n.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <div className="text-[13px] font-semibold text-text-primary">{n.label}</div>
                    <div className="text-[11px] text-text-tertiary">{n.sub}</div>
                  </div>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", n.color)} style={{ width: `${n.pct}%` }} />
                  </div>
                  <span className="w-20 text-right text-[13px] font-bold tabular-nums text-text-primary">{n.value}</span>
                  <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{n.pct}%</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── 상품별 매출 ── */}
        <Panel
          title="상품별 매출"
          sub="2026년 6월 · 결제수단 USDT"
          action={
            <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">
              <DownloadIcon className="size-4" /> CSV 내보내기
            </button>
          }
          bodyClassName="overflow-x-auto"
        >
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_2.4fr_1fr] gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
              <span>상품</span>
              <span className="text-right">건수</span>
              <span className="text-right">평균 결제액</span>
              <span>매출 · 점유율</span>
              <span className="text-right">전월 대비</span>
            </div>
            {PRODUCTS.map((p) => (
              <div key={p.name} className="grid grid-cols-[2fr_1fr_1fr_2.4fr_1fr] items-center gap-3 border-b py-3.5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={cn("size-8 shrink-0 rounded-[10px]", p.dot, "opacity-90")} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{p.name}</div>
                    <div className="text-[11px] text-text-tertiary">{p.price}</div>
                  </div>
                </div>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{p.count}</span>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{p.avg}</span>
                <div className="flex items-center gap-2.5">
                  <span className="w-16 text-[13px] font-bold tabular-nums text-text-primary">{p.value}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-n-100">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${p.pct}%` }} />
                  </div>
                  <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{p.pct}%</span>
                </div>
                <span className="flex items-center justify-end">
                  <span className={cn("inline-flex items-center gap-0.5 text-[13px] font-semibold", p.delta >= 0 ? "text-positive" : "text-negative")}>
                    {p.delta >= 0 ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
                    {p.delta >= 0 ? "+" : ""}{p.delta.toFixed(1)}%
                  </span>
                </span>
              </div>
            ))}
            <div className="grid grid-cols-[2fr_1fr_1fr_2.4fr_1fr] items-center gap-3 pt-3.5 text-[13px] font-bold text-text-primary">
              <span>합계</span>
              <span className="text-right tabular-nums text-text-secondary">1,250건</span>
              <span className="text-right tabular-nums text-text-secondary">$148.6</span>
              <span className="tabular-nums">${MONTH_TOTAL.toLocaleString()}</span>
              <span className="text-right tabular-nums text-text-tertiary">100%</span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  CalendarCheckIcon,
  DollarSignIcon,
  SigmaIcon,
  ReceiptIcon,
  ClockIcon,
  TriangleAlertIcon,
  ExternalLinkIcon,
  CheckIcon,
  SlidersHorizontalIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpRightIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 입금내역 — Pencil 디자인(XCDfU) 1:1. 온체인 입금 원장.
const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-n-100 text-n-500",
};

const KPIS = [
  { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 입금", value: "$8,940", delta: 6.2, deltaLabel: "· 42건" },
  { icon: DollarSignIcon, tone: "green" as const, label: "당월 입금 총액", value: "$184,260", delta: 12.4, deltaLabel: "vs 전월" },
  { icon: SigmaIcon, tone: "neutral" as const, label: "누적 입금 (전체)", value: "$2.42M", delta: null, info: "전체 기간" },
  { icon: ReceiptIcon, tone: "info" as const, label: "입금 건수", value: "1,250건", delta: 8.2, deltaLabel: "vs 전월" },
  { icon: ClockIcon, tone: "crypto" as const, label: "평균 확인 시간", value: "1.4분", delta: null, info: "TRC20 기준" },
  { icon: TriangleAlertIcon, tone: "warning" as const, label: "대기·미확인", value: "6건", delta: null, info: "확인 대기 중", warn: true },
];

const TABS = ["전체", "엔진 구독", "연회비", "상품"];

const NET_DOT: Record<string, string> = {
  TRC20: "bg-green-500",
  ERC20: "bg-info",
  Polygon: "bg-crypto",
  BSC: "bg-warning",
};

type Status = "completed" | "confirming" | "failed";
const ROWS: {
  time: string; uid: string; item: string; itemTone: string; amount: string; net: string; hash: string; status: Status; conf: string;
}[] = [
  { time: "06-16 14:32", uid: "FT-8F3A21", item: "엔진 구독", itemTone: "bg-green-500", amount: "$120", net: "TRC20", hash: "0x7a3f…e21b", status: "completed", conf: "19/19" },
  { time: "06-16 13:58", uid: "FT-2B91C0", item: "연회비", itemTone: "bg-crypto", amount: "$200", net: "TRC20", hash: "0x14c8…9af0", status: "completed", conf: "19/19" },
  { time: "06-16 13:21", uid: "FT-77D4E2", item: "크립토카드", itemTone: "bg-info", amount: "$300", net: "ERC20", hash: "0x9820…3d7c", status: "confirming", conf: "6/12" },
  { time: "06-16 12:47", uid: "FT-19A0FF", item: "엔진 구독", itemTone: "bg-green-500", amount: "$120", net: "Polygon", hash: "0x5e1d…77aa", status: "completed", conf: "50/50" },
  { time: "06-16 12:05", uid: "FT-5C32B8", item: "엔진 구독", itemTone: "bg-green-500", amount: "$120", net: "TRC20", hash: "0x2b20…1b3e", status: "completed", conf: "19/19" },
  { time: "06-16 11:33", uid: "FT-A1B2C3", item: "연회비", itemTone: "bg-crypto", amount: "$200", net: "BSC", hash: "0x7ffa…c401", status: "confirming", conf: "5/15" },
  { time: "06-16 10:58", uid: "FT-6E7F88", item: "엔진 구독", itemTone: "bg-green-500", amount: "$120", net: "TRC20", hash: "0x3a0e…ff29", status: "completed", conf: "19/19" },
  { time: "06-16 10:12", uid: "FT-D33C19", item: "크립토카드", itemTone: "bg-info", amount: "$300", net: "ERC20", hash: "0xe471…0b8d", status: "failed", conf: "—" },
];

const COLS = "grid-cols-[96px_1.4fr_1fr_1.1fr_1.2fr_150px]";

function StatusCell({ status, conf }: { status: Status; conf: string }) {
  if (status === "completed")
    return (
      <span className="flex items-center justify-end gap-2">
        <Pill tone="green" dot>확인 완료</Pill>
        <span className="text-[11px] tabular-nums text-text-tertiary">{conf}</span>
      </span>
    );
  if (status === "confirming")
    return (
      <span className="flex items-center justify-end gap-2">
        <Pill tone="warning">확인중</Pill>
        <span className="text-[11px] tabular-nums text-text-tertiary">{conf}</span>
      </span>
    );
  return (
    <span className="flex justify-end">
      <Pill tone="negative">실패</Pill>
    </span>
  );
}

export default function AdminDepositsPage() {
  return (
    <>
      <Topbar title="입금내역" sub="운영 지급 USDT 입금 · 구독료 · 연회비 · 상품대금" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 상단 KPI 6종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}>
                  <k.icon className="size-[18px]" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[22px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              {k.delta !== null && k.delta !== undefined ? (
                <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", k.delta >= 0 ? "text-positive" : "text-negative")}>
                  <ArrowUpRightIcon className="size-3" />
                  +{k.delta.toFixed(1)}%
                  <span className="font-medium text-text-tertiary">{k.deltaLabel}</span>
                </span>
              ) : (
                <span className={cn("text-[11px] font-medium", "warn" in k && k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
              )}
            </div>
          ))}
        </section>

        {/* ── 입금 원장 ── */}
        <Panel bodyClassName="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">2026년 6월 <ChevronRightIcon className="size-3.5 rotate-90 text-text-tertiary" /></span>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><SlidersHorizontalIcon className="size-4" /> 필터</button>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
            </div>
          </div>

          <div className="min-w-[820px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>일시</span>
              <span>회원</span>
              <span>항목</span>
              <span>금액 · 네트워크</span>
              <span>TxHash</span>
              <span className="text-right">확인 상태</span>
            </div>
            {ROWS.map((r, i) => (
              <div key={i} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS)}>
                <span className="text-[12px] tabular-nums text-text-tertiary">{r.time}</span>
                <div className="flex items-center gap-2.5">
                  <span className="size-7 shrink-0 rounded-full bg-n-100" />
                  <span className="truncate text-[13px] font-semibold text-text-primary">{r.uid}</span>
                </div>
                <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                  <span className={cn("size-2.5 shrink-0 rounded-[4px]", r.itemTone)} />
                  {r.item}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-bold tabular-nums text-green-700">{r.amount}</span>
                  <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                    <span className={cn("size-1.5 rounded-full", NET_DOT[r.net] ?? "bg-n-400")} />
                    {r.net}
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-text-tertiary">
                  {r.hash}
                  <ExternalLinkIcon className="size-3 text-n-400" />
                </span>
                <StatusCell status={r.status} conf={r.conf} />
              </div>
            ))}
          </div>

          {/* ── 페이지네이션 ── */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">1–8 / 1,250건</span>
            <div className="flex items-center gap-1">
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronLeftIcon className="size-4" /></button>
              {[1, 2, 3].map((p) => (
                <button key={p} className={cn("grid size-8 place-items-center rounded-md text-[13px] font-semibold", p === 1 ? "bg-green-500 text-white" : "text-text-secondary ring-1 ring-border")}>{p}</button>
              ))}
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronRightIcon className="size-4" /></button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

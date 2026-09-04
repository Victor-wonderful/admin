import {
  CalendarCheckIcon,
  ArrowLeftRightIcon,
  SigmaIcon,
  FuelIcon,
  TriangleAlertIcon,
  ExternalLinkIcon,
  DownloadIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 트랜잭션 — Pencil 디자인(zJRCh) 1:1. 온체인 입·출금 통합 원장.
const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  negative: "bg-negative-soft text-negative",
  neutral: "bg-n-100 text-n-500",
};

const KPIS = [
  { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 거래", value: "70건", info: "입금 42 · 출금 28" },
  { icon: ArrowLeftRightIcon, tone: "info" as const, label: "당월 거래량", value: "$237,170", info: "1,662건" },
  { icon: SigmaIcon, tone: "neutral" as const, label: "누적 거래 (전체)", value: "$3.10M", info: "전체 기간" },
  { icon: FuelIcon, tone: "crypto" as const, label: "평균 네트워크 수수료", value: "$1.20", info: "가스비 평균" },
  { icon: TriangleAlertIcon, tone: "negative" as const, label: "실패·재시도", value: "9건", info: "재시도 대기", warn: true },
];

const TABS = ["전체", "입금", "출금", "실패"];

const NET_DOT: Record<string, string> = {
  TRC20: "bg-green-500",
  ERC20: "bg-info",
  Polygon: "bg-crypto",
  BSC: "bg-warning",
};

type Dir = "in" | "out";
type Status = "completed" | "confirming" | "failed";
const STATE: Record<Status, { label: string; tone: "green" | "warning" | "negative" }> = {
  completed: { label: "완료", tone: "green" },
  confirming: { label: "확인중", tone: "warning" },
  failed: { label: "실패", tone: "negative" },
};

const ROWS: {
  time: string; dir: Dir; label: string; uid: string; amount: string; net: string; hash: string; conf: string; status: Status;
}[] = [
  { time: "14:40", dir: "in", label: "입금", uid: "FT-8F3A21", amount: "$120", net: "TRC20", hash: "0x7a3f…e21b", conf: "19/19", status: "completed" },
  { time: "14:32", dir: "out", label: "출금", uid: "FT-2B91C0", amount: "$880", net: "TRC20", hash: "0x14c8…9af0", conf: "19/19", status: "completed" },
  { time: "14:02", dir: "in", label: "입금", uid: "FT-77D4E2", amount: "$200", net: "TRC20", hash: "0x9820…3d7c", conf: "19/19", status: "completed" },
  { time: "13:30", dir: "out", label: "출금", uid: "FT-19A0FF", amount: "$640", net: "ERC20", hash: "0x5e1d…77aa", conf: "8/12", status: "confirming" },
  { time: "12:50", dir: "in", label: "입금", uid: "FT-5C32B8", amount: "$300", net: "ERC20", hash: "0x9b20…1b3e", conf: "19/19", status: "completed" },
  { time: "12:10", dir: "in", label: "입금", uid: "FT-A1B2C3", amount: "$120", net: "Polygon", hash: "0x7ffa…c401", conf: "50/50", status: "completed" },
  { time: "11:25", dir: "out", label: "출금", uid: "FT-6E7F88", amount: "$520", net: "Polygon", hash: "0x3a0e…ff29", conf: "50/50", status: "completed" },
  { time: "10:40", dir: "out", label: "출금", uid: "FT-D33C19", amount: "$300", net: "ERC20", hash: "0xe471…0b8d", conf: "—", status: "failed" },
  { time: "10:12", dir: "in", label: "입금", uid: "FT-5F8B02", amount: "$120", net: "TRC20", hash: "0x6c91…a3d2", conf: "19/19", status: "completed" },
];

const COLS = "grid-cols-[64px_72px_1.3fr_1.2fr_1.1fr_64px_104px]";

export default function AdminTransactionsPage() {
  return (
    <>
      <Topbar title="트랜잭션" sub="온체인 입·출금 통합 원장 · USDT" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 상단 KPI 5종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}>
                  <k.icon className="size-[18px]" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[24px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              <span className={cn("text-[11px] font-medium", "warn" in k && k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
            </div>
          ))}
        </section>

        {/* ── 온체인 통합 원장 ── */}
        <Panel bodyClassName="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">전체 네트워크 <ChevronDownIcon className="size-3.5 text-text-tertiary" /></span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">2026년 6월 <ChevronDownIcon className="size-3.5 text-text-tertiary" /></span>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
            </div>
          </div>

          <div className="min-w-[880px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>일시</span>
              <span>유형</span>
              <span>회원</span>
              <span>금액 · 네트워크</span>
              <span>TxHash</span>
              <span className="text-right">확인</span>
              <span className="text-right">상태</span>
            </div>
            {ROWS.map((r, i) => {
              const st = STATE[r.status];
              return (
                <div key={i} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS)}>
                  <span className="text-[12px] tabular-nums text-text-tertiary">{r.time}</span>
                  <span>
                    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold", r.dir === "in" ? "bg-green-50 text-green-700" : "bg-info-soft text-info")}>{r.label}</span>
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="size-7 shrink-0 rounded-full bg-n-100" />
                    <span className="truncate text-[13px] font-semibold text-text-primary">{r.uid}</span>
                  </div>
                  <span className="flex items-center gap-2.5">
                    <span className={cn("text-[13px] font-bold tabular-nums", r.dir === "in" ? "text-positive" : "text-text-primary")}>
                      {r.dir === "in" ? "+" : "−"}{r.amount}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
                      <span className={cn("size-1.5 rounded-full", NET_DOT[r.net] ?? "bg-n-400")} />
                      {r.net}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-text-tertiary">
                    {r.hash}
                    <ExternalLinkIcon className="size-3 text-n-400" />
                  </span>
                  <span className="text-right text-[12px] tabular-nums text-text-tertiary">{r.conf}</span>
                  <span className="flex justify-end"><Pill tone={st.tone} dot={r.status === "completed"}>{st.label}</Pill></span>
                </div>
              );
            })}
          </div>

          {/* ── 페이지네이션 ── */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">1–9 / 1,662건</span>
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

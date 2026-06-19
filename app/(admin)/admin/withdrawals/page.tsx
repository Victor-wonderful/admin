import {
  CalendarCheckIcon,
  DollarSignIcon,
  SigmaIcon,
  ClockIcon,
  SendIcon,
  WalletIcon,
  CopyIcon,
  ExternalLinkIcon,
  CheckIcon,
  CheckCheckIcon,
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

// 출금내역 — Pencil 디자인(N0ANb) 1:1. 마케터 출금 승인 큐.
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
  { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 출금", value: "$6,210", delta: 3.1, deltaLabel: "· 28건" },
  { icon: DollarSignIcon, tone: "green" as const, label: "당월 출금 총액", value: "$52,910", delta: 9.4, deltaLabel: "vs 전월" },
  { icon: SigmaIcon, tone: "neutral" as const, label: "누적 출금 (전체)", value: "$684K", delta: null, info: "전체 기간" },
  { icon: ClockIcon, tone: "warning" as const, label: "승인 대기", value: "$16,430", delta: null, info: "12건 대기", warn: true },
  { icon: SendIcon, tone: "info" as const, label: "송금 중", value: "$3,180", delta: null, info: "3건 처리중" },
  { icon: WalletIcon, tone: "green" as const, label: "출금 가능 잔액", value: "$128,400", delta: null, info: "운영 지갑" },
];

const TABS = ["전체", "승인 대기", "처리 중", "완료", "반려"];

const NET_DOT: Record<string, string> = {
  TRC20: "bg-green-500",
  ERC20: "bg-info",
  Polygon: "bg-crypto",
  BSC: "bg-warning",
};

type Status = "pending" | "sending" | "completed" | "rejected";
const STATE: Record<Status, { label: string; tone: "warning" | "info" | "green" | "negative" }> = {
  pending: { label: "승인 대기", tone: "warning" },
  sending: { label: "송금 중", tone: "info" },
  completed: { label: "완료", tone: "green" },
  rejected: { label: "반려", tone: "negative" },
};

const ROWS: {
  time: string; uid: string; amount: string; addr: string; net: string; status: Status; ref?: string;
}[] = [
  { time: "06-16 14:40", uid: "AG-8F3A21", amount: "$1,240", addr: "0x7f9k…8fA2", net: "TRC20", status: "pending" },
  { time: "06-16 14:02", uid: "AG-2B91C0", amount: "$880", addr: "0x22xj…0bQ1", net: "TRC20", status: "pending" },
  { time: "06-16 13:30", uid: "AG-77D4E2", amount: "$640", addr: "0x5e1d…77aa", net: "ERC20", status: "sending", ref: "서명·브로드캐스트" },
  { time: "06-16 12:50", uid: "AG-19A0FF", amount: "$520", addr: "0x920a…1b3e", net: "Polygon", status: "completed", ref: "0x920a…1b3e" },
  { time: "06-16 12:10", uid: "AG-5C32B8", amount: "$410", addr: "0x14c8…c401", net: "TRC20", status: "completed", ref: "0x14c8…9af0" },
  { time: "06-16 11:25", uid: "AG-A1B2C3", amount: "$300", addr: "0x20ab…3d7c", net: "TRC20", status: "rejected", ref: "주소 미검증" },
  { time: "06-16 10:40", uid: "AG-6E7F88", amount: "$260", addr: "0x77fa…ff29", net: "BSC", status: "completed", ref: "0x77fa…c401" },
];

const COLS = "grid-cols-[100px_1.2fr_1.7fr_92px_112px_168px]";

function ActionCell({ status, refText }: { status: Status; refText?: string }) {
  if (status === "pending")
    return (
      <span className="flex justify-end gap-1.5">
        <button className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white"><CheckIcon className="size-3.5" /> 승인</button>
        <button className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-negative ring-1 ring-negative-soft">반려</button>
      </span>
    );
  if (status === "completed")
    return (
      <span className="flex items-center justify-end gap-1.5 text-[12px] tabular-nums text-text-tertiary">
        {refText}
        <ExternalLinkIcon className="size-3 text-n-400" />
      </span>
    );
  return <span className="flex justify-end text-[12px] text-text-tertiary">{refText}</span>;
}

export default function AdminWithdrawalsPage() {
  return (
    <>
      <Topbar title="출금내역" sub="마케터 출금 신청 · 승인 · 온체인 송금 (USDT)" uid="운영자" />

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

        {/* ── 출금 승인 큐 ── */}
        <Panel bodyClassName="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">2026년 6월 <ChevronRightIcon className="size-3.5 rotate-90 text-text-tertiary" /></span>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3 py-2 text-[13px] font-semibold text-white"><CheckCheckIcon className="size-4" /> 선택 일괄 승인</button>
            </div>
          </div>

          <div className="min-w-[860px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>신청일시</span>
              <span>회원</span>
              <span>신청 금액 · 출금 주소</span>
              <span>네트워크</span>
              <span>상태</span>
              <span className="text-right">처리</span>
            </div>
            {ROWS.map((r, i) => {
              const st = STATE[r.status];
              return (
                <div key={i} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS)}>
                  <span className="text-[12px] tabular-nums text-text-tertiary">{r.time}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="size-7 shrink-0 rounded-full bg-n-100" />
                    <span className="truncate text-[13px] font-semibold text-text-primary">{r.uid}</span>
                  </div>
                  <span className="flex items-center gap-2.5">
                    <span className="text-[13px] font-bold tabular-nums text-text-primary">{r.amount}</span>
                    <span className="flex items-center gap-1 text-[12px] tabular-nums text-text-tertiary">
                      {r.addr}
                      <CopyIcon className="size-3 text-n-400" />
                    </span>
                  </span>
                  <span className="flex items-center gap-1 text-[12px] text-text-tertiary">
                    <span className={cn("size-1.5 rounded-full", NET_DOT[r.net] ?? "bg-n-400")} />
                    {r.net}
                  </span>
                  <span><Pill tone={st.tone} dot={r.status === "completed"}>{st.label}</Pill></span>
                  <ActionCell status={r.status} refText={r.ref} />
                </div>
              );
            })}
          </div>

          {/* ── 페이지네이션 ── */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">1–7 / 412건</span>
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

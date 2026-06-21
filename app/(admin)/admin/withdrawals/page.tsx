import {
  CalendarCheckIcon,
  DollarSignIcon,
  SigmaIcon,
  ClockIcon,
  SendIcon,
  WalletIcon,
  CopyIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { WithdrawalActions } from "@/components/withdrawals/withdrawal-actions";
import { listWithdrawals, getWithdrawalSummary } from "@/lib/queries/finance";
import { toUid, uidInitials } from "@/lib/uid";
import { cn } from "@/lib/utils";
import type { WithdrawalStatus } from "@/lib/actions/withdrawals";

export const dynamic = "force-dynamic";

const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-n-100 text-n-500",
};

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : usd(n));

const NET_DOT: Record<string, string> = {
  TRC20: "bg-green-500",
  ERC20: "bg-info",
  Polygon: "bg-crypto",
  BSC: "bg-warning",
};

const STATE: Record<WithdrawalStatus, { label: string; tone: "warning" | "info" | "green" | "negative" | "neutral" }> = {
  pending: { label: "승인 대기", tone: "warning" },
  approved: { label: "승인됨", tone: "info" },
  sending: { label: "송금 중", tone: "info" },
  completed: { label: "완료", tone: "green" },
  rejected: { label: "반려", tone: "negative" },
};

const COLS = "grid-cols-[110px_1.2fr_1.7fr_92px_112px_188px]";

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default async function AdminWithdrawalsPage() {
  const [rows, sum] = await Promise.all([listWithdrawals(20), getWithdrawalSummary()]);

  const KPIS = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당월 완료 출금", value: compact(sum.completedMonthAmount), info: "2026-06" },
    { icon: DollarSignIcon, tone: "green" as const, label: "누적 출금 (완료)", value: compact(sum.completedTotalAmount), info: "전체 기간" },
    { icon: SigmaIcon, tone: "neutral" as const, label: "총 신청 건수", value: `${rows.length}`, info: "최근 표시분" },
    { icon: ClockIcon, tone: "warning" as const, label: "승인 대기", value: compact(sum.pendingAmount), info: `${sum.pendingCount}건 대기`, warn: true },
    { icon: SendIcon, tone: "info" as const, label: "송금 중", value: compact(sum.sendingAmount), info: `${sum.sendingCount}건 처리중` },
    { icon: WalletIcon, tone: "green" as const, label: "출금 가능 잔액", value: compact(sum.operatingBalance), info: "운영 지갑" },
  ];

  return (
    <>
      <Topbar title="출금내역" sub="마케터 출금 신청 · 승인 · 온체인 송금 (USDT)" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 상단 KPI 6종 (실데이터) ── */}
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
              <span className={cn("text-[11px] font-medium", "warn" in k && k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
            </div>
          ))}
        </section>

        {/* ── 출금 승인 큐 (실데이터 + 작동 버튼) ── */}
        <Panel bodyClassName="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-bold text-text-primary">출금 승인 큐 · 최근 {rows.length}건</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">2026년 6월</span>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
            </div>
          </div>

          <div className="min-w-[900px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>신청일시</span>
              <span>회원</span>
              <span>신청 금액 · 출금 주소</span>
              <span>네트워크</span>
              <span>상태</span>
              <span className="text-right">처리</span>
            </div>
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-tertiary">출금 신청이 없습니다.</div>
            ) : (
              rows.map((r) => {
                const status = r.status as WithdrawalStatus;
                const st = STATE[status] ?? STATE.pending;
                return (
                  <div key={r.id} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS)}>
                    <span className="text-[12px] tabular-nums text-text-tertiary">{fmtTime(r.requested_at)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">{uidInitials(r.member_id)}</span>
                      <span className="truncate text-[13px] font-semibold text-text-primary">{toUid(r.member_id)}</span>
                    </div>
                    <span className="flex items-center gap-2.5">
                      <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd(r.amount_usd)}</span>
                      <span className="flex items-center gap-1 text-[12px] tabular-nums text-text-tertiary">
                        {shortAddr(r.to_address)}
                        <CopyIcon className="size-3 text-n-400" />
                      </span>
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-text-tertiary">
                      <span className={cn("size-1.5 rounded-full", NET_DOT[r.network] ?? "bg-n-400")} />
                      {r.network}
                    </span>
                    <span><Pill tone={st.tone} dot={status === "completed"}>{st.label}</Pill></span>
                    <WithdrawalActions id={r.id} status={status} txHash={r.tx_hash} />
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">최근 {rows.length}건 표시</span>
            <div className="flex items-center gap-1">
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border" disabled><ChevronLeftIcon className="size-4" /></button>
              <button className="grid size-8 place-items-center rounded-md bg-green-500 text-[13px] font-semibold text-white">1</button>
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border" disabled><ChevronRightIcon className="size-4" /></button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

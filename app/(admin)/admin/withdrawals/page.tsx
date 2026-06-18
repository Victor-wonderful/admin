import {
  ArrowUpFromLineIcon,
  SigmaIcon,
  ClockIcon,
  SendIcon,
  CircleCheckIcon,
  WalletIcon,
  HashIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { toUid } from "@/lib/uid";
import { getWithdrawalStats, listWithdrawals } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

const TABS = ["전체", "승인 대기", "처리중", "완료", "반려"];

const STATE: Record<string, { label: string; tone: "warning" | "info" | "green" | "negative" }> = {
  pending: { label: "승인 대기", tone: "warning" },
  approved: { label: "승인", tone: "info" },
  sending: { label: "송금 중", tone: "info" },
  completed: { label: "완료", tone: "green" },
  rejected: { label: "반려", tone: "negative" },
};

export default async function AdminWithdrawalsPage() {
  const [stats, rows] = await Promise.all([getWithdrawalStats(), listWithdrawals(12)]);

  const kpis = [
    { icon: ArrowUpFromLineIcon, tone: "info" as const, label: "당월 출금", value: usd(stats.monthSum) },
    { icon: SigmaIcon, tone: "neutral" as const, label: "누적 출금", value: usd(stats.monthSum) },
    { icon: ClockIcon, tone: "warning" as const, label: "승인 대기", value: `${stats.pending}건` },
    { icon: SendIcon, tone: "info" as const, label: "송금 중", value: `${stats.sending}건` },
    { icon: CircleCheckIcon, tone: "green" as const, label: "완료", value: `${stats.completed}건` },
    { icon: WalletIcon, tone: "green" as const, label: "출금가능 잔액", value: "$77,040" },
  ];

  return (
    <>
      <Topbar title="출금내역" sub="마케터 수당 온체인 송금 · 승인 큐" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <Panel
          title="출금 승인 큐"
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[auto_1fr_auto_1.1fr_auto_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>신청일시</span><span>회원</span><span>금액</span><span>출금 주소</span><span>네트워크</span><span>상태</span><span className="text-right">처리</span>
            </div>
            {rows.map((r) => {
              const st = STATE[r.status] ?? { label: r.status, tone: "neutral" as const };
              return (
                <div key={r.id} className="grid grid-cols-[auto_1fr_auto_1.1fr_auto_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                  <span className="text-text-tertiary tabular-nums">{r.requested_at.slice(5, 16).replace("T", " ")}</span>
                  <span className="font-semibold text-text-primary">{toUid(r.member_id)}</span>
                  <span className="font-semibold tabular-nums text-text-primary">−{usd(r.amount_usd)}</span>
                  <span className="flex items-center gap-1 text-xs text-text-tertiary"><HashIcon className="size-3" />{r.to_address}</span>
                  <span className="text-xs text-text-tertiary">{r.network}</span>
                  <span><Pill tone={st.tone} dot={r.status === "completed"}>{st.label}</Pill></span>
                  <span className="justify-self-end">
                    {r.status === "pending" ? (
                      <span className="flex gap-1.5">
                        <span className="rounded bg-brand px-2.5 py-1 text-xs font-semibold text-white">승인</span>
                        <span className="rounded px-2.5 py-1 text-xs font-semibold text-negative ring-1 ring-negative-soft">반려</span>
                      </span>
                    ) : (
                      <span className="text-xs text-text-tertiary">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

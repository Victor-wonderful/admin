"use client";

import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import type { LedgerEntry } from "@/lib/queries/finance";
import { toSeoulDateTime } from "@/lib/dates";
import { txExplorerUrl } from "@/lib/chain/explorer";
import { cn } from "@/lib/utils";

type TxType = LedgerEntry["tx_type"];

const META: Record<TxType, { label: string; tone: "green" | "info" | "warning" | "neutral" }> = {
  commission: { label: "리워드", tone: "green" },
  deposit: { label: "입금", tone: "info" },
  payment: { label: "결제", tone: "warning" },
  withdrawal: { label: "출금", tone: "neutral" },
};

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const signed = (n: number) => (n === 0 || n > 0 ? `+${usd(Math.abs(n))}` : `−${usd(Math.abs(n))}`);
const fmtDate = (iso: string) => toSeoulDateTime(iso); // 서울 기준 MM-DD HH:mm

// 입출금 내역 — 탭으로 유형 필터(전체/입금/리워드/결제/출금). 리워드 탭은 파트너에게만.
export function LedgerTable({ ledger, showCommission }: { ledger: LedgerEntry[]; showCommission: boolean }) {
  const tabs: Array<{ key: TxType | "all"; label: string }> = [
    { key: "all", label: "전체" },
    { key: "deposit", label: "입금" },
    ...(showCommission ? [{ key: "commission" as const, label: "리워드" }] : []),
    { key: "payment", label: "결제" },
    { key: "withdrawal", label: "출금" },
  ];
  const [tab, setTab] = React.useState<TxType | "all">("all");
  const rows = tab === "all" ? ledger : ledger.filter((r) => r.tx_type === tab);
  const count = (k: TxType | "all") => (k === "all" ? ledger.length : ledger.filter((r) => r.tx_type === k).length);

  return (
    <Panel
      title={showCommission ? "입출금·리워드 내역" : "입출금 내역"}
      sub={`${rows.length}건`}
      action={
        <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded px-3 py-1.5 text-[13px] transition-colors",
                tab === t.key ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary hover:text-text-primary",
              )}
            >
              {t.label}
              <span className={cn("ml-1 text-[11px] tabular-nums", tab === t.key ? "text-text-tertiary" : "text-text-tertiary/70")}>{count(t.key)}</span>
            </button>
          ))}
        </div>
      }
    >
      <div>
        <div className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
          <span>일시</span><span>유형</span><span>내역</span><span>네트워크</span><span className="text-right">금액</span>
        </div>
        {rows.length === 0 ? (
          <div className="py-8 text-center text-sm text-text-tertiary">
            {tab === "all" ? "거래 내역이 없습니다." : `${tabs.find((t) => t.key === tab)?.label} 내역이 없습니다.`}
          </div>
        ) : (
          rows.map((r, i) => {
            const meta = META[r.tx_type];
            return (
              <div key={`${r.ts}-${i}`} className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{fmtDate(r.ts)}</span>
                <span><Pill tone={meta.tone}>{meta.label}</Pill></span>
                <span className="text-text-secondary">{r.desc}</span>
                {(() => {
                  const url = txExplorerUrl(r.network, r.tx_hash);
                  return url ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" title={r.tx_hash ?? undefined} className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary hover:underline">
                      {r.network} <ExternalLinkIcon className="size-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-text-tertiary">{r.network ?? "—"}</span>
                  );
                })()}
                <span className={cn("text-right font-bold tabular-nums", r.amount_usd >= 0 ? "text-green-700" : "text-text-primary")}>{signed(r.amount_usd)}</span>
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}

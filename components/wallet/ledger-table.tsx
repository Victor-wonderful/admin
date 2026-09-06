"use client";

import * as React from "react";
import { ExternalLinkIcon } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DataList, type DataColumn } from "@/components/ui/data-list";
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

function NetworkCell({ r }: { r: LedgerEntry }) {
  const url = txExplorerUrl(r.network, r.tx_hash);
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={r.tx_hash ?? undefined}
      className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary hover:underline"
    >
      {r.network} <ExternalLinkIcon className="size-3" />
    </a>
  ) : (
    <span className="text-xs text-text-tertiary">{r.network ?? "—"}</span>
  );
}

// 입출금 내역 — 탭으로 유형 필터(전체/입금/리워드/결제/출금). 리워드 탭은 파트너에게만.
// lg 미만에서는 DataList 가 행을 카드로 바꾼다(가로 스크롤 없음).
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

  const columns: DataColumn<LedgerEntry>[] = [
    {
      key: "ts",
      label: "일시",
      mobile: "meta",
      cell: (r) => <span className="text-text-tertiary tabular-nums">{fmtDate(r.ts)}</span>,
    },
    {
      key: "type",
      label: "유형",
      mobile: "meta",
      cell: (r) => <Pill tone={META[r.tx_type].tone}>{META[r.tx_type].label}</Pill>,
    },
    {
      key: "desc",
      label: "내역",
      width: "1fr",
      mobile: "title",
      // 모바일에서는 카드 제목 역할이라 진한 색, 데스크톱 표에서는 기존대로 보조색
      cell: (r) => <span className="text-text-primary lg:text-text-secondary">{r.desc}</span>,
    },
    {
      key: "network",
      label: "네트워크",
      mobile: "meta",
      cell: (r) => <NetworkCell r={r} />,
    },
    {
      key: "amount",
      label: "금액",
      align: "right",
      mobile: "value",
      cell: (r) => (
        <span className={cn("font-bold tabular-nums", r.amount_usd >= 0 ? "text-green-700" : "text-text-primary")}>
          {signed(r.amount_usd)}
        </span>
      ),
    },
  ];

  return (
    <Panel
      title={showCommission ? "입출금·리워드 내역" : "입출금 내역"}
      sub={`${rows.length}건`}
      action={
        // 폰에서는 탭이 넘칠 수 있으므로 가로 스크롤 허용(스크롤바는 숨김)
        <div className="-mx-1 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors lg:px-3",
                  tab === t.key ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary hover:text-text-primary",
                )}
              >
                {t.label}
                <span className={cn("ml-1 text-[11px] tabular-nums", tab === t.key ? "text-text-tertiary" : "text-text-tertiary/70")}>{count(t.key)}</span>
              </button>
            ))}
          </div>
        </div>
      }
    >
      <DataList
        columns={columns}
        rows={rows}
        rowKey={(r, i) => `${r.ts}-${i}`}
        empty={tab === "all" ? "거래 내역이 없습니다." : `${tabs.find((t) => t.key === tab)?.label} 내역이 없습니다.`}
      />
    </Panel>
  );
}

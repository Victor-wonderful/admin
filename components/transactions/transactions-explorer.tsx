"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLinkIcon, DownloadIcon, SearchIcon } from "lucide-react";

import type { AdminTx, TxStats } from "@/lib/queries/admin-finance";
import { txExplorerUrl, shortHash } from "@/lib/chain/explorer";
import { toSeoulDateTime } from "@/lib/dates";
import { downloadCsv } from "@/lib/csv";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const TYPE: Record<AdminTx["tx_type"], { label: string; cls: string; sign: "+" | "−" }> = {
  deposit: { label: "입금", cls: "bg-green-50 text-green-700", sign: "+" },
  commission: { label: "리워드", cls: "bg-crypto-soft text-crypto", sign: "+" },
  payment: { label: "결제", cls: "bg-warning-soft text-warning", sign: "−" },
  withdrawal: { label: "출금", cls: "bg-info-soft text-info", sign: "−" },
};
const STATUS: Record<string, { label: string; tone: "green" | "warning" | "negative" | "info" | "neutral" }> = {
  completed: { label: "완료", tone: "green" },
  pending: { label: "대기", tone: "warning" },
  approved: { label: "승인", tone: "info" },
  sending: { label: "송금 중", tone: "info" },
  failed: { label: "실패·환불", tone: "negative" },
};
const NET_DOT: Record<string, string> = { TRC20: "bg-green-500", BEP20: "bg-warning", BSC: "bg-warning" };
const PAGE_SIZE = 12;
const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

// 트랜잭션 탐색기(실데이터) — 지갑 통합 원장(입금·결제·출금·리워드). 온체인 해시는 탐색기 링크.
export function TransactionsExplorer({ rows, stats, cycle }: { rows: AdminTx[]; stats: TxStats; cycle: string }) {
  const [tab, setTab] = React.useState<"all" | AdminTx["tx_type"] | "problem">("all");
  const [month, setMonth] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  // 필터가 바뀌면 1페이지로: 필터 키와 함께 저장해 effect 없이 파생
  const [pageState, setPageState] = React.useState<{ key: string; page: number }>({ key: "", page: 1 });
  const filterKey = `${tab}|${month}|${query.trim().toLowerCase()}`;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const months = React.useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) s.add(toSeoulDateTimeCycle(r.created_at));
    return [...s].sort().reverse();
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab === "problem") { if (!(r.status === "failed" || r.status === "pending" || r.status === "sending")) return false; }
      else if (tab !== "all" && r.tx_type !== tab) return false;
      if (month !== "all" && toSeoulDateTimeCycle(r.created_at) !== month) return false;
      if (q && !r.uid.toLowerCase().includes(q) && !(r.tx_hash ?? "").toLowerCase().includes(q) && !(r.network ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, month, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const TABS: Array<{ key: typeof tab; label: string; count: number }> = [
    { key: "all", label: "전체", count: stats.counts.all },
    { key: "deposit", label: "입금", count: stats.counts.deposit },
    { key: "payment", label: "결제", count: stats.counts.payment },
    { key: "withdrawal", label: "출금", count: stats.counts.withdrawal },
    { key: "commission", label: "리워드", count: stats.counts.commission },
    { key: "problem", label: "대기·실패", count: stats.counts.problem },
  ];
  const exportCsv = () =>
    downloadCsv(`transactions-${cycle}.csv`, ["일시", "유형", "회원 UID", "금액(USDT)", "수수료", "네트워크/내역", "TxHash", "상태"], filtered.map((r) => [toSeoulDateTime(r.created_at), TYPE[r.tx_type].label, r.uid, (TYPE[r.tx_type].sign === "+" ? "" : "-") + r.amount_usd, r.fee_usd, r.network ?? "", r.tx_hash ?? "", STATUS[r.status]?.label ?? r.status]));

  const COLS = "grid-cols-[104px_72px_1.2fr_1.2fr_1.3fr_1.2fr_96px]";
  return (
    <Panel bodyClassName="overflow-x-auto">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)} className={cn("rounded px-3 py-1.5 text-[13px] transition-colors", tab === t.key ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary hover:text-text-primary")}>
              {t.label} <span className="ml-0.5 text-[11px] tabular-nums text-text-tertiary">{t.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-[10px] bg-card px-3 py-2 ring-1 ring-border-strong">
            <SearchIcon className="size-3.5 text-text-tertiary" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="UID · 해시 · 네트워크" className="w-40 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border outline-none">
            <option value="all">전체 기간</option>
            {months.map((m) => <option key={m} value={m}>{m.slice(0, 4)}년 {Number(m.slice(5, 7))}월</option>)}
          </select>
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border disabled:opacity-50"><DownloadIcon className="size-4" /> CSV 내보내기</button>
        </div>
      </div>

      <div className="min-w-[900px]">
        <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
          <span>일시</span><span>유형</span><span>회원</span><span>금액</span><span>네트워크 · 내역</span><span>TxHash</span><span className="text-right">상태</span>
        </div>
        {pageRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">{rows.length === 0 ? "거래가 없습니다." : "조건에 맞는 거래가 없습니다."}</div>
        ) : pageRows.map((r) => {
          const ty = TYPE[r.tx_type]; const st = STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
          const url = txExplorerUrl(r.network, r.tx_hash);
          return (
            <div key={r.id} className={cn("grid items-center gap-3 border-b py-3 text-sm last:border-0", COLS)}>
              <span className="text-[12px] tabular-nums text-text-tertiary">{toSeoulDateTime(r.created_at)}</span>
              <span><span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold", ty.cls)}>{ty.label}</span></span>
              {r.member_id ? <Link href={`/admin/members/${r.member_id}`} className="truncate text-[13px] font-semibold text-text-primary hover:underline">{r.uid}</Link> : <span className="text-[13px] text-text-tertiary">시스템</span>}
              <span className={cn("text-[13px] font-bold tabular-nums", ty.sign === "+" ? "text-positive" : "text-text-primary")}>{ty.sign}{usd(r.amount_usd)}{r.fee_usd > 0 ? <span className="ml-1 text-[11px] font-medium text-text-tertiary">+수수료 {usd(r.fee_usd)}</span> : null}</span>
              <span className="flex items-center gap-1.5 text-[12px] text-text-secondary"><span className={cn("size-1.5 shrink-0 rounded-full", NET_DOT[(r.network ?? "").toUpperCase()] ?? "bg-n-300")} />{r.network ?? "—"}</span>
              {r.tx_hash ? (url ? <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[12px] text-text-tertiary hover:underline">{shortHash(r.tx_hash)} <ExternalLinkIcon className="size-3" /></a> : <span className="font-mono text-[12px] text-text-tertiary">{shortHash(r.tx_hash)}</span>) : <span className="text-[12px] text-text-tertiary">—</span>}
              <span className="flex justify-end"><Pill tone={st.tone} dot={r.status === "completed"}>{st.label}</Pill></span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[12px] text-text-tertiary">{filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length.toLocaleString()}건</span>
        <div className="flex items-center gap-1">
          <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="grid h-8 px-2 place-items-center rounded-md text-text-secondary ring-1 ring-border disabled:opacity-40">‹</button>
          <span className="px-2 text-[12px] tabular-nums text-text-secondary">{safePage} / {totalPages}</span>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="grid h-8 px-2 place-items-center rounded-md text-text-secondary ring-1 ring-border disabled:opacity-40">›</button>
        </div>
      </div>
    </Panel>
  );
}

// 서울 기준 YYYY-MM
function toSeoulDateTimeCycle(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date(iso)).slice(0, 7);
}

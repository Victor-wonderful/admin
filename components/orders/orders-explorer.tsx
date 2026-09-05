"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarCheckIcon,
  CircleArrowDownIcon,
  SigmaIcon,
  BadgeCheckIcon,
  TimerIcon,
  ShoppingCartIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  CalendarRangeIcon,
  CpuIcon,
  SlidersHorizontalIcon,
  DownloadIcon,
  ListFilterIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import type { OrderRow, OrderStats, OrderItemType } from "@/lib/queries/admin-finance";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

// 구독·주문 탐색기(실데이터) — 서버에서 rows/stats 를 받아 클라이언트에서 탭·필터·검색·페이지·CSV.
const ITEM_BADGE: Record<OrderItemType, string> = {
  subscription: "bg-green-50 text-green-700",
  membership: "bg-crypto-soft text-crypto",
  product: "bg-info-soft text-info",
};
const STATUS_LABEL: Record<OrderRow["status"], string> = { active: "이용 중", expired: "만료", completed: "완료", pending: "대기", failed: "실패", refunded: "환불" };
const STATUS_BADGE: Record<OrderRow["status"], string> = {
  active: "bg-green-50 text-green-700",
  completed: "bg-n-100 text-n-600",
  expired: "bg-n-100 text-n-500",
  pending: "bg-warning-soft text-warning",
  failed: "bg-negative-soft text-negative",
  refunded: "bg-negative-soft text-negative",
};
const STATUS_OPTS: Array<{ key: "all" | OrderRow["status"]; label: string }> = [
  { key: "all", label: "전체" }, { key: "active", label: "이용 중" }, { key: "expired", label: "만료" }, { key: "completed", label: "완료" }, { key: "pending", label: "대기" },
];
const PAGE_SIZE = 10;

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const fmtAmount = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
const initials = (uid: string) => (uid.split("·")[1] ?? uid).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
const deltaPct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

export function OrdersExplorer({ rows, stats, cycle }: { rows: OrderRow[]; stats: OrderStats; cycle: string }) {
  const [tab, setTab] = React.useState<"all" | OrderItemType>("all");
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [status, setStatus] = React.useState<"all" | OrderRow["status"]>("all");
  const [query, setQuery] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [minAmt, setMinAmt] = React.useState("");
  const [maxAmt, setMaxAmt] = React.useState("");
  const [pageState, setPageState] = React.useState<{ key: string; page: number }>({ key: "", page: 1 });
  const filterKey = `${tab}|${status}|${query.trim().toLowerCase()}|${from}|${to}|${minAmt}|${maxAmt}`;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const lo = minAmt ? Number(minAmt) : null; const hi = maxAmt ? Number(maxAmt) : null;
    return rows.filter((o) => {
      if (tab !== "all" && o.itemType !== tab) return false;
      if (status !== "all" && o.status !== status) return false;
      if (from && o.date < from) return false;
      if (to && o.date > to) return false;
      if (lo != null && o.amount < lo) return false;
      if (hi != null && o.amount > hi) return false;
      if (q && !o.search.includes(q) && !o.item.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tab, status, query, from, to, minAmt, maxAmt]);


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toN = Math.min(safePage * PAGE_SIZE, filtered.length);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (status !== "all") chips.push({ key: "status", label: `상태: ${STATUS_LABEL[status]}`, clear: () => setStatus("all") });
  if (from || to) chips.push({ key: "date", label: `결제일: ${from || "…"} ~ ${to || "…"}`, clear: () => { setFrom(""); setTo(""); } });
  if (minAmt || maxAmt) chips.push({ key: "amt", label: `금액: ${minAmt || "0"} ~ ${maxAmt || "∞"}`, clear: () => { setMinAmt(""); setMaxAmt(""); } });
  if (query.trim()) chips.push({ key: "q", label: `검색: ${query.trim()}`, clear: () => setQuery("") });
  const resetAll = () => { setStatus("all"); setQuery(""); setFrom(""); setTo(""); setMinAmt(""); setMaxAmt(""); };

  const exportCsv = () =>
    downloadCsv(`orders-${cycle}.csv`, ["결제일", "회원 UID", "닉네임", "이메일", "항목", "금액(USDT)", "상태", "이용 기간"], filtered.map((o) => [o.date, o.uid, o.name, o.email, o.item, o.amount, STATUS_LABEL[o.status], o.period ?? ""]));

  const mDelta = deltaPct(stats.monthAmount, stats.prevMonthAmount);
  const KPIS = [
    { icon: CalendarCheckIcon, badge: "bg-green-50 text-green-700", label: "당일 매출", value: usd(stats.todayAmount), delta: { icon: ArrowRightIcon, text: `${stats.todayCount}건`, tone: "tertiary" as const } },
    { icon: CircleArrowDownIcon, badge: "bg-green-50 text-green-700", label: "당월 매출", value: usd(stats.monthAmount), delta: mDelta == null ? { icon: CalendarRangeIcon, text: `${cycle} · ${stats.monthCount}건`, tone: "tertiary" as const } : { icon: mDelta >= 0 ? ArrowUpRightIcon : ArrowDownRightIcon, text: `${mDelta >= 0 ? "+" : ""}${mDelta.toFixed(1)}% vs 전월`, tone: mDelta >= 0 ? ("positive" as const) : ("negative" as const) } },
    { icon: SigmaIcon, badge: "bg-feature text-n-0", label: "누적 매출", value: usd(stats.totalAmount), delta: { icon: CalendarRangeIcon, text: "서비스 개시 이후", tone: "tertiary" as const } },
    { icon: BadgeCheckIcon, badge: "bg-green-50 text-green-600", label: "활성 구독", value: `${stats.activeSubs.toLocaleString()}명`, delta: { icon: CpuIcon, text: "포르투나 이용 중", tone: "tertiary" as const } },
    { icon: TimerIcon, badge: "bg-warning text-n-0", warning: stats.renewSoon.sub + stats.renewSoon.membership > 0, label: "갱신 임박", value: `${(stats.renewSoon.sub + stats.renewSoon.membership).toLocaleString()}건`, delta: { icon: ArrowRightIcon, text: `구독 7일 내 ${stats.renewSoon.sub} · 멤버십 30일 내 ${stats.renewSoon.membership}`, tone: "accent" as const } },
    { icon: ShoppingCartIcon, badge: "bg-info-soft text-info", label: "당월 주문 건수", value: `${stats.monthCount.toLocaleString()}건`, delta: { icon: CalendarRangeIcon, text: cycle, tone: "tertiary" as const } },
  ];
  const DELTA_CLS = { positive: "text-positive", negative: "text-negative", tertiary: "text-text-tertiary", accent: "text-green-700" };
  const TABS: Array<{ key: "all" | OrderItemType; label: string }> = [
    { key: "all", label: "전체" }, { key: "subscription", label: "포르투나 구독" }, { key: "membership", label: "파트너 멤버십" }, { key: "product", label: "상품" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto bg-canvas p-7">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k) => {
          const Icon = k.icon; const DIcon = k.delta.icon;
          return (
            <div key={k.label} className={cn("flex items-center gap-3 rounded-lg p-4 ring-1 shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]", "warning" in k && k.warning ? "bg-warning-soft ring-warning" : "bg-card ring-border")}>
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", k.badge)}><Icon className="size-5" /></div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-text-secondary">{k.label}</div>
                <div className="text-xl font-bold text-text-primary tabular-nums">{k.value}</div>
                <div className={cn("mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold", DELTA_CLS[k.delta.tone])}><DIcon className="size-3 shrink-0" /> {k.delta.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} className={cn("flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-n-500 hover:text-text-primary")}>
                {t.label}
                <span className={cn("text-[12px] font-semibold tabular-nums", on ? "text-green-600" : "text-n-400")}>{stats.counts[t.key].toLocaleString()}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setPanelOpen((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors", panelOpen ? "bg-green-50 text-green-700 ring-1 ring-green-500" : "bg-card text-text-secondary ring-1 ring-border-strong")}>
            <SlidersHorizontalIcon className="size-3.5" /> 필터{chips.length ? ` ${chips.length}` : ""}
          </button>
          <button onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium text-n-700 ring-1 ring-border-strong disabled:opacity-50">
            <DownloadIcon className="size-3.5" /> CSV 내보내기
          </button>
        </div>
      </div>

      {panelOpen ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-text-primary"><ListFilterIcon className="size-[17px] text-green-700" /> 필터</span>
            <button onClick={resetAll} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"><RotateCcwIcon className="size-3" /> 초기화</button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Field label="상태">
              <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
                {STATUS_OPTS.map((o) => (
                  <button key={o.key} onClick={() => setStatus(o.key)} className={cn("flex-1 rounded-[7px] py-1.5 text-center text-[12px] transition-colors", status === o.key ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-tertiary hover:text-text-secondary")}>{o.label}</button>
                ))}
              </div>
            </Field>
            <Field label="회원 · 항목 검색">
              <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong">
                <SearchIcon className="size-3.5 text-text-tertiary" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="UID · 닉네임 · 이메일 · 상품명" className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
              </div>
            </Field>
            <Field label="결제일">
              <div className="flex items-center gap-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
                <span className="text-text-tertiary">~</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={INPUT} />
              </div>
            </Field>
            <Field label="금액(USDT)">
              <div className="flex items-center gap-2">
                <input inputMode="decimal" value={minAmt} onChange={(e) => setMinAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" className={INPUT} />
                <span className="text-text-tertiary">~</span>
                <input inputMode="decimal" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="제한 없음" className={INPUT} />
              </div>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3.5">
            <span className="text-xs font-medium text-text-tertiary">적용된 필터 {chips.length}개 · 결과 {filtered.length.toLocaleString()}건</span>
            <button onClick={() => setPanelOpen(false)} className="rounded-[10px] bg-green-500 px-4 py-2 text-[13px] font-semibold text-white">닫기</button>
          </div>
        </div>
      ) : null}

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary">적용됨</span>
          {chips.map((c) => (
            <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 py-1 pr-2 pl-3 text-xs font-semibold text-green-700">{c.label} <XIcon className="size-3" /></button>
          ))}
          <button onClick={resetAll} className="text-xs font-medium text-text-tertiary hover:text-text-secondary">모두 지우기</button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl bg-card px-5 pt-2 pb-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
        <div className="grid grid-cols-[minmax(0,1fr)_150px_110px_190px_90px_100px] items-center gap-3 border-b py-3 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
          <span>회원</span><span>항목</span><span>금액</span><span>이용 기간</span><span>상태</span><span>결제일</span>
        </div>
        {pageRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">{rows.length === 0 ? "아직 결제가 없습니다." : "조건에 맞는 주문이 없습니다."}</div>
        ) : (
          pageRows.map((o) => (
            <div key={o.id} className="grid grid-cols-[minmax(0,1fr)_150px_110px_190px_90px_100px] items-center gap-3 border-b py-[11px] text-sm last:border-0">
              <Link href={`/admin/members/${o.member_id}`} className="flex items-center gap-2.5 hover:underline">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-n-100 text-[11px] font-bold text-n-600">{initials(o.uid)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-n-900">{o.uid}{o.name ? <span className="font-medium text-n-500"> · {o.name}</span> : null}</span>
                  <span className="block truncate text-[11px] text-n-400">{o.email}</span>
                </span>
              </Link>
              <span><span className={cn("inline-block truncate rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", ITEM_BADGE[o.itemType])}>{o.item}</span></span>
              <span className="text-[13px] font-bold text-n-900 tabular-nums">{fmtAmount(o.amount)}</span>
              <span className="text-[12px] tabular-nums text-n-500">{o.period ?? "일회성"}</span>
              <span><span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", STATUS_BADGE[o.status])}>{STATUS_LABEL[o.status]}</span></span>
              <span className="text-[12px] tabular-nums text-n-500">{o.date}</span>
            </div>
          ))
        )}
        <div className="flex items-center justify-between pt-3.5">
          <span className="text-xs text-n-400">{fromN.toLocaleString()}–{toN.toLocaleString()} / {filtered.length.toLocaleString()}건 · 결제는 전부 회원 지갑 잔액 차감</span>
          <div className="flex gap-1.5">
            <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</PageBtn>
            {pageNumbers(safePage, totalPages).map((p, i) => p === "…" ? <span key={`e${i}`} className="grid size-[30px] place-items-center text-xs text-n-300">…</span> : <PageBtn key={p} active={p === safePage} onClick={() => setPage(p as number)}>{p}</PageBtn>)}
            <PageBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</PageBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

const INPUT = "w-full rounded-lg bg-card px-3 py-2 text-[13px] text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><span className="text-xs font-semibold text-text-secondary">{label}</span>{children}</div>;
}
function PageBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn("grid size-[30px] place-items-center rounded-lg text-xs font-medium transition-colors", active ? "bg-green-500 text-white" : "bg-card text-text-secondary ring-1 ring-border hover:bg-surface-muted", disabled && "cursor-not-allowed opacity-40")}>{children}</button>
  );
}
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "…", total];
  if (current >= total - 2) return [1, "…", total - 2, total - 1, total];
  return [1, "…", current, "…", total];
}

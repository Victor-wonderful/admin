"use client";

import * as React from "react";
import {
  CalendarCheckIcon,
  CircleArrowDownIcon,
  SigmaIcon,
  BadgeCheckIcon,
  TimerIcon,
  ShoppingCartIcon,
  ArrowUpRightIcon,
  ArrowRightIcon,
  CalendarRangeIcon,
  CpuIcon,
  SlidersHorizontalIcon,
  DownloadIcon,
  ListFilterIcon,
  RotateCcwIcon,
  ChevronDownIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ── KPIs ── */
type DeltaTone = "positive" | "tertiary" | "accent";
const DELTA_CLS: Record<DeltaTone, string> = {
  positive: "text-positive",
  tertiary: "text-text-tertiary",
  accent: "text-green-700",
};

const KPIS: {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  warning?: boolean;
  label: string;
  value: string;
  delta: { icon: React.ComponentType<{ className?: string }>; text: string; tone: DeltaTone };
}[] = [
  { icon: CalendarCheckIcon, badge: "bg-green-50 text-green-700", label: "당일 매출", value: "$8,940", delta: { icon: ArrowUpRightIcon, text: "42건 · +6.2%", tone: "positive" } },
  { icon: CircleArrowDownIcon, badge: "bg-green-50 text-green-700", label: "당월 매출", value: "$184,260", delta: { icon: ArrowUpRightIcon, text: "12.4% vs 전월", tone: "positive" } },
  { icon: SigmaIcon, badge: "bg-feature text-n-0", label: "누적 매출", value: "$2.42M", delta: { icon: CalendarRangeIcon, text: "서비스 개시 이후", tone: "tertiary" } },
  { icon: BadgeCheckIcon, badge: "bg-green-50 text-green-600", label: "활성 구독", value: "856건", delta: { icon: CpuIcon, text: "Alpha Engine 활성", tone: "tertiary" } },
  { icon: TimerIcon, badge: "bg-warning text-n-0", warning: true, label: "갱신 임박", value: "47건", delta: { icon: ArrowRightIcon, text: "엔진 39 · 연회비 8", tone: "accent" } },
  { icon: ShoppingCartIcon, badge: "bg-info-soft text-info", label: "당월 신규 주문", value: "124건", delta: { icon: ArrowUpRightIcon, text: "8.2% vs 전월", tone: "positive" } },
];

/* ── Orders data ── */
type ItemType = "engine" | "annual" | "product";
interface OrderRow {
  uid: string;
  email: string;
  item: string;
  itemType: ItemType;
  amount: number;
  network: string;
  status: string; // 활성 / 완료 / 만료 / 대기 / 실패 / 환불
  date: string;
}

const ORDERS: OrderRow[] = [
  { uid: "FT·5D4E0A", email: "k•••@gmail.com", item: "Alpha Engine 구독", itemType: "engine", amount: 120, network: "Polygon", status: "활성", date: "2026-06-20" },
  { uid: "FT·2B91C7", email: "j•••@naver.com", item: "마케터 연회비", itemType: "annual", amount: 200, network: "Polygon", status: "완료", date: "2026-06-19" },
  { uid: "FT·1A22F0", email: "h•••@kakao.com", item: "Alpha Engine 구독", itemType: "engine", amount: 120, network: "Tron", status: "활성", date: "2026-06-18" },
  { uid: "FT·B2D7E0", email: "f•••@gmail.com", item: "크립토카드", itemType: "product", amount: 300, network: "Ethereum", status: "완료", date: "2026-06-17" },
  { uid: "FT·7C0F19", email: "p•••@gmail.com", item: "Alpha Engine 구독", itemType: "engine", amount: 120, network: "Polygon", status: "만료", date: "2026-05-17" },
  { uid: "FT·C9A410", email: "g•••@naver.com", item: "Alpha Engine 구독", itemType: "engine", amount: 120, network: "Polygon", status: "활성", date: "2026-06-15" },
  { uid: "FT·9C12B2", email: "s•••@daum.net", item: "마케터 연회비", itemType: "annual", amount: 200, network: "Polygon", status: "완료", date: "2026-06-12" },
  { uid: "FT·F3B2A9", email: "q•••@gmail.com", item: "거래소 수수료", itemType: "product", amount: 80, network: "Ethereum", status: "대기", date: "2026-06-11" },
];

const ITEM_BADGE: Record<ItemType, string> = {
  engine: "bg-green-50 text-green-700",
  annual: "bg-crypto-soft text-crypto",
  product: "bg-info-soft text-info",
};
const STATUS_BADGE: Record<string, string> = {
  활성: "bg-green-50 text-green-700",
  완료: "bg-n-100 text-n-600",
  만료: "bg-n-100 text-n-500",
  대기: "bg-warning-soft text-warning",
  실패: "bg-negative-soft text-negative",
  환불: "bg-negative-soft text-negative",
};

const TABS: { key: "all" | ItemType; label: string; count: number }[] = [
  { key: "all", label: "전체", count: 2418 },
  { key: "engine", label: "엔진 구독", count: 1840 },
  { key: "annual", label: "연회비", count: 312 },
  { key: "product", label: "상품", count: 266 },
];

const STATUS_OPTS = ["전체", "완료", "대기", "실패", "환불"];
const NETWORK_OPTS = ["전체 네트워크", "Tron", "Ethereum", "Polygon", "BSC"];
const PAGE_SIZE = 8;

function initials(uid: string): string {
  const after = uid.includes("·") ? uid.split("·")[1] : uid;
  return (after ?? uid).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
}
function fmtAmount(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

export function OrdersExplorer() {
  const [tab, setTab] = React.useState<"all" | ItemType>("all");
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [status, setStatus] = React.useState("전체");
  const [network, setNetwork] = React.useState("전체 네트워크");
  const [query, setQuery] = React.useState("");
  const [includeRefund, setIncludeRefund] = React.useState(false);
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return ORDERS.filter((o) => {
      if (tab !== "all" && o.itemType !== tab) return false;
      if (status !== "전체" && o.status !== status) return false;
      if (network !== "전체 네트워크" && o.network !== network) return false;
      if (!includeRefund && o.status === "환불") return false;
      if (q && !o.uid.toLowerCase().includes(q) && !o.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tab, status, network, query, includeRefund]);

  React.useEffect(() => setPage(1), [tab, status, network, query, includeRefund]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toN = Math.min(safePage * PAGE_SIZE, filtered.length);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (status !== "전체") chips.push({ key: "status", label: `결제 상태: ${status}`, clear: () => setStatus("전체") });
  if (network !== "전체 네트워크") chips.push({ key: "net", label: `네트워크: ${network}`, clear: () => setNetwork("전체 네트워크") });
  if (query.trim()) chips.push({ key: "q", label: `검색: ${query.trim()}`, clear: () => setQuery("") });
  if (includeRefund) chips.push({ key: "refund", label: "환불 포함", clear: () => setIncludeRefund(false) });

  const resetAll = () => {
    setStatus("전체");
    setNetwork("전체 네트워크");
    setQuery("");
    setIncludeRefund(false);
  };

  const pageBtns = pageNumbers(safePage, totalPages);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto bg-canvas p-7">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 xl:grid-cols-6">
        {KPIS.map((k) => {
          const Icon = k.icon;
          const DIcon = k.delta.icon;
          return (
            <div
              key={k.label}
              className={cn(
                "flex items-center gap-3 rounded-lg p-4 ring-1 shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]",
                k.warning ? "bg-warning-soft ring-warning" : "bg-card ring-border",
              )}
            >
              <div className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", k.badge)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-text-secondary">{k.label}</div>
                <div className="text-xl font-bold text-text-primary tabular-nums">{k.value}</div>
                <div className={cn("mt-0.5 flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold", DELTA_CLS[k.delta.tone])}>
                  <DIcon className="size-3 shrink-0" /> {k.delta.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors",
                  on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-n-500 hover:text-text-primary",
                )}
              >
                {t.label}
                <span className={cn("text-[12px] font-semibold tabular-nums", on ? "text-green-600" : "text-n-400")}>{t.count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={() => setPanelOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors",
              panelOpen ? "bg-green-50 text-green-700 ring-1 ring-green-500" : "bg-card text-text-secondary ring-1 ring-border-strong",
            )}
          >
            <SlidersHorizontalIcon className="size-3.5" /> 필터
          </button>
          <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium text-n-700 ring-1 ring-border-strong">
            <DownloadIcon className="size-3.5" /> 내보내기
          </button>
        </div>
      </div>

      {/* FilterPanel */}
      {panelOpen ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <ListFilterIcon className="size-[17px] text-green-700" /> 필터
            </span>
            <button onClick={resetAll} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary">
              <RotateCcwIcon className="size-3" /> 초기화
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* 결제 상태 */}
            <Field label="결제 상태">
              <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
                {STATUS_OPTS.map((o) => {
                  const on = status === o;
                  return (
                    <button
                      key={o}
                      onClick={() => setStatus(o)}
                      className={cn("flex-1 rounded-[7px] py-1.5 text-center text-[12px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-tertiary hover:text-text-secondary")}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </Field>
            {/* 결제 네트워크 */}
            <Field label="결제 네트워크">
              <Select value={network} options={NETWORK_OPTS} onChange={setNetwork} />
            </Field>
            {/* 결제일 */}
            <Field label="결제일">
              <div className="flex items-center gap-2">
                <SelectStub value="2026-06-01" className="flex-1" />
                <span className="text-text-tertiary">~</span>
                <SelectStub value="2026-06-16" className="flex-1" />
              </div>
            </Field>
            {/* 금액 */}
            <Field label="금액(USDT)">
              <div className="flex items-center gap-2">
                <InputStub value="$0" className="flex-1" />
                <span className="text-text-tertiary">~</span>
                <InputStub value="$1,000" className="flex-1" />
              </div>
            </Field>
            {/* 회원·주문번호 */}
            <Field label="회원 · 주문번호">
              <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong">
                <SearchIcon className="size-3.5 text-text-tertiary" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="UID·주문번호"
                  className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
                />
              </div>
            </Field>
            {/* 환불 포함 */}
            <Field label="환불 포함">
              <button onClick={() => setIncludeRefund((v) => !v)} className="flex items-center gap-2.5 py-1">
                <span className={cn("relative h-[23px] w-10 rounded-full p-[3px] transition-colors", includeRefund ? "bg-green-500" : "bg-n-300")}>
                  <span className={cn("block size-[17px] rounded-full bg-white transition-transform", includeRefund ? "translate-x-[17px]" : "translate-x-0")} />
                </span>
                <span className="text-xs font-semibold text-text-secondary">{includeRefund ? "ON" : "OFF"}</span>
              </button>
            </Field>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-3.5">
            <span className="text-xs font-medium text-text-tertiary">적용된 필터 {chips.length}개 · 결과 {filtered.length.toLocaleString()}건</span>
            <div className="flex gap-2.5">
              <button onClick={resetAll} className="rounded-[10px] bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">초기화</button>
              <button onClick={() => setPanelOpen(false)} className="inline-flex items-center gap-1.5 rounded-[10px] bg-green-500 px-4 py-2 text-[13px] font-semibold text-white">
                <CheckIcon className="size-3.5" /> 필터 적용
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AppliedChips */}
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary">적용됨</span>
          {chips.map((c) => (
            <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 py-1 pr-2 pl-3 text-xs font-semibold text-green-700">
              {c.label} <XIcon className="size-3" />
            </button>
          ))}
          <button onClick={resetAll} className="text-xs font-medium text-text-tertiary hover:text-text-secondary">모두 지우기</button>
        </div>
      ) : null}

      {/* OrdersTable */}
      <div className="overflow-hidden rounded-xl bg-card px-5 pt-2 pb-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
        <div className="grid grid-cols-[minmax(0,1fr)_170px_110px_150px_100px_100px] items-center gap-3 border-b py-3 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
          <span>회원</span><span>항목</span><span>금액</span><span>결제 (네트워크)</span><span>상태</span><span>결제일</span>
        </div>
        {pageRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">조건에 맞는 주문이 없습니다.</div>
        ) : (
          pageRows.map((o) => (
            <div key={o.uid + o.date} className="grid grid-cols-[minmax(0,1fr)_170px_110px_150px_100px_100px] items-center gap-3 border-b py-[11px] text-sm last:border-0">
              <span className="flex items-center gap-2.5">
                <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-n-100 text-[11px] font-bold text-n-600">{initials(o.uid)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-n-900">{o.uid}</span>
                  <span className="block truncate text-[11px] text-n-400">{o.email}</span>
                </span>
              </span>
              <span><span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", ITEM_BADGE[o.itemType])}>{o.item}</span></span>
              <span className="text-[13px] font-bold text-n-900 tabular-nums">{fmtAmount(o.amount)}</span>
              <span className="text-[12px] text-n-500">USDT · {o.network}</span>
              <span><span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", STATUS_BADGE[o.status])}>{o.status}</span></span>
              <span className="text-[12px] tabular-nums text-n-500">{o.date}</span>
            </div>
          ))
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-3.5">
          <span className="text-xs text-n-400">
            {fromN.toLocaleString()}–{toN.toLocaleString()} / {filtered.length.toLocaleString()}건
          </span>
          <div className="flex gap-1.5">
            <PageBtn disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹</PageBtn>
            {pageBtns.map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="grid size-[30px] place-items-center text-xs text-n-300">…</span>
              ) : (
                <PageBtn key={p} active={p === safePage} onClick={() => setPage(p as number)}>
                  {p}
                </PageBtn>
              ),
            )}
            <PageBtn disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>›</PageBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong">
      <span className="text-[13px] font-medium text-text-primary">{value}</span>
      <ChevronDownIcon className="size-3.5 text-text-tertiary" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="결제 네트워크"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function SelectStub({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong", className)}>
      <span className="text-[13px] font-medium text-text-primary">{value}</span>
      <ChevronDownIcon className="size-3.5 text-text-tertiary" />
    </div>
  );
}

function InputStub({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong", className)}>
      <span className="text-[13px] text-text-primary">{value}</span>
    </div>
  );
}

function PageBtn({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-[30px] place-items-center rounded-lg text-xs font-medium transition-colors",
        active ? "bg-green-500 text-white" : "bg-card text-text-secondary ring-1 ring-border hover:bg-surface-muted",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "…", total];
  if (current >= total - 2) return [1, "…", total - 2, total - 1, total];
  return [1, "…", current, "…", total];
}

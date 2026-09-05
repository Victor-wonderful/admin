"use client";

import * as React from "react";
import Link from "next/link";
import {
  SlidersHorizontalIcon,
  DownloadIcon,
  ListFilterIcon,
  RotateCcwIcon,
  SearchIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { downloadCsv } from "@/lib/csv";
import { toSeoulDateTime } from "@/lib/dates";

export type MemberRole = "registered" | "subscriber" | "marketer";

export interface ExplorerRow {
  id: string;
  name: string; // UID(FT·XXXXXX)
  displayName: string; // 닉네임
  email: string | null;
  role: MemberRole;
  active: boolean; // 활성 구독 중
  recommenderName: string | null; // 추천인 UID
  joinedAt: string; // YYYY-MM-DD
  rank: number | null; // 파트너 직급 R1~R9, 0=무직급, null=비파트너
  suspended: boolean; // 관리자 계정 정지
  lastSeenAt: string | null; // 마지막 접속(ISO) · 없으면 null
}

// 회원 목록 탐색기 — 역할(등록/구독/파트너)에 맞는 필터만 보여준다. 모든 필터는 즉시 적용.
//   등록회원: 검색 · 가입일 · 마지막 접속 · 계정 상태            (구독·직급 개념 없음)
//   구독회원: + 구독 상태(활성/만료)
//   파트너  : + 구독 상태 · 직급(무직급/R1~R9)
//   전체    : 역할 탭 + 위 전부

const ROLE_LABEL: Record<MemberRole, string> = { registered: "등록회원", subscriber: "구독회원", marketer: "파트너" };
const ROLE_AVATAR: Record<MemberRole, string> = {
  registered: "bg-n-100 text-n-500",
  subscriber: "bg-green-50 text-green-700",
  marketer: "bg-crypto-soft text-crypto",
};
const ROLE_BADGE: Record<MemberRole, string> = {
  registered: "bg-n-100 text-n-600",
  subscriber: "bg-green-50 text-green-700",
  marketer: "bg-crypto-soft text-crypto",
};

type SubStatus = "all" | "active" | "expired";
const SUB_OPTS: { key: SubStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "active", label: "활성" },
  { key: "expired", label: "만료" },
];
type SeenFilter = "all" | "7d" | "30d" | "stale" | "never";
const SEEN_OPTS: { key: SeenFilter; label: string }[] = [
  { key: "all", label: "전체 기간" },
  { key: "7d", label: "7일 내 접속" },
  { key: "30d", label: "30일 내 접속" },
  { key: "stale", label: "30일 이상 미접속" },
  { key: "never", label: "접속 기록 없음" },
];
type AccountFilter = "all" | "normal" | "suspended";
const ACCOUNT_OPTS: { key: AccountFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "normal", label: "정상" },
  { key: "suspended", label: "정지" },
];

const PAGE_SIZE = 10;
const INPUT = "w-full rounded-lg bg-card px-3 py-2 text-[13px] text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";
const SELECT = INPUT + " appearance-auto";

function initials(uid: string): string {
  const after = uid.includes("·") ? uid.split("·")[1] : uid;
  return (after ?? uid).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
}
function maskEmail(email: string | null): string {
  if (!email) return "이메일 미등록";
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 1)}•••@${d}`;
}
function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function seenLabel(iso: string | null): { text: string; cls: string } {
  const d = daysAgo(iso);
  if (d === null) return { text: "기록 없음", cls: "text-n-300" };
  if (d <= 0) return { text: "오늘", cls: "text-green-700 font-semibold" };
  if (d <= 7) return { text: `${d}일 전`, cls: "text-text-secondary" };
  return { text: toSeoulDateTime(iso!).slice(0, 5), cls: d > 30 ? "text-warning" : "text-text-secondary" };
}
function pageNumbers(cur: number, total: number): (number | "…")[] {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, 2, cur - 1, cur, cur + 1, total - 1, total].filter((n) => n >= 1 && n <= total));
  const arr = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) out.push("…");
    out.push(arr[i]);
  }
  return out;
}
function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-0.5 rounded-[10px] bg-surface-muted p-[3px] ring-1 ring-border">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button key={o.key} type="button" onClick={() => onChange(o.key)} className={cn("flex-1 rounded-[7px] py-1.5 text-center text-[12px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-tertiary hover:text-text-secondary")}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function MembersExplorer({
  rows,
  counts,
  lockedRole,
}: {
  rows: ExplorerRow[];
  counts: { all: number; registered: number; subscriber: number; marketer: number };
  // 하위 페이지(등록/구독/파트너)는 역할 고정 — 역할 탭 대신 헤딩 표시.
  lockedRole?: MemberRole;
}) {
  const [roleTab, setRoleTab] = React.useState<"all" | MemberRole>(lockedRole ?? "all");
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [subStatus, setSubStatus] = React.useState<SubStatus>("all");
  const [rankFilter, setRankFilter] = React.useState<"all" | "0" | `${number}`>("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [seen, setSeen] = React.useState<SeenFilter>("all");
  const [account, setAccount] = React.useState<AccountFilter>("all");
  const [pageState, setPageState] = React.useState<{ key: string; page: number }>({ key: "", page: 1 });

  // 현재 보이는 역할 범위 — 필터 노출 여부를 결정
  const scope: "all" | MemberRole = lockedRole ?? roleTab;
  const showSub = scope !== "registered";
  const showRank = scope === "marketer" || scope === "all";

  const filterKey = `${roleTab}|${query.trim().toLowerCase()}|${subStatus}|${rankFilter}|${from}|${to}|${seen}|${account}`;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleTab !== "all" && r.role !== roleTab) return false;
      if (showSub && subStatus !== "all" && r.role !== "registered") {
        if (subStatus === "active" && !r.active) return false;
        if (subStatus === "expired" && r.active) return false;
      }
      if (showSub && subStatus !== "all" && r.role === "registered") return false; // 등록회원은 구독 상태 개념 없음
      if (showRank && rankFilter !== "all") {
        if (r.rank === null) return false;
        if (rankFilter === "0" ? r.rank !== 0 : r.rank !== Number(rankFilter)) return false;
      }
      if (from && r.joinedAt < from) return false;
      if (to && r.joinedAt > to) return false;
      if (seen !== "all") {
        const d = daysAgo(r.lastSeenAt);
        if (seen === "never" && d !== null) return false;
        if (seen === "7d" && (d === null || d > 7)) return false;
        if (seen === "30d" && (d === null || d > 30)) return false;
        if (seen === "stale" && (d === null || d <= 30)) return false;
      }
      if (account === "normal" && r.suspended) return false;
      if (account === "suspended" && !r.suspended) return false;
      if (q) {
        const hay = `${r.name} ${r.displayName} ${r.email ?? ""} ${r.recommenderName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, roleTab, showSub, showRank, subStatus, rankFilter, from, to, seen, account, query]);

  const exportCsv = () =>
    downloadCsv(
      `members-${lockedRole ?? "all"}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["UID", "닉네임", "이메일", "회원 구분", "구독", "직급", "추천인 UID", "가입일", "마지막 접속", "계정 상태"],
      filtered.map((r) => [
        r.name, r.displayName, r.email ?? "", ROLE_LABEL[r.role],
        r.role === "registered" ? "" : r.active ? "활성" : "만료",
        r.rank == null ? "" : r.rank > 0 ? `R${r.rank}` : "무직급",
        r.recommenderName ?? "", r.joinedAt, r.lastSeenAt ? toSeoulDateTime(r.lastSeenAt) : "", r.suspended ? "정지" : "정상",
      ]),
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toN = Math.min(safePage * PAGE_SIZE, filtered.length);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (!lockedRole && roleTab !== "all") chips.push({ key: "role", label: `회원 구분: ${ROLE_LABEL[roleTab]}`, clear: () => setRoleTab("all") });
  if (showSub && subStatus !== "all") chips.push({ key: "sub", label: `구독: ${SUB_OPTS.find((o) => o.key === subStatus)!.label}`, clear: () => setSubStatus("all") });
  if (showRank && rankFilter !== "all") chips.push({ key: "rank", label: `직급: ${rankFilter === "0" ? "무직급" : `R${rankFilter}`}`, clear: () => setRankFilter("all") });
  if (from || to) chips.push({ key: "date", label: `가입일: ${from || "…"} ~ ${to || "…"}`, clear: () => { setFrom(""); setTo(""); } });
  if (seen !== "all") chips.push({ key: "seen", label: `접속: ${SEEN_OPTS.find((o) => o.key === seen)!.label}`, clear: () => setSeen("all") });
  if (account !== "all") chips.push({ key: "acc", label: `계정: ${ACCOUNT_OPTS.find((o) => o.key === account)!.label}`, clear: () => setAccount("all") });
  if (query.trim()) chips.push({ key: "q", label: `검색: ${query.trim()}`, clear: () => setQuery("") });
  const resetAll = () => { setRoleTab(lockedRole ?? "all"); setQuery(""); setSubStatus("all"); setRankFilter("all"); setFrom(""); setTo(""); setSeen("all"); setAccount("all"); };

  const tabs: { key: "all" | MemberRole; label: string; count: number }[] = [
    { key: "all", label: "전체", count: counts.all },
    { key: "registered", label: "등록회원", count: counts.registered },
    { key: "subscriber", label: "구독회원", count: counts.subscriber },
    { key: "marketer", label: "파트너", count: counts.marketer },
  ];

  // 표 열 — 역할 범위에 맞춰 구독/직급 열을 숨긴다.
  const cols = [
    { k: "member", w: "minmax(0,1fr)", h: "회원" },
    ...(!lockedRole ? [{ k: "role", w: "96px", h: "회원 구분" }] : []),
    ...(showSub ? [{ k: "sub", w: "84px", h: "구독" }] : []),
    ...(showRank ? [{ k: "rank", w: "84px", h: "직급" }] : []),
    { k: "rec", w: "130px", h: "추천인" },
    { k: "joined", w: "104px", h: "가입일" },
    { k: "seen", w: "104px", h: "마지막 접속" },
    { k: "acc", w: "92px", h: "계정 상태" },
    { k: "go", w: "32px", h: "" },
  ];
  const gridStyle = { gridTemplateColumns: cols.map((c) => c.w).join(" ") };
  const pageBtns = pageNumbers(safePage, totalPages);

  return (
    <div className="flex flex-1 flex-col gap-[18px] overflow-auto bg-canvas p-7">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {lockedRole ? (
          <div className="flex items-center gap-2.5 rounded-[10px] bg-card px-3.5 py-2 ring-1 ring-border">
            <span className={cn("grid size-6 place-items-center rounded-md text-[11px] font-bold", ROLE_AVATAR[lockedRole])}>{ROLE_LABEL[lockedRole].slice(0, 1)}</span>
            <span className="text-[14px] font-semibold text-text-primary">{ROLE_LABEL[lockedRole]}</span>
            <span className="text-[12px] font-semibold text-green-700 tabular-nums">{counts[lockedRole].toLocaleString()}명</span>
          </div>
        ) : (
          <div className="flex gap-0.5 rounded-[10px] bg-surface-muted p-[3px] ring-1 ring-border">
            {tabs.map((t) => {
              const on = roleTab === t.key;
              return (
                <button key={t.key} type="button" onClick={() => setRoleTab(t.key)} className={cn("flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-text-secondary hover:text-text-primary")}>
                  {t.label}
                  <span className={cn("text-[12px] font-semibold tabular-nums", on ? "text-green-700" : "text-text-tertiary")}>{t.count.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-1 items-center justify-end gap-2.5">
          <div className="flex w-full max-w-[320px] items-center gap-2 rounded-[10px] bg-card px-3 py-2 ring-1 ring-border-strong">
            <SearchIcon className="size-3.5 shrink-0 text-text-tertiary" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="UID · 닉네임 · 이메일 · 추천인 UID" className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
            {query ? <button type="button" onClick={() => setQuery("")} aria-label="검색 지우기" className="text-text-tertiary hover:text-text-primary"><XIcon className="size-3.5" /></button> : null}
          </div>
          <button type="button" onClick={() => setPanelOpen((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[13px] font-semibold transition-colors", panelOpen ? "bg-green-50 text-green-700 ring-1 ring-green-500" : "bg-card text-text-secondary ring-1 ring-border-strong")}>
            <SlidersHorizontalIcon className="size-3.5" /> 필터{chips.filter((c) => c.key !== "q" && c.key !== "role").length ? ` ${chips.filter((c) => c.key !== "q" && c.key !== "role").length}` : ""}
          </button>
          <button type="button" onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-50">
            <DownloadIcon className="size-3.5" /> 내보내기
          </button>
        </div>
      </div>

      {/* FilterPanel — 역할 범위에 맞는 항목만. 모두 즉시 적용 */}
      {panelOpen ? (
        <div className="rounded-xl bg-card p-5 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-text-primary"><ListFilterIcon className="size-[17px] text-green-700" /> 필터 <span className="text-xs font-medium text-text-tertiary">· 바꾸면 바로 적용됩니다</span></span>
            <button type="button" onClick={resetAll} className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary"><RotateCcwIcon className="size-3" /> 초기화</button>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {showSub ? (
              <Field label="구독 상태"><Segmented value={subStatus} options={SUB_OPTS} onChange={setSubStatus} /></Field>
            ) : null}
            {showRank ? (
              <Field label="직급">
                <select value={rankFilter} onChange={(e) => setRankFilter(e.target.value as typeof rankFilter)} className={SELECT}>
                  <option value="all">전체 직급</option>
                  <option value="0">무직급</option>
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>R{n} · {n}직급</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="계정 상태"><Segmented value={account} options={ACCOUNT_OPTS} onChange={setAccount} /></Field>
            <Field label="가입일">
              <div className="flex items-center gap-2">
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={INPUT} />
                <span className="text-text-tertiary">~</span>
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={INPUT} />
              </div>
            </Field>
            <Field label="마지막 접속">
              <select value={seen} onChange={(e) => setSeen(e.target.value as SeenFilter)} className={SELECT}>
                {SEEN_OPTS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3.5">
            <span className="text-xs font-medium text-text-tertiary">적용된 필터 {chips.length}개 · 결과 {filtered.length.toLocaleString()}명</span>
            <button type="button" onClick={() => setPanelOpen(false)} className="rounded-[10px] bg-green-500 px-4 py-2 text-[13px] font-semibold text-white">닫기</button>
          </div>
        </div>
      ) : null}

      {/* AppliedChips */}
      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary">적용됨</span>
          {chips.map((c) => (
            <button key={c.key} type="button" onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 py-1 pr-2 pl-3 text-xs font-semibold text-green-700">{c.label} <XIcon className="size-3" /></button>
          ))}
          <button type="button" onClick={resetAll} className="text-xs font-medium text-text-tertiary hover:text-text-secondary">모두 지우기</button>
        </div>
      ) : null}

      {/* MembersTable */}
      <div className="overflow-x-auto rounded-xl bg-card px-5 pt-2 pb-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
        <div className="min-w-[880px]">
          <div className="grid items-center gap-3 border-b py-3 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase" style={gridStyle}>
            {cols.map((c) => <span key={c.k}>{c.h}</span>)}
          </div>
          {pageRows.length === 0 ? (
            <div className="py-12 text-center text-sm text-text-tertiary">{rows.length === 0 ? "아직 회원이 없습니다." : "조건에 맞는 회원이 없습니다."}</div>
          ) : (
            pageRows.map((r) => {
              const sl = seenLabel(r.lastSeenAt);
              return (
                <Link key={r.id} href={`/admin/members/${r.id}`} className={cn("grid items-center gap-3 border-b py-[11px] text-sm transition-colors last:border-0 hover:bg-surface-muted", r.suspended && "opacity-70")} style={gridStyle}>
                  <span className="flex items-center gap-2.5">
                    <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-[10px] text-[11px] font-bold", ROLE_AVATAR[r.role])}>{initials(r.name)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-text-primary">{r.name} <span className="font-medium text-text-secondary">· {r.displayName}</span></span>
                      <span className="block truncate text-[11px] text-text-tertiary">{maskEmail(r.email)}</span>
                    </span>
                  </span>
                  {!lockedRole ? <span><span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", ROLE_BADGE[r.role])}>{ROLE_LABEL[r.role]}</span></span> : null}
                  {showSub ? (
                    <span>
                      {r.role === "registered" ? <span className="text-n-300">—</span> : <span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", r.active ? "bg-green-50 text-green-700" : "bg-n-100 text-n-600")}>{r.active ? "활성" : "만료"}</span>}
                    </span>
                  ) : null}
                  {showRank ? (
                    <span>
                      {r.rank === null ? <span className="text-n-300">—</span> : r.rank === 0 ? <span className="inline-block rounded-[7px] bg-n-100 px-2.5 py-1 text-[12px] font-semibold text-n-500">무직급</span> : <span className="inline-block rounded-[7px] bg-crypto-soft px-2.5 py-1 text-[12px] font-semibold text-crypto">R{r.rank}</span>}
                    </span>
                  ) : null}
                  <span className="truncate text-[12px] font-medium text-text-secondary">{r.recommenderName ?? "—"}</span>
                  <span className="text-[12px] tabular-nums text-text-secondary">{r.joinedAt}</span>
                  <span className={cn("text-[12px] tabular-nums", sl.cls)} title={r.lastSeenAt ? toSeoulDateTime(r.lastSeenAt) : undefined}>{sl.text}</span>
                  <span>
                    {r.suspended ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-negative-soft px-2.5 py-1 text-[11px] font-semibold text-negative"><span className="size-1.5 rounded-full bg-negative" /> 정지</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700"><span className="size-1.5 rounded-full bg-green-700" /> 정상</span>
                    )}
                  </span>
                  <span className="grid place-items-center justify-self-end text-n-300"><ChevronRightIcon className="size-4" /></span>
                </Link>
              );
            })
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-3.5">
            <span className="text-xs text-text-tertiary">{fromN.toLocaleString()}–{toN.toLocaleString()} / {filtered.length.toLocaleString()}명</span>
            <div className="flex gap-1.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border disabled:opacity-40">‹</button>
              {pageBtns.map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="grid size-8 place-items-center text-text-tertiary">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p)} className={cn("grid size-8 place-items-center rounded-md text-[13px] font-semibold", p === safePage ? "bg-green-500 text-white" : "text-text-secondary ring-1 ring-border")}>{p}</button>
                ),
              )}
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border disabled:opacity-40">›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  SlidersHorizontalIcon,
  DownloadIcon,
  ListFilterIcon,
  RotateCcwIcon,
  ChevronDownIcon,
  SearchIcon,
  CheckIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type MemberRole = "registered" | "subscriber" | "marketer";

export interface ExplorerRow {
  id: string;
  name: string;
  email: string | null;
  role: MemberRole;
  active: boolean;
  recommenderName: string | null;
  joinedAt: string; // YYYY-MM-DD
  rank: number | null; // 마케터 직급 R1~R9, 0=무직급, null=비마케터
}

const ROLE_LABEL: Record<MemberRole, string> = { registered: "등록회원", subscriber: "구독회원", marketer: "마케터" };
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

type SubStatus = "all" | "active" | "expired" | "none";
const SUB_OPTS: { key: SubStatus; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "active", label: "활성" },
  { key: "expired", label: "만료" },
  { key: "none", label: "미구독" },
];

const PAGE_SIZE = 8;

function initials(name: string): string {
  // UID(FT·8F3A21) → 뒤 2자리(8F)
  const after = name.includes("·") ? name.split("·")[1] : name;
  return (after ?? name).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
}
function maskEmail(email: string | null): string {
  if (!email) return "이메일 미등록";
  const [u, d] = email.split("@");
  if (!d) return email;
  return `${u.slice(0, 1)}•••@${d}`;
}
function subLabel(r: ExplorerRow): { text: string; cls: string } {
  if (r.role === "registered") return { text: "—", cls: "text-n-300" };
  if (r.active) return { text: "활성", cls: "bg-green-50 text-green-700" };
  return { text: "만료", cls: "bg-n-100 text-n-600" };
}
// 직급 셀: 마케터만 R1~R9 / 무직급, 비마케터는 — (직급 개념 없음)
function rankCell(r: ExplorerRow): { text: string; cls: string } {
  if (r.role !== "marketer" || r.rank == null) return { text: "—", cls: "text-n-300" };
  if (r.rank === 0) return { text: "무직급", cls: "bg-n-100 text-n-500" };
  return { text: `R${r.rank}`, cls: "bg-crypto-soft text-crypto" };
}

export function MembersExplorer({
  rows,
  counts,
  lockedRole,
}: {
  rows: ExplorerRow[];
  counts: { all: number; registered: number; subscriber: number; marketer: number };
  // 하위 페이지(등록/구독/마케터)는 역할 고정 — 역할 탭 대신 헤딩 표시.
  lockedRole?: MemberRole;
}) {
  const [roleTab, setRoleTab] = React.useState<"all" | MemberRole>(lockedRole ?? "all");
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [subStatus, setSubStatus] = React.useState<SubStatus>("all");
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [recQuery, setRecQuery] = React.useState("");
  const [page, setPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    const q = recQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleTab !== "all" && r.role !== roleTab) return false;
      if (subStatus === "active" && !r.active) return false;
      if (subStatus === "expired" && !(!r.active && r.role !== "registered")) return false;
      if (subStatus === "none" && r.role !== "registered") return false;
      if (activeOnly && !r.active) return false;
      if (q && !(r.recommenderName ?? "").toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, roleTab, subStatus, activeOnly, recQuery]);

  // 필터 변경 시 1페이지로
  React.useEffect(() => setPage(1), [roleTab, subStatus, activeOnly, recQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toN = Math.min(safePage * PAGE_SIZE, filtered.length);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (!lockedRole && roleTab !== "all") chips.push({ key: "role", label: `역할: ${ROLE_LABEL[roleTab]}`, clear: () => setRoleTab("all") });
  if (subStatus !== "all") chips.push({ key: "sub", label: `구독 상태: ${SUB_OPTS.find((o) => o.key === subStatus)!.label}`, clear: () => setSubStatus("all") });
  if (activeOnly) chips.push({ key: "active", label: "활성 구독자만", clear: () => setActiveOnly(false) });
  if (recQuery.trim()) chips.push({ key: "rec", label: `추천인: ${recQuery.trim()}`, clear: () => setRecQuery("") });

  const resetAll = () => {
    setRoleTab(lockedRole ?? "all");
    setSubStatus("all");
    setActiveOnly(false);
    setRecQuery("");
  };

  const ROLE_AVATAR_LABEL: Record<MemberRole, string> = {
    registered: "등록회원",
    subscriber: "구독회원",
    marketer: "마케터",
  };

  const tabs: { key: "all" | MemberRole; label: string; count: number }[] = [
    { key: "all", label: "전체", count: counts.all },
    { key: "registered", label: "등록회원", count: counts.registered },
    { key: "subscriber", label: "구독회원", count: counts.subscriber },
    { key: "marketer", label: "마케터", count: counts.marketer },
  ];

  const pageBtns = pageNumbers(safePage, totalPages);

  return (
    <div className="flex flex-1 flex-col gap-[18px] overflow-auto bg-canvas p-7">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {lockedRole ? (
          <div className="flex items-center gap-2.5 rounded-[10px] bg-card px-3.5 py-2 ring-1 ring-border">
            <span className={cn("grid size-6 place-items-center rounded-md text-[11px] font-bold", ROLE_AVATAR[lockedRole])}>
              {ROLE_AVATAR_LABEL[lockedRole].slice(0, 1)}
            </span>
            <span className="text-[14px] font-semibold text-text-primary">{ROLE_AVATAR_LABEL[lockedRole]}</span>
            <span className="text-[12px] font-semibold text-green-700 tabular-nums">{counts[lockedRole].toLocaleString()}명</span>
          </div>
        ) : (
          <div className="flex gap-0.5 rounded-[10px] bg-surface-muted p-[3px] ring-1 ring-border">
            {tabs.map((t) => {
              const on = roleTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setRoleTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors",
                    on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-text-secondary hover:text-text-primary",
                  )}
                >
                  {t.label}
                  <span className={cn("text-[12px] font-semibold tabular-nums", on ? "text-green-700" : "text-text-tertiary")}>{t.count.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        )}
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
          <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
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
            {/* 구독 상태 */}
            <Field label="구독 상태">
              <div className="flex gap-0.5 rounded-[10px] bg-surface-muted p-[3px] ring-1 ring-border">
                {SUB_OPTS.map((o) => {
                  const on = subStatus === o.key;
                  return (
                    <button
                      key={o.key}
                      onClick={() => setSubStatus(o.key)}
                      className={cn("flex-1 rounded-[7px] py-1.5 text-center text-[12px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-tertiary hover:text-text-secondary")}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </Field>
            {/* 직급(시각) */}
            <Field label="직급">
              <SelectStub value="전체 직급" />
            </Field>
            {/* 가입일(시각) */}
            <Field label="가입일">
              <div className="flex items-center gap-2">
                <SelectStub value="2026-06-01" className="flex-1" />
                <span className="text-text-tertiary">~</span>
                <SelectStub value="2026-06-16" className="flex-1" />
              </div>
            </Field>
            {/* 마지막 접속(시각) */}
            <Field label="마지막 접속">
              <SelectStub value="전체 기간" />
            </Field>
            {/* 추천인 UID */}
            <Field label="추천인 검색">
              <div className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong">
                <SearchIcon className="size-3.5 text-text-tertiary" />
                <input
                  value={recQuery}
                  onChange={(e) => setRecQuery(e.target.value)}
                  placeholder="추천인 또는 회원명"
                  className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary"
                />
              </div>
            </Field>
            {/* 활성 구독자만 */}
            <Field label="활성 구독자만">
              <button onClick={() => setActiveOnly((v) => !v)} className="flex items-center gap-2.5 py-1">
                <span className={cn("relative h-[23px] w-10 rounded-full p-[3px] transition-colors", activeOnly ? "bg-green-500" : "bg-n-200")}>
                  <span className={cn("block size-[17px] rounded-full bg-white transition-transform", activeOnly ? "translate-x-[17px]" : "translate-x-0")} />
                </span>
                <span className="text-xs font-semibold text-text-secondary">{activeOnly ? "ON" : "OFF"}</span>
              </button>
            </Field>
          </div>

          <div className="mt-4 flex items-center justify-between border-t pt-3.5">
            <span className="text-xs font-medium text-text-tertiary">적용된 필터 {chips.length}개 · 결과 {filtered.length.toLocaleString()}명</span>
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

      {/* MembersTable */}
      <div className="overflow-hidden rounded-xl bg-card px-5 pt-2 pb-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
        {/* header */}
        <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_100px_150px_110px_170px_40px] items-center gap-3 border-b py-3 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
          <span>회원</span><span>역할</span><span>구독</span><span>직급</span><span>추천인</span><span>가입일</span><span>계정 상태</span><span />
        </div>
        {pageRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-text-tertiary">조건에 맞는 회원이 없습니다.</div>
        ) : (
          pageRows.map((r) => {
            const sub = subLabel(r);
            const rank = rankCell(r);
            return (
              <Link key={r.id} href={`/admin/members/${r.id}`} className="grid grid-cols-[minmax(0,1fr)_110px_100px_100px_150px_110px_170px_40px] items-center gap-3 border-b py-[11px] text-sm transition-colors last:border-0 hover:bg-surface-muted">
                <span className="flex items-center gap-2.5">
                  <span className={cn("grid size-[34px] shrink-0 place-items-center rounded-[10px] text-[11px] font-bold", ROLE_AVATAR[r.role])}>{initials(r.name)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-text-primary">{r.name}</span>
                    <span className="block truncate text-[11px] text-text-tertiary">{maskEmail(r.email)}</span>
                  </span>
                </span>
                <span><span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", ROLE_BADGE[r.role])}>{ROLE_LABEL[r.role]}</span></span>
                <span>
                  {sub.text === "—" ? <span className="text-n-300">—</span> : <span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", sub.cls)}>{sub.text}</span>}
                </span>
                <span>
                  {rank.text === "—" ? <span className="text-n-300">—</span> : <span className={cn("inline-block rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", rank.cls)}>{rank.text}</span>}
                </span>
                <span className="truncate text-[12px] font-medium text-text-secondary">{r.recommenderName ?? "—"}</span>
                <span className="text-[12px] tabular-nums text-text-secondary">{r.joinedAt}</span>
                <span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    <span className="size-1.5 rounded-full bg-green-700" /> 정상
                  </span>
                </span>
                <span className="grid place-items-center justify-self-end text-n-300">
                  <ChevronRightIcon className="size-4" />
                </span>
              </Link>
            );
          })
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between pt-3.5">
          <span className="text-xs text-text-tertiary">
            {fromN.toLocaleString()}–{toN.toLocaleString()} / {filtered.length.toLocaleString()}명
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

function SelectStub({ value, className }: { value: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg bg-card px-3 py-2 ring-1 ring-border-strong", className)}>
      <span className="text-[13px] font-medium text-text-primary">{value}</span>
      <ChevronDownIcon className="size-3.5 text-text-tertiary" />
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

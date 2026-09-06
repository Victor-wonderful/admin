"use client";

import * as React from "react";
import {
  ActivityIcon,
  ListIcon,
  TriangleAlertIcon,
  XCircleIcon,
  UserXIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  SearchIcon,
  ShieldAlertIcon,
  XIcon,
  RotateCcwIcon,
} from "lucide-react";

import Link from "next/link";

import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import type { AuditRow, AuditStats } from "@/lib/queries/audit";
import type { AuditCategory } from "@/lib/audit";
import { downloadCsv } from "@/lib/csv";
import { toSeoulDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

// 감사 로그 탐색기(실데이터) — 서버에서 rows/stats 를 받아 클라이언트에서 탭·필터·검색·페이지·CSV.

type Tone = "green" | "info" | "warning" | "negative" | "neutral" | "crypto";
const CATEGORY_LABEL: Record<AuditCategory, string> = { auth: "인증", permission: "권한", settlement: "정산", finance: "자금", member: "회원", catalog: "상품·수당" };
const CATEGORY_ORDER: AuditCategory[] = ["auth", "permission", "settlement", "finance", "member", "catalog"];

// 액션 코드 → 라벨·톤. 없는 코드는 코드 그대로 보여준다.
const ACTION_META: Record<string, { label: string; tone: Tone }> = {
  login: { label: "로그인", tone: "info" },
  login_failed: { label: "로그인 실패", tone: "negative" },
  login_locked: { label: "계정 잠금", tone: "negative" },
  mfa_verified: { label: "2단계 인증", tone: "info" },
  mfa_failed: { label: "2단계 실패", tone: "negative" },
  logout: { label: "로그아웃", tone: "neutral" },
  password_change: { label: "비밀번호 변경", tone: "info" },
  totp_reenroll: { label: "인증 앱 재등록", tone: "info" },
  password_reset_request: { label: "재설정 요청", tone: "warning" },
  password_reset_complete: { label: "재설정 완료", tone: "info" },
  password_reset_failed: { label: "재설정 실패", tone: "negative" },
  admin_create: { label: "관리자 추가", tone: "crypto" },
  admin_activate: { label: "관리자 활성화", tone: "crypto" },
  admin_deactivate: { label: "관리자 비활성화", tone: "negative" },
  admin_totp_reset: { label: "2FA 재설정", tone: "crypto" },
  admin_password_reset: { label: "비밀번호 초기화", tone: "crypto" },
  admin_role_change: { label: "역할 변경", tone: "crypto" },
  session_revoke: { label: "기기 세션 종료", tone: "neutral" },
  permission_denied: { label: "권한 거부", tone: "negative" },
  settlement_run: { label: "정산 재산정", tone: "green" },
  settlement_confirm: { label: "정산 확정", tone: "green" },
  settlement_hold: { label: "정산 보류", tone: "warning" },
  settlement_release: { label: "보류 해제", tone: "green" },
  commission_pay: { label: "지급 실행", tone: "warning" },
  expiry_run: { label: "월 만료 실행", tone: "warning" },
  withdrawal_approve: { label: "출금 승인", tone: "warning" },
  withdrawal_reject: { label: "출금 반려", tone: "negative" },
  withdrawal_send: { label: "출금 송금", tone: "info" },
  withdrawal_complete: { label: "출금 완료", tone: "green" },
  withdrawal_reopen: { label: "출금 대기 복귀", tone: "neutral" },
  deposit_scan: { label: "입금 스캔", tone: "info" },
  deposit_credit: { label: "입금 수동 매칭", tone: "warning" },
  deposit_ignore: { label: "입금 무시", tone: "neutral" },
  revenue_allocate: { label: "매출 배분", tone: "green" },
  member_force_logout: { label: "회원 강제 로그아웃", tone: "warning" },
  member_place_admin: { label: "후원배치 이동", tone: "warning" },
  member_place_major: { label: "주력 라인 이동", tone: "warning" },
  product_create: { label: "상품 추가", tone: "info" },
  product_update: { label: "상품 수정", tone: "info" },
  product_activate: { label: "상품 판매 활성", tone: "green" },
  product_deactivate: { label: "상품 판매 중지", tone: "neutral" },
  product_delete: { label: "상품 삭제", tone: "negative" },
  ranks_update: { label: "직급 요율 변경", tone: "crypto" },
  profile_name_change: { label: "이름 변경", tone: "info" },
  session_revoke_all: { label: "다른 기기 모두 종료", tone: "neutral" },
  comp_settings_update: { label: "수당체계 설정 변경", tone: "crypto" },
};
const actionMeta = (code: string) => ACTION_META[code] ?? { label: code, tone: "neutral" as Tone };

// 기록에서 바로 갈 수 있는 관련 화면
function relatedHref(r: AuditRow): { href: string; label: string } | null {
  const a = r.action;
  if (a.startsWith("member_") && r.target_id) return { href: `/admin/members/${r.target_id}`, label: "회원 상세" };
  if (a.startsWith("withdrawal_")) return { href: "/admin/withdrawals", label: "출금내역" };
  if (a.startsWith("deposit_")) return { href: "/admin/deposits", label: "입금내역" };
  if (a.startsWith("settlement_") || a === "commission_pay") return { href: r.target_id && /^\d{4}-\d{2}$/.test(r.target_id) ? `/admin/settlements?cycle=${r.target_id}` : "/admin/settlements", label: "수당 정산" };
  if (a === "revenue_allocate") return { href: r.target_id ? `/admin/revenue?cycle=${r.target_id}` : "/admin/revenue", label: "매출현황" };
  if (a.startsWith("admin_")) return { href: "/admin/admins", label: "관리자·권한" };
  if (a.startsWith("product_")) return { href: "/admin/products", label: "상품·구독플랜" };
  if (a === "ranks_update" || a === "comp_settings_update") return { href: "/admin/ranks", label: "수당체계·직급" };
  return null;
}

const CATEGORY_AVATAR: Record<AuditCategory, string> = {
  auth: "bg-info-soft text-info", permission: "bg-crypto-soft text-crypto", settlement: "bg-green-50 text-green-700",
  finance: "bg-warning-soft text-warning", member: "bg-n-100 text-n-600", catalog: "bg-n-100 text-n-600",
};
const SUBCARD = "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";
const COLS = "grid-cols-[118px_150px_128px_1.8fr_120px_72px]";
const PAGE_SIZE = 15;
const INPUT = "w-full rounded-lg bg-card px-3 py-2 text-[13px] text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";

function deltaPct(cur: number, prev: number): number | null {
  return prev > 0 ? ((cur - prev) / prev) * 100 : null;
}

export function AuditExplorer({ rows, stats }: { rows: AuditRow[]; stats: AuditStats }) {
  const [tab, setTab] = React.useState<"all" | AuditCategory>("all");
  const [admin, setAdmin] = React.useState("all");
  const [result, setResult] = React.useState<"all" | "ok" | "fail">("all");
  const [riskOnly, setRiskOnly] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [actionFilter, setActionFilter] = React.useState("all");
  const [openId, setOpenId] = React.useState<number | null>(null);
  const [pageState, setPageState] = React.useState<{ key: string; page: number }>({ key: "", page: 1 });
  const filterKey = `${tab}|${admin}|${result}|${riskOnly}|${actionFilter}|${query.trim().toLowerCase()}|${from}|${to}`;
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (p: number) => setPageState({ key: filterKey, page: p });

  const admins = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.admin_id && r.admin_name) m.set(r.admin_id, r.admin_name);
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);
  const actions = React.useMemo(() => {
    const set = new Map<string, number>();
    for (const r of rows) if (tab === "all" || r.category === tab) set.set(r.action, (set.get(r.action) ?? 0) + 1);
    return [...set.entries()].sort((a, b) => actionMeta(a[0]).label.localeCompare(actionMeta(b[0]).label));
  }, [rows, tab]);
  const counts = React.useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const k of CATEGORY_ORDER) c[k] = 0;
    for (const r of rows) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.category !== tab) return false;
      if (admin === "anon" ? r.admin_id !== null : admin !== "all" && r.admin_id !== admin) return false;
      if (result === "ok" && !r.ok) return false;
      if (result === "fail" && r.ok) return false;
      if (riskOnly && !r.risk) return false;
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      const day = toSeoulDateTime(r.at).slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (q) {
        const hay = `${r.admin_name ?? ""} ${r.admin_email ?? ""} ${actionMeta(r.action).label} ${r.target ?? ""} ${r.ip ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, tab, admin, result, riskOnly, actionFilter, query, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const fromN = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const toN = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pageNums = React.useMemo(() => {
    const s = Math.max(1, Math.min(safePage - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => s + i);
  }, [safePage, totalPages]);

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (admin !== "all") chips.push({ key: "admin", label: `관리자: ${admin === "anon" ? "미식별" : admins.find(([id]) => id === admin)?.[1] ?? admin}`, clear: () => setAdmin("all") });
  if (result !== "all") chips.push({ key: "result", label: `결과: ${result === "ok" ? "성공" : "실패"}`, clear: () => setResult("all") });
  if (riskOnly) chips.push({ key: "risk", label: "위험 액션만", clear: () => setRiskOnly(false) });
  if (actionFilter !== "all") chips.push({ key: "action", label: `액션: ${actionMeta(actionFilter).label}`, clear: () => setActionFilter("all") });
  if (from || to) chips.push({ key: "date", label: `기간: ${from || "…"} ~ ${to || "…"}`, clear: () => { setFrom(""); setTo(""); } });
  if (query.trim()) chips.push({ key: "q", label: `검색: ${query.trim()}`, clear: () => setQuery("") });
  const resetAll = () => { setAdmin("all"); setResult("all"); setRiskOnly(false); setActionFilter("all"); setQuery(""); setFrom(""); setTo(""); };

  const exportCsv = () =>
    downloadCsv(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ["시각(서울)", "관리자", "이메일", "분류", "액션", "대상·상세", "결과", "위험", "IP"],
      filtered.map((r) => [toSeoulDateTime(r.at), r.admin_name ?? "미식별", r.admin_email ?? "", CATEGORY_LABEL[r.category], actionMeta(r.action).label, r.target ?? "", r.ok ? "성공" : "실패", r.risk ? "Y" : "", r.ip ?? ""]),
    );

  const monthDelta = deltaPct(stats.month, stats.prevMonth);
  const KPIS = [
    { icon: ActivityIcon, tone: "green", label: "당일 이벤트", value: `${stats.today.toLocaleString()}건`, info: "오늘(서울) 활동", infoCls: "text-text-tertiary", delta: null as number | null },
    { icon: ListIcon, tone: "info", label: "당월 이벤트", value: `${stats.month.toLocaleString()}건`, info: "vs 전월", infoCls: "text-text-tertiary", delta: monthDelta },
    { icon: TriangleAlertIcon, tone: "warning", label: "위험 액션(당월)", value: `${stats.riskMonth.toLocaleString()}건`, info: "출금 승인·지급·권한 변경 등", infoCls: "text-warning", delta: null },
    { icon: XCircleIcon, tone: "negative", label: "로그인 실패(당월)", value: `${stats.loginFailMonth.toLocaleString()}건`, info: stats.lockedMonth > 0 ? `계정 잠금 ${stats.lockedMonth}건` : "계정 잠금 없음", infoCls: stats.lockedMonth > 0 ? "text-negative" : "text-text-tertiary", delta: null },
  ] as const;
  const badgeTone: Record<string, string> = { green: "bg-green-50 text-green-700", info: "bg-info-soft text-info", warning: "bg-warning-soft text-warning", negative: "bg-negative-soft text-negative" };

  return (
    <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-4 lg:p-7">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
            <div className="flex items-center gap-2.5">
              <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}><k.icon className="size-[18px]" /></div>
              <span className="text-xs font-medium text-text-secondary">{k.label}</span>
            </div>
            <div className="text-[24px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
            {k.delta !== null ? (
              <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", k.delta > 0 ? "text-positive" : k.delta < 0 ? "text-negative" : "text-text-tertiary")}>
                {k.delta > 0 ? <ArrowUpRightIcon className="size-3" /> : k.delta < 0 ? <ArrowDownRightIcon className="size-3" /> : <ArrowRightIcon className="size-3" />}
                {k.delta > 0 ? "+" : ""}{k.delta.toFixed(1)}% <span className="font-medium text-text-tertiary">{k.info}</span>
              </span>
            ) : (
              <span className={cn("text-[11px] font-medium", k.infoCls)}>{k.delta === null && k.label === "당월 이벤트" ? "전월 기록 없음" : k.info}</span>
            )}
          </div>
        ))}
      </section>

      <Panel bodyClassName="overflow-x-auto">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
            {(["all", ...CATEGORY_ORDER] as Array<"all" | AuditCategory>).map((t) => {
              const on = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)} className={cn("flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[13px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-n-500 hover:text-text-primary")}>
                  {t === "all" ? "전체" : CATEGORY_LABEL[t]}
                  <span className={cn("text-[12px] font-semibold tabular-nums", on ? "text-green-600" : "text-n-400")}>{(counts[t] ?? 0).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={admin} onChange={(e) => setAdmin(e.target.value)} className="rounded-[10px] bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong outline-none">
              <option value="all">전체 관리자</option>
              {admins.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              <option value="anon">미식별(로그인 전)</option>
            </select>
            <select value={result} onChange={(e) => setResult(e.target.value as "all" | "ok" | "fail")} className="rounded-[10px] bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong outline-none">
              <option value="all">성공·실패</option>
              <option value="ok">성공만</option>
              <option value="fail">실패만</option>
            </select>
            <select value={actions.some(([a]) => a === actionFilter) ? actionFilter : "all"} onChange={(e) => setActionFilter(e.target.value)} className="max-w-[180px] rounded-[10px] bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong outline-none">
              <option value="all">모든 액션</option>
              {actions.map(([a, n]) => <option key={a} value={a}>{actionMeta(a).label} ({n})</option>)}
            </select>
            <button onClick={() => setRiskOnly((v) => !v)} className={cn("inline-flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold ring-1 transition-colors", riskOnly ? "bg-warning-soft text-warning ring-warning" : "bg-card text-text-secondary ring-border-strong")}>
              <ShieldAlertIcon className="size-3.5" /> 위험 액션
            </button>
            <div className="flex items-center gap-1.5">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={cn(INPUT, "w-[138px]")} />
              <span className="text-text-tertiary">~</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={cn(INPUT, "w-[138px]")} />
            </div>
            <div className="flex items-center gap-2 rounded-[10px] bg-card px-3 py-2 ring-1 ring-border-strong">
              <SearchIcon className="size-3.5 text-text-tertiary" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="관리자 · 대상 · IP" className="w-[160px] bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
            </div>
            <button onClick={exportCsv} disabled={filtered.length === 0} className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-50">
              <DownloadIcon className="size-4" /> 내보내기
            </button>
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary">적용됨</span>
            {chips.map((c) => (
              <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 py-1 pr-2 pl-3 text-xs font-semibold text-green-700">{c.label} <XIcon className="size-3" /></button>
            ))}
            <button onClick={resetAll} className="inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary"><RotateCcwIcon className="size-3" /> 초기화</button>
          </div>
        ) : null}

        <div className="min-w-[960px]">
          <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
            <span>시각</span><span>관리자</span><span>액션</span><span>대상·상세</span><span>IP</span><span className="text-right">결과</span>
          </div>
          {pageRows.length === 0 ? (
            <div className="grid h-40 place-items-center text-sm text-text-tertiary">{rows.length === 0 ? "기록된 활동이 아직 없습니다. 관리자 로그인·승인·설정 변경이 여기에 쌓입니다." : "조건에 맞는 기록이 없습니다."}</div>
          ) : pageRows.map((r) => {
            const a = actionMeta(r.action);
            const anon = !r.admin_id;
            const open = openId === r.id;
            const rel = relatedHref(r);
            return (
              <div key={r.id} className={cn("border-b last:border-0", r.risk && "bg-warning-soft/30")}>
              <button type="button" onClick={() => setOpenId(open ? null : r.id)} aria-expanded={open} className={cn("grid w-full items-center gap-3 py-3 text-left transition-colors hover:bg-surface-muted/60", COLS)}>
                <span className="flex items-center gap-1 text-[12px] tabular-nums text-text-tertiary"><ChevronDownIcon className={cn("size-3.5 shrink-0 text-n-400 transition-transform", open && "rotate-180")} />{toSeoulDateTime(r.at)}</span>
                <span className="flex min-w-0 items-center gap-2" title={r.admin_email ?? undefined}>
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold", anon ? "bg-n-100 text-n-500" : CATEGORY_AVATAR[r.category])}>
                    {anon ? <UserXIcon className="size-3" /> : (r.admin_name ?? "?").slice(0, 1)}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block truncate text-[13px] font-medium", anon ? "text-text-tertiary" : "text-text-primary")}>{r.admin_name ?? "미식별"}</span>
                    {anon && r.admin_email ? <span className="block truncate text-[10px] text-text-tertiary">{r.admin_email}</span> : null}
                  </span>
                </span>
                <span className="flex items-center gap-1"><Pill tone={a.tone}>{a.label}</Pill>{r.risk ? <ShieldAlertIcon className="size-3.5 text-warning" aria-label="위험 액션" /> : null}</span>
                <span className="truncate text-[13px] text-text-secondary" title={r.target ?? undefined}>{r.target ?? "—"}</span>
                <span className="truncate text-[12px] tabular-nums text-text-tertiary">{r.ip ?? "—"}</span>
                <span className="flex justify-end"><Pill tone={r.ok ? "green" : "negative"} dot={r.ok}>{r.ok ? "성공" : "실패"}</Pill></span>
              </button>
              {open ? (
                <div className="mx-2 mb-3 grid gap-3 rounded-lg bg-surface-muted p-4 text-[12px] ring-1 ring-border lg:grid-cols-[1fr_1fr]">
                  <div className="space-y-1.5">
                    <div><span className="text-text-tertiary">대상·상세 </span><span className="text-text-primary">{r.target ?? "—"}</span></div>
                    <div><span className="text-text-tertiary">관리자 </span><span className="text-text-primary">{r.admin_name ?? "미식별"}{r.admin_email ? ` · ${r.admin_email}` : ""}</span></div>
                    <div><span className="text-text-tertiary">분류 · 액션 코드 </span><span className="font-mono text-text-secondary">{r.category} · {r.action}</span></div>
                    {r.target_id ? <div><span className="text-text-tertiary">대상 ID </span><span className="font-mono text-text-secondary">{r.target_id}</span></div> : null}
                    {rel ? <Link href={rel.href} className="inline-flex items-center gap-1 font-semibold text-green-700 hover:underline">{rel.label} 열기 <ExternalLinkIcon className="size-3" /></Link> : null}
                  </div>
                  <div className="space-y-1.5">
                    <div><span className="text-text-tertiary">IP </span><span className="font-mono text-text-secondary">{r.ip ?? "—"}</span></div>
                    <div className="break-all"><span className="text-text-tertiary">기기 </span><span className="text-text-secondary">{r.user_agent ?? "—"}</span></div>
                    {r.meta ? <pre className="max-h-40 overflow-auto rounded-md bg-card p-2 font-mono text-[11px] text-text-secondary ring-1 ring-border">{JSON.stringify(r.meta, null, 2)}</pre> : null}
                  </div>
                </div>
              ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-text-tertiary">{fromN.toLocaleString()}–{toN.toLocaleString()} / {filtered.length.toLocaleString()}건{rows.length >= 2000 ? " · 최근 2,000건 기준" : ""}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1} className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border disabled:opacity-40"><ChevronLeftIcon className="size-4" /></button>
            {pageNums.map((p) => (
              <button key={p} onClick={() => setPage(p)} className={cn("grid size-8 place-items-center rounded-md text-[13px] font-semibold", p === safePage ? "bg-green-500 text-white" : "text-text-secondary ring-1 ring-border")}>{p}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages} className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border disabled:opacity-40"><ChevronRightIcon className="size-4" /></button>
          </div>
        </div>
      </Panel>
    </div>
  );
}

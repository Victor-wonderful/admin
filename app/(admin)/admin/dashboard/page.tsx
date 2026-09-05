import { currentCycle } from "@/lib/dates";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  LayersIcon,
  UsersIcon,
  CircleCheckIcon,
  BadgeCheckIcon,
  CalculatorIcon,
  CircleArrowUpIcon,
  CalendarIcon,
  ChevronRightIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";

import Link from "next/link";

import { Topbar } from "@/components/shell/topbar";
import { WithdrawalActions } from "@/components/withdrawals/withdrawal-actions";
import type { WithdrawalStatus } from "@/lib/actions/withdrawals";
import { can } from "@/lib/admin-permissions";
import { getMemberRanksMap } from "@/lib/queries/ranks";
import { requireAdminPage } from "@/lib/admin-guard";
import { PAGE_LABEL, type AdminPage } from "@/lib/admin-permissions";
import { ADMIN_ROLE_LABEL } from "@/lib/admin-session";
import { Pill } from "@/components/ui/pill";
import { getMemberStats } from "@/lib/queries/members";
import {
  getSystemWallets,
  getSettlementSummary,
  getWithdrawalStats,
  getRevenueSummary,
  listSettlements,
  listWithdrawals,
  listTransactions,
  getMonthlyRevenueByWeek,
  countRenewalsDue,
} from "@/lib/queries/finance";
import { toUid, uidInitials } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYCLE = currentCycle();

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const usd2 = (n: number) => `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctOf = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const NET_LABEL: Record<string, string> = { TRC20: "Tron", ERC20: "Ethereum", Polygon: "Polygon", BSC: "BSC" };
const netLabel = (n: string | null) => (n ? NET_LABEL[n] ?? n : "—");

// 카드 셸 스타일
const CARD = "rounded-xl bg-card p-[22px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";
const SUBCARD = "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

function relTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  return `${d}일 전`;
}

const TX_META: Record<string, { label: string; icon: typeof UserIcon; tone: "green" | "crypto" | "info" }> = {
  deposit: { label: "충전 입금", icon: ArrowDownLeftIcon, tone: "green" },
  payment: { label: "구독 결제", icon: UserIcon, tone: "info" },
  commission: { label: "정산 입금", icon: UserIcon, tone: "green" },
  withdrawal: { label: "출금", icon: WalletIcon, tone: "crypto" },
};
const STATUS_META: Record<string, { label: string; tone: "green" | "warning" | "info" | "negative" }> = {
  completed: { label: "완료", tone: "green" },
  pending: { label: "대기", tone: "warning" },
  sending: { label: "처리중", tone: "info" },
  approved: { label: "승인됨", tone: "info" },
  failed: { label: "실패", tone: "negative" },
  rejected: { label: "반려", tone: "negative" },
};

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdminPage("dashboard");
  const { denied } = await searchParams;
  const deniedLabel = denied && denied in PAGE_LABEL ? PAGE_LABEL[denied as AdminPage] : null;
  const [stats, wallets, settle, topSettle, wdStats, withdrawals, txns, revenue, weekBars, renewalsDue, ranksMap] = await Promise.all([
    getMemberStats(),
    getSystemWallets(),
    getSettlementSummary(CYCLE),
    listSettlements(CYCLE, 4),
    getWithdrawalStats(),
    listWithdrawals(4),
    listTransactions({ limit: 5 }),
    getRevenueSummary(),
    getMonthlyRevenueByWeek(CYCLE),
    countRenewalsDue(7),
    getMemberRanksMap(),
  ]);
  const canFinance = can(admin.role, "finance.write");
  // 직급 분포 — member_ranks 실산정(R1~R9). R7 이상은 보라.
  const rankDist = Array.from({ length: 9 }, (_, i) => ({ l: `R${i + 1}`, c: 0, crypto: i >= 6 }));
  for (const r of ranksMap.values()) if (r.rank >= 1 && r.rank <= 9) rankDist[r.rank - 1].c++;
  const rankMax = Math.max(1, ...rankDist.map((r) => r.c));
  // 자금 흐름 — 당월 주차별 매출 입금. 현재 주차 강조.
  const weekMax = Math.max(1, ...weekBars);
  const curWeek = Math.min(4, Math.floor((new Date().getUTCDate() - 1) / 7));

  const pool = (k: string) => wallets.find((w) => w.kind === k)?.balance_usd ?? 0;
  const operating = pool("operating");
  const pools = [
    { kind: "pool_commission", name: "수당 풀", desc: "레벨·직급·공유 지급 재원", color: "bg-green-500", tone: "green" as const, bal: pool("pool_commission") },
    { kind: "pool_company", name: "회사 수익", desc: "운영 이익", color: "bg-info", tone: "info" as const, bal: pool("pool_company") },
    { kind: "pool_equity", name: "지분자 배당", desc: "지분 보유자 분배 대기", color: "bg-crypto", tone: "crypto" as const, bal: pool("pool_equity") },
    { kind: "pool_reserve", name: "예비비", desc: "리스크 적립금", color: "bg-n-400", tone: "neutral" as const, bal: pool("pool_reserve") },
  ];
  const poolTotal = pools.reduce((s, p) => s + p.bal, 0);

  const tiers = [
    { name: "등록회원", count: stats.registered, desc: "추천 코드로 가입 · 미결제", icon: UsersIcon, badge: "bg-n-100 text-n-500", conv: null as string | null },
    { name: "구독회원", count: stats.subscriber, desc: "구독 $120/월 또는 상품 결제", icon: CircleCheckIcon, badge: "bg-green-50 text-green-700", conv: stats.registered ? `${pctOf(stats.subscriber, stats.registered)}%` : null },
    { name: "마케터", count: stats.marketer, desc: "연회비 $200/년 · 수당 자격", icon: BadgeCheckIcon, badge: "bg-crypto-soft text-crypto", conv: stats.subscriber ? `${pctOf(stats.marketer, stats.subscriber)}%` : null },
  ];

  const mix = [
    { name: "직접추천수당", amount: settle.level, pct: pctOf(settle.level, settle.total), color: "bg-green-500", dot: "bg-green-500" },
    { name: "직급수당", amount: settle.rank, pct: pctOf(settle.rank, settle.total), color: "bg-info", dot: "bg-info" },
    { name: "공유수당", amount: settle.share, pct: pctOf(settle.share, settle.total), color: "bg-crypto", dot: "bg-crypto" },
  ];

  const kpis = [
    { icon: LayersIcon, badge: "bg-crypto-soft text-crypto", pill: "당월", pillTone: "crypto" as const, value: usd(settle.share), label: "공유수당 (당월)" },
    { icon: CalculatorIcon, badge: "bg-n-100 text-n-500", pill: `${settle.count}명`, pillTone: "neutral" as const, value: usd(settle.total), label: "이번달 정산 예정" },
    { icon: CircleArrowUpIcon, badge: "bg-warning-soft text-warning", pill: `${wdStats.pending}건`, pillTone: "warning" as const, value: usd(wdStats.pendingAmount), label: "출금 대기" },
    { icon: CalendarIcon, badge: "bg-info-soft text-info", pill: "7일 내", pillTone: "info" as const, value: `${renewalsDue}건`, label: "구독 갱신 임박" },
  ];

  return (
    <>
      <Topbar title="대시보드" sub="운영 현황 요약 · 포르투나" uid={admin.display_name} />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {deniedLabel ? (
          <div className="rounded-md bg-warning-soft px-4 py-3 text-[13px] leading-relaxed text-warning ring-1 ring-warning/30">
            <b>{deniedLabel}</b> 화면은 현재 역할({ADMIN_ROLE_LABEL[admin.role]})로 볼 수 없습니다. 권한이 필요하면 슈퍼관리자에게 요청하세요. 이 시도는 감사 로그에 기록됩니다.
          </div>
        ) : null}
        {/* ── 지갑 잔액 + 자금 흐름 ── */}
        <section className={cn(CARD, "space-y-4")}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[13px] font-medium text-text-secondary">어드민 지갑 잔액 · Wallet Balance</div>
              <div className="text-[40px] leading-none font-bold tabular-nums text-text-primary">{usd(operating)}</div>
              <div className="text-xs text-text-tertiary">포르투나 운영 지갑 · {NET_LABEL[wallets.find((w) => w.kind === "operating")?.network ?? ""] ?? "네트워크 미설정"} · USDT</div>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/deposits" className="inline-flex items-center gap-1.5 rounded-[10px] bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700 hover:bg-green-100">
                <ArrowDownLeftIcon className="size-4" /> 입금내역
              </Link>
              <Link href="/admin/withdrawals" className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-semibold text-text-secondary hover:bg-n-100">
                <ArrowUpRightIcon className="size-4" /> 출금내역
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <span className="text-xs font-semibold text-text-secondary">자금 흐름 · 입금/출금</span>
            <span className="text-[11px] font-medium text-text-tertiary">{Number(CYCLE.slice(5, 7))}월 · 주차별 매출 입금</span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr]">
            <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3.5">
              <div className="grid size-8 place-items-center rounded-lg bg-green-50"><ArrowDownLeftIcon className="size-4 text-green-700" /></div>
              <div>
                <div className="text-[11px] font-medium text-text-tertiary">당월 입금 (매출)</div>
                <div className="text-base font-bold tabular-nums text-text-primary">{usd(revenue.monthTotal)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-surface-muted p-3.5">
              <div className="grid size-8 place-items-center rounded-lg bg-surface"><ArrowUpRightIcon className="size-4 text-text-secondary" /></div>
              <div>
                <div className="text-[11px] font-medium text-text-tertiary">당월 출금 (수당)</div>
                <div className="text-base font-bold tabular-nums text-text-primary">{usd(wdStats.monthSum)}</div>
              </div>
            </div>
            <div className="flex items-end gap-2.5 rounded-lg bg-surface-muted px-4 py-3">
              {weekBars.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5" title={`W${i + 1} · ${usd(v)}`}>
                  <div className={cn("w-4 rounded-t", v === 0 ? "bg-n-200" : i === curWeek ? "bg-green-500" : "bg-green-300")} style={{ height: `${v === 0 ? 4 : Math.max(6, Math.round((v / weekMax) * 74))}px` }} />
                  <span className={cn("text-[10px]", i === curWeek ? "font-semibold text-text-secondary" : "text-text-tertiary")}>W{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 배분 풀 잔액 ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-text-primary">배분 풀 잔액</h3>
              <p className="text-xs text-text-tertiary">매출 배분 구조에 따른 풀별 보유 잔액 · USDT</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-1.5 ring-1 ring-border">
              <span className="text-xs font-medium text-text-tertiary">합계</span>
              <span className="text-[13px] font-bold text-text-primary tabular-nums">{usd(poolTotal)}</span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pools.map((p) => {
              const pct = pctOf(p.bal, poolTotal);
              return (
                <div key={p.kind} className={cn(SUBCARD, "space-y-3")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">{p.name}</span>
                    <Pill tone={p.tone}>{pct}%</Pill>
                  </div>
                  <div className="text-[22px] font-bold tabular-nums text-text-primary">{usd(p.bal)}</div>
                  <div className="h-[7px] overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", p.color)} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[11px] text-text-tertiary">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 회원 현황 ── */}
        <section className={cn(CARD, "space-y-4")}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold text-text-primary">회원 현황 · Members</h3>
              <p className="text-xs text-text-tertiary">등록회원 → 구독회원 → 마케터</p>
            </div>
            <span className="text-[13px] font-semibold text-text-secondary">전체 {stats.total.toLocaleString()}명</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {tiers.map((t) => (
              <div key={t.name} className={cn(SUBCARD, "space-y-3.5")}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("grid size-8 place-items-center rounded-lg", t.badge)}><t.icon className="size-4" /></div>
                    <span className="text-[13px] font-semibold text-text-primary">{t.name}</span>
                  </div>
                  {t.conv ? <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">전환 {t.conv}</span> : null}
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-[32px] leading-none font-bold tabular-nums text-text-primary">{t.count.toLocaleString()}</span>
                  <span className="pb-0.5 text-sm font-medium text-text-secondary">명</span>
                </div>
                <p className="text-xs text-text-secondary">{t.desc}</p>
                <div className="space-y-2 border-t pt-3">
                  <div className="text-[11px] font-semibold tracking-wide text-text-tertiary">신규 가입</div>
                  <div className="flex items-end gap-1">
                    {[5, 8, 6, 11, 9, 14, 12].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-green-200" style={{ height: `${h * 2}px` }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── KPI 4종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3.5")}>
              <div className="flex items-center justify-between">
                <div className={cn("grid size-9 place-items-center rounded-[10px]", k.badge)}><k.icon className="size-[18px]" /></div>
                <Pill tone={k.pillTone}>{k.pill}</Pill>
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums text-text-primary">{k.value}</div>
                <div className="mt-0.5 text-xs font-medium text-text-secondary">{k.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── 수당 구성 + 상위 마케터 ── */}
        <section className="grid gap-[18px] lg:grid-cols-2">
          {/* MixCard */}
          <div className={cn(CARD, "flex flex-col gap-4")}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-text-primary">수당 구성 · 6월</h3>
                <p className="text-xs text-text-tertiary">총 {usd(settle.total)} 지급 예정</p>
              </div>
              <span className="text-xs font-semibold text-text-tertiary">3종</span>
            </div>
            <div className="space-y-3.5">
              {mix.map((m) => (
                <div key={m.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] font-medium text-text-primary">
                      <span className={cn("size-2.5 rounded-full", m.dot)} />
                      {m.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-bold tabular-nums text-text-primary">{usd(m.amount)}</span>
                      <span className="text-xs font-semibold text-text-tertiary">{m.pct}%</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", m.color)} style={{ width: `${m.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between border-t pt-3.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <LayersIcon className="size-3.5 text-crypto" /> 공유수당풀 잔액
              </span>
              <span className="text-sm font-bold text-crypto tabular-nums">{usd(settle.share)}</span>
            </div>
          </div>

          {/* TopMarketers */}
          <div className={cn(CARD, "flex flex-col gap-3.5")}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-text-primary">상위 마케터</h3>
              <span className="text-xs font-medium text-green-700">이번 달</span>
            </div>
            <div className="space-y-3">
              {topSettle.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <span className="w-3.5 text-[13px] font-bold text-n-300">{i + 1}</span>
                  <div className="grid size-8 place-items-center rounded-[10px] bg-green-50 text-[11px] font-bold text-green-700">
                    {uidInitials(s.member_id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{toUid(s.member_id)}</div>
                    <div className="text-[11px] text-text-tertiary">당월 수당</div>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd(s.total_amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-center gap-1.5 border-t pt-3.5 text-xs font-medium text-text-secondary">
              전체 마케터 보기 <ChevronRightIcon className="size-3.5 text-text-tertiary" />
            </div>
          </div>
        </section>

        {/* ── 출금 승인 대기 + 직급 분포 ── */}
        <section className="grid gap-[18px] lg:grid-cols-2">
          {/* WithdrawQueue */}
          <div className={cn(CARD, "flex flex-col gap-3")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-text-primary">출금 승인 대기</h3>
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">{wdStats.pending}건</span>
              </div>
              <Link href="/admin/withdrawals" className="text-xs font-medium text-text-tertiary hover:text-text-primary hover:underline">전체 보기</Link>
            </div>
            <div>
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center gap-3 border-b py-3 last:border-0">
                  <div className="grid size-8 place-items-center rounded-[10px] bg-crypto-soft"><ArrowUpRightIcon className="size-[15px] text-crypto" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{toUid(w.member_id)}</div>
                    <div className="text-[11px] text-text-tertiary">{netLabel(w.network)} · {relTime(w.requested_at)}</div>
                  </div>
                  <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd2(w.amount_usd)}</span>
                  <WithdrawalActions id={w.id} status={w.status as WithdrawalStatus} network={w.network} txHash={w.tx_hash} readOnly={!canFinance} />
                </div>
              ))}
            </div>
          </div>

          {/* RankDist */}
          <div className={cn(CARD, "flex flex-col gap-4")}>
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-text-primary">직급 분포</h3>
              <span className="text-xs font-medium text-text-tertiary">마케터 {stats.marketer.toLocaleString()}명</span>
            </div>
            <div className="flex flex-1 items-end gap-2">
              {rankDist.map((r) => (
                <div key={r.l} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-semibold text-text-secondary">{r.c}</span>
                  <div className={cn("w-full rounded-t", r.crypto ? "bg-crypto" : "bg-green-500")} style={{ height: `${Math.max(3, Math.round((r.c / rankMax) * 130))}px` }} />
                  <span className="text-[10px] text-text-tertiary">{r.l}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 최근 온체인 입·출금 ── */}
        <section className={cn(CARD, "space-y-1")}>
          <div className="flex items-center justify-between pb-2.5">
            <div>
              <h3 className="text-[15px] font-semibold text-text-primary">최근 온체인 입·출금</h3>
              <p className="text-xs text-text-tertiary">실시간 트랜잭션</p>
            </div>
            <Link href="/admin/transactions" className="inline-flex items-center gap-1 rounded-[10px] bg-surface-muted px-3 py-1.5 text-xs font-medium text-text-secondary ring-1 ring-border hover:bg-n-100">
              전체 보기 <ChevronRightIcon className="size-3.5 text-text-tertiary" />
            </Link>
          </div>
          <div>
            {txns.map((t) => {
              const meta = TX_META[t.tx_type] ?? TX_META.payment;
              const st = STATUS_META[t.status] ?? STATUS_META.completed;
              const negative = t.tx_type === "withdrawal";
              const Icon = meta.icon;
              return (
                <div key={t.id} className="flex items-center gap-3 border-b py-3 last:border-0">
                  <div className={cn("grid size-9 place-items-center rounded-full", meta.tone === "green" ? "bg-green-50" : meta.tone === "crypto" ? "bg-crypto-soft" : "bg-info-soft")}>
                    <Icon className={cn("size-4", meta.tone === "green" ? "text-green-700" : meta.tone === "crypto" ? "text-crypto" : "text-info")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-text-primary">{toUid(t.member_id)}</div>
                    <div className="text-xs text-text-tertiary">{meta.label} · {netLabel(t.network)}</div>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", negative ? "text-text-primary" : "text-positive")}>
                    {negative ? "−" : "+"} {usd2(t.amount_usd)}
                  </span>
                  <span className="w-[72px] text-right">
                    <Pill tone={st.tone} dot>{st.label}</Pill>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}

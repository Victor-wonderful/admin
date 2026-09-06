import Link from "next/link";
import {
  CalendarCheckIcon,
  TrendingUpIcon,
  SigmaIcon,
  CoinsIcon,
  RotateCcwIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { can } from "@/lib/admin-permissions";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { AllocateRevenueButton } from "@/components/revenue/allocate-revenue-button";
import { getRevenueSummary, getCycleAllocation } from "@/lib/queries/finance";
import { getRevenueExtras } from "@/lib/queries/admin-finance";
import { getCompSettings } from "@/lib/queries/comp-settings";
import { currentCycle } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 매출현황 — ?cycle=YYYY-MM 로 과거 달 조회. 배분 카드는 비율×매출 추정이 아니라 배분 원장(revenue_allocations) 실제 값.
const CYCLE_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
function shiftCycle(cycle: string, delta: number): string {
  const [y, m] = cycle.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const usd1 = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : usd(n));
const pctOf = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);
const deltaPct = (cur: number, prev: number): number | null => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  negative: "bg-negative-soft text-negative",
  neutral: "bg-n-100 text-n-500",
};

function Delta({ value, label, muted }: { value: number | null; label: string; muted?: boolean }) {
  if (value === null) {
    return <span className="text-[11px] font-medium text-text-tertiary">{label}</span>;
  }
  const up = value > 0, flat = value === 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", flat || muted ? "text-text-tertiary" : up ? "text-positive" : "text-negative")}>
      {flat ? <ArrowRightIcon className="size-3" /> : up ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
      {up ? "+" : ""}{value.toFixed(1)}%
      <span className="font-medium text-text-tertiary">{label}</span>
    </span>
  );
}

export default async function AdminRevenuePage({ searchParams }: { searchParams: Promise<{ cycle?: string }> }) {
  const admin = await requireAdminPage("revenue");
  const readOnly = !can(admin.role, "finance.write");
  const sp = await searchParams;
  const NOW = currentCycle();
  const cycle = sp.cycle && CYCLE_RE.test(sp.cycle) && sp.cycle <= NOW ? sp.cycle : NOW;
  const isCurrent = cycle === NOW;
  const [rev, x, alloc, settings] = await Promise.all([getRevenueSummary(cycle), getRevenueExtras(cycle), getCycleAllocation(cycle), getCompSettings()]);
  const cycleLabel = `${cycle.slice(0, 4)}년 ${Number(cycle.slice(5, 7))}월`;
  const m = rev.monthTotal;
  const monthDelta = deltaPct(m, x.prevMonthTotal);
  const TREND = x.trend.map((t) => ({ m: String(Number(t.cycle.slice(5, 7))), e: t.sub, a: t.membership, p: t.product }));
  const TREND_MAX = Math.max(1, ...TREND.map((t) => t.e + t.a + t.p));
  const prev = x.trend.length >= 2 ? x.trend[x.trend.length - 2] : null; // 직전 사이클(항목별 전월 대비)
  const cnt = rev.monthSubCount + rev.monthAnnualCount + rev.monthProductCount;
  const arpu = cnt > 0 ? m / cnt : 0;
  const subPct = pctOf(rev.monthSub, m);
  const annPct = pctOf(rev.monthAnnual, m);
  const prodPct = rev.monthProduct > 0 ? Math.max(0, 100 - subPct - annPct) : 0;

  const KPIS = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 매출 (USDT)", value: usd(x.todayAmount), delta: null as number | null, deltaLabel: `오늘 ${x.todayCount}건` },
    { icon: TrendingUpIcon, tone: "green" as const, label: `${isCurrent ? "당월" : cycleLabel} 매출 (USDT)`, value: usd(m), delta: monthDelta, deltaLabel: monthDelta == null ? `${cycleLabel} · 전월 매출 없음` : "vs 전월" },
    { icon: SigmaIcon, tone: "neutral" as const, label: "누적 매출", value: usd(rev.total), delta: null, deltaLabel: "전체 기간" },
    { icon: CoinsIcon, tone: "crypto" as const, label: "객단가 (ARPU)", value: usd1(arpu), delta: null, deltaLabel: `${cnt.toLocaleString()}건 기준` },
    { icon: RotateCcwIcon, tone: "info" as const, label: `${isCurrent ? "당월" : "해당 월"} 상품 매출`, value: usd(rev.monthProduct), delta: null, deltaLabel: `${rev.monthProductCount}건 · 배분 포함` },
  ];

  // 배분 카드 — 원장 실제 값. 원장이 없으면(그 달 결제 0건) 비율×매출 추정 표기.
  const ALLOC = [
    { key: "pool_commission" as const, label: "수당 풀", pct: settings.alloc_commission_pct, color: "bg-green-500", soft: "text-green-700" },
    { key: "pool_company" as const, label: "회사 수익", pct: settings.alloc_company_pct, color: "bg-info", soft: "text-info" },
    { key: "pool_equity" as const, label: "지분자 배당", pct: settings.alloc_equity_pct, color: "bg-crypto", soft: "text-crypto" },
    { key: "pool_reserve" as const, label: "예비비", pct: settings.alloc_reserve_pct, color: "bg-n-400", soft: "text-n-600" },
  ].map((a) => ({ ...a, value: alloc ? alloc[a.key] : (m * a.pct) / 100 }));
  const allocMismatch = alloc !== null && Math.abs(alloc.revenue_total - m) > 0.5;

  const COMPOSITION = [
    { label: "포르투나 구독", value: usd(rev.monthSub), pct: subPct, dot: "bg-green-500" },
    { label: "파트너 멤버십", value: usd(rev.monthAnnual), pct: annPct, dot: "bg-crypto" },
    { label: "상품", value: usd(rev.monthProduct), pct: prodPct, dot: "bg-info" },
  ];
  const donut = m > 0
    ? `conic-gradient(#1f9d55 0 ${subPct}%, #7c3aed ${subPct}% ${subPct + annPct}%, #2f6fed ${subPct + annPct}% 100%)`
    : "conic-gradient(#e5e7eb 0 100%)";

  const PRODUCTS = [
    { name: "포르투나 구독", price: "$120 / 월", dot: "bg-green-500", count: rev.monthSubCount, value: rev.monthSub, pct: subPct, avg: rev.monthSubCount ? rev.monthSub / rev.monthSubCount : 0, prev: prev?.sub ?? 0 },
    { name: "파트너 멤버십", price: "$200 / 년", dot: "bg-crypto", count: rev.monthAnnualCount, value: rev.monthAnnual, pct: annPct, avg: rev.monthAnnualCount ? rev.monthAnnual / rev.monthAnnualCount : 0, prev: prev?.membership ?? 0 },
    { name: "상품(카탈로그)", price: "상품별 가격", dot: "bg-info", count: rev.monthProductCount, value: rev.monthProduct, pct: prodPct, avg: rev.monthProductCount ? rev.monthProduct / rev.monthProductCount : 0, prev: prev?.product ?? 0 },
  ];

  const navBtn = "grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border hover:bg-surface-muted";

  return (
    <>
      <Topbar
        title="매출현황"
        sub="포르투나 · 수익 분석 · USDT"
        uid={admin.display_name}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/admin/revenue?cycle=${shiftCycle(cycle, -1)}`} aria-label="이전 달" className={navBtn}><ChevronLeftIcon className="size-4" /></Link>
            <span className="text-sm font-bold text-text-primary">{cycleLabel}{isCurrent ? <span className="ml-1.5 text-[11px] font-semibold text-green-700">당월</span> : null}</span>
            {isCurrent ? (
              <span aria-disabled className={cn(navBtn, "opacity-40 hover:bg-transparent")}><ChevronRightIcon className="size-4" /></span>
            ) : (
              <Link href={`/admin/revenue?cycle=${shiftCycle(cycle, 1)}`} aria-label="다음 달" className={navBtn}><ChevronRightIcon className="size-4" /></Link>
            )}
            {!isCurrent ? <Link href="/admin/revenue" className="text-[12px] font-medium text-text-secondary underline-offset-2 hover:underline">이번 달로</Link> : null}
          </div>
        }
      />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-4 lg:p-7">
        {/* ── 상단 KPI 5종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}>
                  <k.icon className="size-[18px]" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[26px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              <Delta value={k.delta} label={k.deltaLabel} />
            </div>
          ))}
        </section>

        {/* ── 매출 배분 (원장) ── */}
        <Panel
          title={`${isCurrent ? "당월" : cycleLabel} 매출 배분`}
          sub={alloc ? `배분 원장 기준 · ${settings.alloc_commission_pct}/${settings.alloc_company_pct}/${settings.alloc_equity_pct}/${settings.alloc_reserve_pct} · USDT` : "이 달 배분 원장 없음(결제 0건) · 현재 비율로 추정 표기"}
          action={
            <div className="flex items-center gap-2.5">
              {allocMismatch ? <Pill tone="warning">원장 {usd(alloc!.revenue_total)} ≠ 매출 {usd(m)} · 재배분 필요</Pill> : <Pill tone="green">합계 100%</Pill>}
              <AllocateRevenueButton cycle={cycle} readOnly={readOnly} />
            </div>
          }
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="flex flex-col justify-center rounded-lg bg-feature px-6 py-5 text-white lg:w-60">
              <div className="text-xs font-medium text-white/60">{cycleLabel} 매출 (총액)</div>
              <div className="mt-1.5 text-[32px] leading-none font-bold tabular-nums">{usd(m)}</div>
              <div className="mt-2 text-[11px] text-white/45">100% · 결제마다 자동 배분 · 비율은 수당체계·직급에서 변경</div>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
              {ALLOC.map((a) => (
                <div key={a.label} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">{a.label}</span>
                    <span className={cn("text-xs font-bold", a.soft)}>{a.pct}%</span>
                  </div>
                  <div className="mt-2 text-lg font-bold tabular-nums text-text-primary">{usd(a.value)}</div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", a.color)} style={{ width: `${a.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {/* ── 매출 추이 + 매출 구성 ── */}
        <div className="grid gap-[18px] lg:grid-cols-[1fr_388px]">
          <Panel title="매출 추이" sub="최근 12개월 · 항목별 (USDT) · 막대 클릭으로 그 달 보기" action={<span className="rounded-md bg-surface-muted px-2.5 py-1.5 text-[12px] font-medium text-text-secondary ring-1 ring-border">{x.trend[0]?.cycle} ~ {cycle}</span>}>
            <div className="mb-4 flex items-center gap-4">
              {COMPOSITION.map((c) => (
                <span key={c.label} className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
                  <span className={cn("size-2.5 rounded-full", c.dot)} />
                  {c.label}
                </span>
              ))}
            </div>
            <div className="flex h-52 items-end gap-2">
              {TREND.map((t, i) => {
                const total = t.e + t.a + t.p;
                const last = i === TREND.length - 1;
                const c = x.trend[i].cycle;
                return (
                  <Link key={c} href={c === NOW ? "/admin/revenue" : `/admin/revenue?cycle=${c}`} className="group flex h-full flex-1 flex-col items-center gap-1.5" title={`${c} · ${usd(total)} · 클릭하면 이 달로 이동`}>
                    <div className="flex w-full flex-1 flex-col justify-end">
                      {total > 0 ? (
                        <div className={cn("flex w-full flex-col justify-end overflow-hidden rounded-t transition-opacity group-hover:opacity-80", last && "ring-2 ring-green-500/30")} style={{ height: `${Math.max(2, (total / TREND_MAX) * 100)}%` }}>
                          <div className="bg-info" style={{ height: `${(t.p / total) * 100}%` }} />
                          <div className="bg-crypto" style={{ height: `${(t.a / total) * 100}%` }} />
                          <div className={cn(last ? "bg-green-600" : "bg-green-500")} style={{ height: `${(t.e / total) * 100}%` }} />
                        </div>
                      ) : <div className="h-0.5 w-full rounded bg-n-200" />}
                    </div>
                    <span className={cn("text-[10px]", last ? "font-semibold text-text-secondary" : "text-text-tertiary group-hover:text-text-primary")}>{last ? (isCurrent ? "이번달" : `${t.m}월`) : `${t.m}월`}</span>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="매출 구성" sub={`${cycleLabel} · 구독·멤버십·상품 전부 배분 대상`}>
            <div className="flex flex-col items-center gap-5">
              <div className="relative grid size-44 place-items-center rounded-full" style={{ background: donut }}>
                <div className="grid size-28 place-items-center rounded-full bg-card text-center">
                  <div>
                    <div className="text-[22px] font-bold tabular-nums text-text-primary">{compact(m)}</div>
                    <div className="text-[11px] text-text-tertiary">{isCurrent ? "당월" : cycleLabel} 매출</div>
                  </div>
                </div>
              </div>
              <div className="w-full space-y-2.5">
                {COMPOSITION.map((c) => (
                  <div key={c.label} className="flex items-center gap-2.5">
                    <span className={cn("size-2.5 rounded-full", c.dot)} />
                    <span className="flex-1 text-[13px] font-medium text-text-secondary">{c.label}</span>
                    <span className="text-[13px] font-bold tabular-nums text-text-primary">{c.value}</span>
                    <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── 반복매출(MRR) + 결제 수단 ── */}
        <div className="grid gap-[18px] lg:grid-cols-2">
          <Panel title="반복매출 (MRR)" sub={`${cycleLabel} 구독 결제 기준 월반복 매출 · USDT`}>
            <div className="flex items-end justify-between">
              <div className="text-[34px] leading-none font-bold tabular-nums text-text-primary">{usd(rev.monthSub)}</div>
              <span className="pb-1 text-[13px] font-semibold text-text-tertiary">ARR {compact(rev.monthSub * 12)}</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { l: "구독 결제", v: `${rev.monthSubCount.toLocaleString()}건`, tone: "text-text-primary", s: `${cycleLabel} 결제 건수` },
                { l: "갱신율", v: x.renewRate == null ? "—" : `${x.renewRate.toFixed(1)}%`, tone: "text-positive", s: `갱신 ${x.renewals}건` },
                { l: "이탈률 (churn)", v: x.churnRate == null ? "—" : `${x.churnRate.toFixed(1)}%`, tone: "text-negative", s: `만료 후 미갱신 ${x.expiredNoRenew}명` },
              ].map((k) => (
                <div key={k.l} className="rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                  <div className="text-[11px] font-medium text-text-tertiary">{k.l}</div>
                  <div className={cn("mt-1.5 text-xl font-bold tabular-nums", k.tone)}>{k.v}</div>
                  <div className="mt-0.5 text-[11px] text-text-tertiary">{k.s}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="결제 수단" sub="모든 결제는 회원 지갑 잔액(USDT) 차감 · 온체인 입금은 지갑잔액 화면에서">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-3 ring-1 ring-border">
                <span className="text-[13px] font-semibold text-text-primary">지갑 잔액 결제</span>
                <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd(m)} · 100%</span>
              </div>
              <div className="text-[11px] leading-relaxed text-text-tertiary">
                회원은 회사 입금 주소(Tron TRC20 / BSC BEP20)로 USDT 를 보내 잔액을 채우고, 구독·멤버십·상품은 그 잔액에서 결제됩니다. 체인별 입금 비중은 <Link href="/admin/wallet" className="font-medium text-text-secondary underline-offset-2 hover:underline">지갑잔액 화면</Link>의 ‘체인별 입출금’에 있습니다.
              </div>
            </div>
          </Panel>
        </div>

        {/* ── 상품별 매출 ── */}
        <Panel
          title="상품별 매출"
          sub={`${cycleLabel} · 결제수단 USDT · 전월 대비 = 직전 달 같은 항목 매출 기준`}
          action={<Link href="/admin/orders" className="rounded-md bg-surface-muted px-2.5 py-1.5 text-[12px] font-medium text-text-secondary ring-1 ring-border hover:bg-n-100">구독·주문 상세 →</Link>}
          bodyClassName="overflow-x-auto"
        >
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[2fr_1fr_1fr_2.4fr_1.2fr] gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
              <span>상품</span>
              <span className="text-right">건수</span>
              <span className="text-right">평균 결제액</span>
              <span>매출 · 점유율</span>
              <span className="text-right">전월 대비</span>
            </div>
            {PRODUCTS.map((p) => {
              const d = deltaPct(p.value, p.prev);
              return (
                <div key={p.name} className="grid grid-cols-[2fr_1fr_1fr_2.4fr_1.2fr] items-center gap-3 border-b py-3.5 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={cn("size-8 shrink-0 rounded-[10px]", p.dot, "opacity-90")} />
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-text-primary">{p.name}</div>
                      <div className="text-[11px] text-text-tertiary">{p.price}</div>
                    </div>
                  </div>
                  <span className="text-right text-[13px] tabular-nums text-text-secondary">{p.count.toLocaleString()}건</span>
                  <span className="text-right text-[13px] tabular-nums text-text-secondary">{usd1(p.avg)}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="w-16 text-[13px] font-bold tabular-nums text-text-primary">{usd(p.value)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-n-100">
                      <div className={cn("h-full rounded-full", p.dot)} style={{ width: `${p.pct}%` }} />
                    </div>
                    <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{p.pct}%</span>
                  </div>
                  <span className="flex flex-col items-end text-right">
                    {d === null ? (
                      <span className="text-[12px] text-text-tertiary">{p.value > 0 ? "전월 0 → 신규" : "—"}</span>
                    ) : (
                      <Delta value={d} label={`전월 ${usd(p.prev)}`} />
                    )}
                  </span>
                </div>
              );
            })}
            <div className="grid grid-cols-[2fr_1fr_1fr_2.4fr_1.2fr] items-center gap-3 pt-3.5 text-[13px] font-bold text-text-primary">
              <span>합계</span>
              <span className="text-right tabular-nums text-text-secondary">{cnt.toLocaleString()}건</span>
              <span className="text-right tabular-nums text-text-secondary">{usd1(arpu)}</span>
              <span className="tabular-nums">{usd(m)}</span>
              <span className="flex justify-end">{monthDelta === null ? <span className="text-text-tertiary">—</span> : <Delta value={monthDelta} label={`전월 ${usd(x.prevMonthTotal)}`} />}</span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

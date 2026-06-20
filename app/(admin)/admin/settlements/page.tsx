import {
  CoinsIcon,
  Share2Icon,
  LayersIcon,
  UsersIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SlidersHorizontalIcon,
  DownloadIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { RunSettlementButton } from "@/components/settlements/run-settlement-button";
import { PayCommissionButton } from "@/components/settlements/pay-commission-button";
import { ConfirmSettlementsButton } from "@/components/settlements/confirm-settlements-button";
import { getSettlementSummary, listSettlements, getPoolReconciliation } from "@/lib/queries/finance";
import { getMemberRanksMap } from "@/lib/queries/ranks";
import { toUid, uidInitials } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYCLE = "2026-06";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : usd(n));
const pctOf = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);

const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-n-100 text-n-500",
};

const COLS = "grid-cols-[1.7fr_1fr_1fr_1fr_1.1fr_120px]";

function statusPill(status: string) {
  if (status === "paid") return <Pill tone="green" dot>지급 완료</Pill>;
  if (status === "held") return <Pill tone="neutral">보류</Pill>;
  if (status === "confirmed") return <Pill tone="info">확정</Pill>;
  return <Pill tone="neutral">산정</Pill>;
}

// 마케터 직급 뱃지 (R1~R9). 무직급/미산정은 표시 안 함.
function rankPill(rank: number | undefined) {
  if (!rank || rank <= 0) return null;
  return (
    <span className="shrink-0 rounded-[5px] bg-crypto-soft px-1.5 py-0.5 text-[10px] font-bold text-crypto">R{rank}</span>
  );
}

export default async function AdminSettlementsPage() {
  const [sum, rows, recon, ranks] = await Promise.all([
    getSettlementSummary(CYCLE),
    listSettlements(CYCLE, 8),
    getPoolReconciliation(CYCLE),
    getMemberRanksMap(),
  ]);

  const lpct = pctOf(sum.level, sum.total);
  const rpct = pctOf(sum.rank, sum.total);
  const spct = pctOf(sum.share, sum.total);
  const payRate = recon.computed_payout > 0 ? Math.round((recon.paid_out / recon.computed_payout) * 100) : 0;

  // 파이프라인 상태(산정→확정→지급)를 실제 settlements 상태로 표시
  const st = sum.status;
  const PIPELINE = [
    { label: "산정 완료", state: sum.count > 0 ? "done" : "todo" },
    { label: "확정 검토", state: st.paid > 0 || st.confirmed > 0 ? "done" : st.calculated > 0 ? "current" : "todo" },
    { label: "지급 실행", state: st.paid > 0 ? "done" : st.confirmed > 0 ? "current" : "todo" },
  ];

  const KPIS = [
    { icon: CoinsIcon, tone: "green" as const, label: "당월 수당 총액", value: usd(sum.total), info: `${sum.count.toLocaleString()}명`, warn: false },
    { icon: Share2Icon, tone: "green" as const, label: "직접추천수당", value: usd(sum.level), info: `구성 ${lpct}%`, warn: false },
    { icon: LayersIcon, tone: "crypto" as const, label: "직급수당", value: usd(sum.rank), info: `구성 ${rpct}%`, warn: false },
    { icon: UsersIcon, tone: "info" as const, label: "공유수당", value: usd(sum.share), info: `구성 ${spct}%`, warn: false },
    { icon: ClockIcon, tone: "warning" as const, label: "미지급", value: usd(recon.computed_payout - recon.paid_out), info: "지급 대기", warn: true },
  ];

  const COMPOSITION = [
    { label: "직접추천수당", sub: "직추 체인 1·2대", value: usd(sum.level), pct: lpct, dot: "bg-green-500" },
    { label: "직급수당", sub: "R1~R9 차액차등", value: usd(sum.rank), pct: rpct, dot: "bg-crypto" },
    { label: "공유수당", sub: "직급별 누적배분", value: usd(sum.share), pct: spct, dot: "bg-info" },
  ];

  const donut = `conic-gradient(#1f9d55 0 ${lpct}%, #7c3aed ${lpct}% ${lpct + rpct}%, #2f6fed ${lpct + rpct}% 100%)`;

  const POOL = [
    { label: "수당풀 배분 (매출 60%)", value: usd(recon.pool_allocated), tone: "text-text-primary" },
    { label: "엔진 산정 합계", value: `−${usd(recon.computed_payout)}`, tone: "text-text-primary" },
    { label: "실지급 누적", value: `−${usd(recon.paid_out)}`, tone: "text-negative" },
    { label: "풀 잔여", value: usd(recon.remaining), tone: "text-positive" },
  ];

  return (
    <>
      <Topbar title="수당 정산" sub="산정 → 직접추천 · 직급 · 공유 수당 · USDT" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
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
              <span className={cn("text-[11px] font-medium", k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
            </div>
          ))}
        </section>

        {/* ── 정산 액션 바 ── */}
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronLeftIcon className="size-4" /></button>
              <span className="text-sm font-bold text-text-primary">2026년 6월 정산</span>
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronRightIcon className="size-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              {PIPELINE.map((p, i) => (
                <div key={p.label} className="flex items-center gap-2">
                  <span className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    p.state === "done" ? "bg-green-50 text-green-700" : p.state === "current" ? "bg-warning-soft text-warning" : "bg-surface-muted text-text-tertiary",
                  )}>{p.label}</span>
                  {i < PIPELINE.length - 1 ? <ChevronRightIcon className="size-3 text-text-tertiary" /> : null}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <RunSettlementButton cycle={CYCLE} />
              <ConfirmSettlementsButton cycle={CYCLE} />
              <PayCommissionButton cycle={CYCLE} />
            </div>
          </div>
        </Panel>

        {/* ── 수당 구성 + 수당 풀 정합 ── */}
        <div className="grid gap-[18px] lg:grid-cols-[1fr_388px]">
          <Panel title="수당 구성" sub="당월 · 직접추천 · 직급 · 공유 USDT">
            <div className="flex items-center gap-7">
              <div className="relative grid size-40 shrink-0 place-items-center rounded-full" style={{ background: donut }}>
                <div className="grid size-[104px] place-items-center rounded-full bg-card text-center">
                  <div>
                    <div className="text-[21px] font-bold tabular-nums text-text-primary">{compact(sum.total)}</div>
                    <div className="text-[11px] text-text-tertiary">당월 수당</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3.5">
                {COMPOSITION.map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className={cn("mt-0.5 size-2.5 shrink-0 rounded-full", c.dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold text-text-primary">{c.label}</div>
                      <div className="text-[11px] text-text-tertiary">{c.sub}</div>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums text-text-primary">{c.value}</span>
                    <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="수당 풀 정합" action={<Pill tone={recon.over_pool ? "negative" : "green"}>소진율 {recon.utilization_pct}%</Pill>}>
            <div className="rounded-lg bg-green-50 px-4 py-3.5">
              <div className="text-xs font-medium text-green-700">수당 풀 (매출 60%)</div>
              <div className="text-[28px] leading-none font-bold tabular-nums text-green-700">{usd(recon.pool_allocated)}</div>
            </div>
            <div className="mt-3 divide-y divide-border">
              {POOL.map((p) => (
                <div key={p.label} className="flex items-center justify-between py-2.5">
                  <span className="text-[13px] text-text-secondary">{p.label}</span>
                  <span className={cn("text-[13px] font-bold tabular-nums", p.tone)}>{p.value}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── 마케터별 정산 ── */}
        <Panel
          title="마케터별 정산"
          sub={`${CYCLE} · 상위 ${rows.length}명 · 지급 USDT`}
          action={
            <div className="flex items-center gap-2">
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><SlidersHorizontalIcon className="size-4" /> 상태</button>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
            </div>
          }
          bodyClassName="overflow-x-auto"
        >
          <div className="min-w-[760px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>회원</span>
              <span className="text-right">직접추천</span>
              <span className="text-right">직급</span>
              <span className="text-right">공유</span>
              <span className="text-right">합계</span>
              <span className="text-right">상태</span>
            </div>
            {rows.map((r) => (
              <div key={r.id} className={cn("grid items-center gap-3 border-b py-3.5 last:border-0", COLS)}>
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">{uidInitials(r.member_id)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[13px] font-semibold text-text-primary">{toUid(r.member_id)}</span>
                      {rankPill(ranks.get(r.member_id)?.rank)}
                    </div>
                    <span className="text-[10px] text-text-tertiary">마케터 · 당월 수당</span>
                  </div>
                </div>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{usd(r.level_amount)}</span>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{usd(r.rank_amount)}</span>
                <span className="text-right text-[13px] tabular-nums text-text-secondary">{usd(r.share_amount)}</span>
                <span className="text-right text-[13px] font-bold tabular-nums text-text-primary">{usd(r.total_amount)}</span>
                <span className="flex justify-end">{statusPill(r.status)}</span>
              </div>
            ))}
            <div className={cn("grid items-center gap-3 pt-3.5 text-[13px] font-bold text-text-primary", COLS)}>
              <span>당월 합계 · {sum.count.toLocaleString()}명</span>
              <span className="text-right tabular-nums text-text-secondary">{usd(sum.level)}</span>
              <span className="text-right tabular-nums text-text-secondary">{usd(sum.rank)}</span>
              <span className="text-right tabular-nums text-text-secondary">{usd(sum.share)}</span>
              <span className="text-right tabular-nums">{usd(sum.total)}</span>
              <span className="flex justify-end"><Pill tone="green">지급률 {payRate}%</Pill></span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

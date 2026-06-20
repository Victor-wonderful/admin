import {
  CoinsIcon,
  SigmaIcon,
  Share2Icon,
  UsersIcon,
  TrophyIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { WithdrawalRequestModal } from "@/components/withdrawals/withdrawal-request-modal";
import { getMajorMinor } from "@/lib/queries/legs";
import { getMemberRank } from "@/lib/queries/ranks";
import { getMemberWalletData, getMemberSettlement, getMemberCumulativeCommission } from "@/lib/queries/finance";
import { getMarketerViewerId } from "@/lib/session";
import { toUid } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYCLE = "2026-06";
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const signed = (n: number) => (n >= 0 ? `+${usd(n)}` : `−${usd(Math.abs(n))}`);
const pct = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);

export default async function MarketerDashboardPage() {
  const ME = await getMarketerViewerId();
  const [mm, rank, wd, settle, cumulative] = await Promise.all([
    getMajorMinor(ME),
    getMemberRank(ME),
    getMemberWalletData(ME),
    getMemberSettlement(ME, CYCLE),
    getMemberCumulativeCommission(ME),
  ]);

  const balance = wd.wallet?.balance_usd ?? 0;
  const monthTotal = settle?.total ?? wd.monthCommission;
  const level = settle?.level ?? 0;
  const rankAmt = settle?.rank ?? 0;
  const share = settle?.share ?? 0;

  const kpis = [
    { icon: CoinsIcon, tone: "green" as const, label: "당월 수당", value: usd(monthTotal) },
    { icon: SigmaIcon, tone: "neutral" as const, label: "누적 수당", value: usd(cumulative) },
    { icon: Share2Icon, tone: "crypto" as const, label: "후원 라인", value: `${mm.leg_count}개` },
    { icon: UsersIcon, tone: "info" as const, label: "총 활성 산하", value: `${mm.total_active.toLocaleString()}명` },
  ];

  const composition = [
    { label: "직접추천 수당", amount: level, pct: pct(level, monthTotal), color: "bg-green-500" },
    { label: "직급 수당", amount: rankAmt, pct: pct(rankAmt, monthTotal), color: "bg-crypto" },
    { label: "공유 수당", amount: share, pct: pct(share, monthTotal), color: "bg-info" },
  ];

  // 그 달 직급(기록) 우선, 없으면 라이브 평가
  const curRank = settle?.member_rank ?? (rank && rank.rank > 0 ? rank.rank : 0);
  const rankLabel = curRank > 0 ? `${curRank}직급${rank ? ` (${Number(rank.rate_pct)}%)` : ""}` : "무직급";
  const nextLabel = rank?.next_rank ? `다음 ${rank.next_rank}직급` : "최고 직급";
  const nextTotal = rank?.next_min_total ?? null;
  const majorPct = nextTotal ? Math.min(Math.round((mm.major_leg / nextTotal) * 100), 100) : 100;

  // 30% = 공유수당 자격(5직급↑만 적용). blocked_by_balance = 공유수당 차단.
  const shareGated = curRank >= 5;
  const shareOk = rank ? !rank.blocked_by_balance : true;

  const rankReqs = [
    {
      label: "대실적 라인 (주력)",
      value: nextTotal ? `${mm.major_leg.toLocaleString()} / ${nextTotal.toLocaleString()}명` : `${mm.major_leg.toLocaleString()}명`,
      pct: majorPct,
      color: "bg-green-600",
    },
    {
      label: "기타 소실적 합계",
      value: `${mm.other_minor.toLocaleString()}명 (${Math.round(Number(rank?.balance_pct ?? 0) * 100)}%)`,
      pct: 100,
      color: "bg-info",
    },
  ];

  const recent = composition.filter((c) => c.amount > 0).map((c) => ({
    date: CYCLE,
    type: c.label.replace(" 수당", ""),
    tone: (c.color.includes("green") ? "green" : c.color.includes("crypto") ? "crypto" : "info") as "green" | "crypto" | "info",
    amount: signed(c.amount),
  }));

  return (
    <>
      <Topbar title="대시보드" sub="내 수당 현황" uid={toUid(ME)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-[13px] font-semibold text-white/80">출금 가능 잔액</div>
            <div className="mt-1 text-[42px] leading-none font-bold tabular-nums">
              {usd(balance)} <span className="text-base font-semibold text-white/80">USDT</span>
            </div>
            <div className="mt-2 text-xs font-medium text-white/80">당월 수당 {signed(monthTotal)} · 당월 충전 {signed(wd.monthDeposit)}</div>
          </div>
          <WithdrawalRequestModal
            memberId={ME}
            balance={balance}
            defaultAddress={wd.wallet?.deposit_address ?? ""}
            defaultNetwork={wd.wallet?.network ?? "TRC20"}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="내 수당 구성" sub={`${CYCLE} · 당월 ${usd(monthTotal)}`}>
            <div className="space-y-4">
              {composition.map((c) => (
                <div key={c.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-text-secondary">{c.label}</span>
                    <span className="font-bold text-text-primary">{usd(c.amount)} · {c.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-n-100">
                    <div className={`h-full rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="직급 승급 진행"
            sub={`현재 ${rankLabel} → ${nextLabel}`}
            action={<Pill tone="crypto"><TrophyIcon className="size-3" /> 달성 {majorPct}%</Pill>}
          >
            <div className="space-y-4">
              {rankReqs.map((r) => (
                <div key={r.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-text-primary">{r.label}</span>
                    <span className="font-bold text-text-primary">{r.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-n-100">
                    <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
              ))}
              <div className={cn(
                "flex items-center justify-between rounded-md px-3.5 py-3 text-[13px]",
                !shareGated ? "bg-surface-muted text-text-secondary" : shareOk ? "bg-green-50 text-green-700" : "bg-warning-soft text-warning",
              )}>
                <span className="font-semibold">공유수당 30% 자격 (5직급↑)</span>
                <span className="font-bold">{!shareGated ? "5직급부터 적용" : shareOk ? "충족" : "미충족"}</span>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="최근 수당 내역" sub={`${CYCLE} · 유형별 적립`}>
          <div>
            <div className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>사이클</span><span>유형</span><span>내역</span><span className="text-right">금액</span>
            </div>
            {recent.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">당월 수당 내역이 없습니다.</div>
            ) : (
              recent.map((c, i) => (
                <div key={i} className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                  <span className="text-text-tertiary tabular-nums">{c.date}</span>
                  <span><Pill tone={c.tone}>{c.type}</Pill></span>
                  <span className="text-text-secondary">당월 정산 적립</span>
                  <span className="text-right font-bold tabular-nums text-green-700">{c.amount}</span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

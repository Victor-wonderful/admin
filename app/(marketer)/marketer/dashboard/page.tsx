import {
  CoinsIcon,
  SigmaIcon,
  Share2Icon,
  UsersIcon,
  CircleArrowUpIcon,
  TrophyIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getMajorMinor } from "@/lib/queries/legs";
import { getMemberRank } from "@/lib/queries/ranks";
import { ROOT_MARKETER_ID } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 수당 금액은 정산 스키마 부재로 정적, 직급/실적은 실데이터.
const COMPOSITION = [
  { label: "직접추천 수당", pct: 45, color: "bg-green-500" },
  { label: "직급 수당", pct: 38, color: "bg-crypto" },
  { label: "공유 수당", pct: 17, color: "bg-info" },
];

const COMMISSIONS = [
  { date: "06-16", type: "직접추천", tone: "green" as const, from: "1대 활성 구독", amount: "+$320" },
  { date: "06-15", type: "직급", tone: "crypto" as const, from: "직급 차액 5%", amount: "+$1,120" },
  { date: "06-14", type: "공유", tone: "info" as const, from: "공유수당 풀 분배", amount: "+$210" },
];

export default async function MarketerDashboardPage() {
  const [mm, rank] = await Promise.all([
    getMajorMinor(ROOT_MARKETER_ID),
    getMemberRank(ROOT_MARKETER_ID),
  ]);

  const kpis = [
    { icon: CoinsIcon, tone: "green" as const, label: "당월 수당", value: "$14,200" },
    { icon: SigmaIcon, tone: "neutral" as const, label: "누적 수당", value: "$128,400" },
    { icon: Share2Icon, tone: "crypto" as const, label: "후원 라인", value: `${mm.leg_count}개` },
    { icon: UsersIcon, tone: "info" as const, label: "총 활성 산하", value: `${mm.total_active.toLocaleString()}명` },
  ];

  const nextTotal = rank?.next_min_total ?? null;
  const majorPct = nextTotal ? Math.min(Math.round((mm.major_leg / nextTotal) * 100), 100) : 100;
  const rankReqs = [
    {
      label: "대실적 라인 (주력)",
      value: nextTotal ? `${mm.major_leg.toLocaleString()} / ${nextTotal.toLocaleString()}명` : `${mm.major_leg.toLocaleString()}명`,
      pct: majorPct,
      color: "bg-green-600",
    },
    {
      label: "기타 소실적 합계",
      value: `${mm.other_minor.toLocaleString()}명`,
      pct: 100,
      color: "bg-info",
    },
  ];

  const rankLabel = rank && rank.rank > 0 ? `${rank.rank}직급 (${Number(rank.rate_pct)}%)` : "무직급";
  const nextLabel = rank?.next_rank ? `다음 ${rank.next_rank}직급` : "최고 직급";
  const balanceOk = rank?.balance_ok ?? true;

  return (
    <>
      <Topbar title="대시보드" sub="내 수당 현황" uid="AG·8F3A21" />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-[13px] font-semibold text-white/80">출금 가능 잔액</div>
            <div className="mt-1 text-[42px] leading-none font-bold tabular-nums">
              $42,300 <span className="text-base font-semibold text-white/80">USDT</span>
            </div>
            <div className="mt-2 text-xs font-medium text-white/80">당월 수당 +$14,200 · 당월 충전 +$500</div>
          </div>
          <button className="inline-flex items-center gap-2 rounded-[10px] bg-white px-7 py-3 text-[15px] font-bold text-green-700">
            <CircleArrowUpIcon className="size-[18px]" /> 출금 신청
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="내 수당 구성" sub="당월 지급 기준">
            <div className="space-y-4">
              {COMPOSITION.map((c) => (
                <div key={c.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-text-secondary">{c.label}</span>
                    <span className="font-bold text-text-primary">{c.pct}%</span>
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
              <div className={cn("flex items-center justify-between rounded-md px-3.5 py-3 text-[13px]", balanceOk ? "bg-green-50 text-green-700" : "bg-warning-soft text-warning")}>
                <span className="font-semibold">30% 균형 룰 (차액차단)</span>
                <span className="font-bold">{balanceOk ? "충족" : "미충족"}</span>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="최근 수당 내역" sub="유형별 적립">
          <div>
            <div className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>일자</span><span>유형</span><span>내역</span><span className="text-right">금액</span>
            </div>
            {COMMISSIONS.map((c, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{c.date}</span>
                <span><Pill tone={c.tone}>{c.type}</Pill></span>
                <span className="text-text-secondary">{c.from}</span>
                <span className="text-right font-bold tabular-nums text-green-700">{c.amount}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

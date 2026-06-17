import {
  UsersIcon,
  CircleCheckIcon,
  BadgeCheckIcon,
  TrendingUpIcon,
  CoinsIcon,
  ClockIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getMemberStats } from "@/lib/queries/members";

export const dynamic = "force-dynamic";

// 회원 수는 실데이터, 매출·수당은 정적(목) — 결제/정산 스키마 연동 후 교체.
const FIN_KPIS = [
  { icon: TrendingUpIcon, tone: "green" as const, label: "당월 매출", value: "$184,260" },
  { icon: CoinsIcon, tone: "info" as const, label: "당월 수당 지급", value: "$52,910" },
  { icon: ClockIcon, tone: "warning" as const, label: "출금 대기", value: "$8,420" },
];

const TREND = [42, 55, 48, 63, 58, 71, 66, 80, 74, 88, 95, 110];

const COMPOSITION = [
  { label: "직접추천 수당", pct: 45, color: "bg-green-500" },
  { label: "직급 수당", pct: 38, color: "bg-crypto" },
  { label: "공유 수당", pct: 17, color: "bg-info" },
];

const SETTLEMENTS = [
  { uid: "AG·8F3A21", rank: "5직급", total: "$4,820", state: "완료", tone: "green" as const },
  { uid: "AG·2B91C0", rank: "4직급", total: "$3,140", state: "지급 대기", tone: "warning" as const },
  { uid: "AG·9C12B2", rank: "3직급", total: "$1,920", state: "완료", tone: "green" as const },
  { uid: "AG·5D4E0A", rank: "2직급", total: "$880", state: "보류", tone: "negative" as const },
];

export default async function AdminDashboardPage() {
  const stats = await getMemberStats();
  const kpis = [
    { icon: UsersIcon, tone: "neutral" as const, label: "총 회원", value: `${stats.total.toLocaleString()}명` },
    { icon: CircleCheckIcon, tone: "green" as const, label: "활성 구독자", value: `${stats.active.toLocaleString()}명` },
    { icon: BadgeCheckIcon, tone: "crypto" as const, label: "마케터", value: `${stats.marketer.toLocaleString()}명` },
    ...FIN_KPIS,
  ];

  return (
    <>
      <Topbar title="대시보드" sub="운영 현황 요약" uid="운영자" />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Panel
            className="lg:col-span-2"
            title="매출 추이"
            sub="최근 12개월 (USDT)"
            action={
              <Pill tone="green" dot>
                당월 +$184,260
              </Pill>
            }
          >
            <div className="flex h-44 items-end gap-2">
              {TREND.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end">
                  <div
                    className={
                      i === TREND.length - 1
                        ? "rounded-t bg-green-600"
                        : "rounded-t bg-green-300"
                    }
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="수당 구성" sub="당월 지급 기준">
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
              <div className="flex items-center justify-between border-t pt-3 text-[13px]">
                <span className="font-medium text-text-secondary">공유수당 풀 잔액</span>
                <span className="font-bold text-green-700">$14,260</span>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="최근 정산" sub="마케터별 당월 수당">
          <div className="overflow-hidden">
            <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>회원</span>
              <span>직급</span>
              <span>수당 합계</span>
              <span className="text-right">상태</span>
            </div>
            {SETTLEMENTS.map((s) => (
              <div
                key={s.uid}
                className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0"
              >
                <span className="font-semibold text-text-primary">{s.uid}</span>
                <span className="text-text-secondary">{s.rank}</span>
                <span className="font-semibold tabular-nums text-text-primary">{s.total}</span>
                <span className="justify-self-end">
                  <Pill tone={s.tone}>{s.state}</Pill>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

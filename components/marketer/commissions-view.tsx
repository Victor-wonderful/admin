import { currentCycle } from "@/lib/dates";
import {
  CoinsIcon,
  Share2Icon,
  LayersIcon,
  UsersIcon,
  ShieldIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DataList, type DataColumn } from "@/components/ui/data-list";
import { getVisibleSettlements, type VisibleSettlement } from "@/lib/queries/finance";
import { toUid, uidInitials } from "@/lib/uid";

const CYCLE = currentCycle();
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

const REL: Record<string, { label: string; tone: "green" | "crypto" | "neutral" }> = {
  self: { label: "본인", tone: "green" },
  placement: { label: "팀 하위", tone: "crypto" },
  referral: { label: "초대 하위", tone: "neutral" },
};

// 팀 네트워크 리워드 — lg 이상 표 / lg 미만 카드(DataList)
const DOWNLINE_COLUMNS: DataColumn<VisibleSettlement>[] = [
  {
    key: "member",
    label: "회원",
    width: "1.6fr",
    mobile: "title",
    cell: (v) => (
      <span className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-muted text-[10px] font-bold text-text-secondary">{uidInitials(v.member_id)}</span>
        <span className="truncate text-[13px] font-semibold text-text-primary">{toUid(v.member_id)}</span>
      </span>
    ),
  },
  { key: "rel", label: "관계", mobile: "meta", cell: (v) => { const rel = REL[v.relation] ?? REL.referral; return <Pill tone={rel.tone}>{rel.label}</Pill>; } },
  { key: "level", label: "초대", width: "1fr", align: "right", mobile: "row", cell: (v) => <span className="text-[13px] tabular-nums text-text-secondary">{usd(v.level_amount)}</span> },
  { key: "rank", label: "직급", width: "1fr", align: "right", mobile: "row", cell: (v) => <span className="text-[13px] tabular-nums text-text-secondary">{usd(v.rank_amount)}</span> },
  { key: "share", label: "팀", width: "1fr", align: "right", mobile: "row", cell: (v) => <span className="text-[13px] tabular-nums text-text-secondary">{usd(v.share_amount)}</span> },
  { key: "total", label: "합계", width: "1.1fr", align: "right", mobile: "value", cell: (v) => <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd(v.total_amount)}</span> },
];

// MarketerCommissionsView 본문 — 페이지(세션 가드)와 분리해 두면 재사용·검증이 쉽다.
export async function MarketerCommissionsView({ viewerId }: { viewerId: string }) {
  const visible = await getVisibleSettlements(viewerId, CYCLE);
  const self =
    visible.find((v) => v.relation === "self") ??
    ({ member_id: viewerId, level_amount: 0, rank_amount: 0, share_amount: 0, total_amount: 0, status: "calculated", relation: "self" } as VisibleSettlement);
  const downline = visible
    .filter((v) => v.relation !== "self")
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 12);
  const downlineTotal = visible.filter((v) => v.relation !== "self").reduce((s, v) => s + v.total_amount, 0);

  const kpis = [
    { icon: CoinsIcon, tone: "green" as const, label: "내 당월 리워드", value: usd(self.total_amount) },
    { icon: Share2Icon, tone: "green" as const, label: "초대", value: usd(self.level_amount) },
    { icon: LayersIcon, tone: "crypto" as const, label: "직급", value: usd(self.rank_amount) },
    { icon: UsersIcon, tone: "info" as const, label: "팀", value: usd(self.share_amount) },
  ];

  return (
    <>
      <Topbar title="내 리워드" sub="당월 리워드 · 팀 분배 · USDT" uid={toUid(viewerId)} />

      <div className="flex-1 space-y-4 overflow-auto p-4 lg:p-7">
        {/* 상위 비공개 안내 */}
        <div className="flex items-center gap-2.5 rounded-lg bg-info-soft px-4 py-3 text-[12px] font-medium text-info">
          <ShieldIcon className="size-4 shrink-0" />
          보안: 상위(업라인) 라인의 리워드 금액은 표시되지 않습니다. 본인과 팀(팀·초대)만 조회됩니다.
        </div>

        {/* 내 리워드 KPI */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* 팀 네트워크 리워드 */}
        <Panel
          title="팀 네트워크 리워드"
          sub={`팀·초대 하위 ${downline.length}명 · 합계 ${usd(downlineTotal)} (상위 라인 비공개)`}
        >
          <DataList
            columns={DOWNLINE_COLUMNS}
            rows={downline}
            rowKey={(v) => v.member_id}
            empty="팀 리워드 내역이 없습니다."
          />
        </Panel>
      </div>
    </>
  );
}

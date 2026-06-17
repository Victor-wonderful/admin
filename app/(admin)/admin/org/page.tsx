import {
  TrendingUpIcon,
  GitForkIcon,
  CircleCheckIcon,
  LayersIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { MemberTree } from "@/components/trees/member-tree";
import { getPlacementTree } from "@/lib/queries/trees";
import { getMajorMinor } from "@/lib/queries/legs";
import { ROOT_MARKETER_ID } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEGEND = [
  { c: "bg-crypto", t: "마케터" },
  { c: "bg-green-600", t: "구독회원" },
  { c: "bg-n-300", t: "등록회원" },
  { c: "bg-green-500", t: "점 = 활성 구독 중" },
  { c: "bg-card ring-1 ring-n-400", t: "비활성" },
];

export default async function AdminOrgPage() {
  const [root, mm] = await Promise.all([
    getPlacementTree(ROOT_MARKETER_ID),
    getMajorMinor(ROOT_MARKETER_ID),
  ]);

  const stats = [
    { icon: TrendingUpIcon, tone: "bg-green-50 text-green-700", label: "대실적 (최대 레그)", value: `${mm.major_leg.toLocaleString()}명` },
    { icon: GitForkIcon, tone: "bg-info-soft text-info", label: "기타 소실적 합계", value: `${mm.other_minor.toLocaleString()}명` },
    { icon: CircleCheckIcon, tone: "bg-green-50 text-green-700", label: "총 활성 구독자", value: `${mm.total_active.toLocaleString()}명` },
    { icon: LayersIcon, tone: "bg-crypto-soft text-crypto", label: "후원 라인 수", value: `${mm.leg_count}개` },
  ];

  return (
    <>
      <Topbar title="조직도" sub="전체 후원 조직 · 스필오버 배치" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
            <span className="rounded px-4 py-1.5 text-[13px] font-medium text-text-secondary">추천 계보</span>
            <span className="rounded bg-card px-4 py-1.5 text-[13px] font-semibold text-text-primary shadow-sm">후원 배치 (스필오버)</span>
          </div>
          <span className="rounded-md bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">기준 회원: ROOT ▾</span>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-lg bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
              <span className={cn("grid size-10 place-items-center rounded-[12px]", s.tone)}>
                <s.icon className="size-[19px]" />
              </span>
              <div>
                <div className="text-xs text-text-secondary">{s.label}</div>
                <div className="text-xl font-bold text-text-primary">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-5 px-1">
          {LEGEND.map((l) => (
            <span key={l.t} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className={cn("size-2.5 rounded-full", l.c)} /> {l.t}
            </span>
          ))}
        </div>

        <Panel bodyClassName="overflow-x-auto">
          <MemberTree root={root} maxDepth={2} maxChildren={5} />
        </Panel>

        <div className="flex items-start gap-2.5 rounded-md bg-warning-soft px-3.5 py-3 text-xs leading-relaxed text-warning">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          스필오버 — 추천한 회원을 본인 밑이 아니라 단일 주력 라인(보통 왼쪽) 말단에 몰아 배치합니다. 추천인≠후원부모. 밀어주기로 대실적이 누적되고 직급이 도미노로 상승합니다.
        </div>
      </div>
    </>
  );
}

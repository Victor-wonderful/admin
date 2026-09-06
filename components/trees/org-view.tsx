"use client";

import * as React from "react";
import {
  NetworkIcon,
  GitForkIcon,
  UsersRoundIcon,
  UserPlusIcon,
  TrendingUpIcon,
  CircleCheckIcon,
  LayersIcon,
  SearchIcon,
  CornerDownRightIcon,
} from "lucide-react";

import type { MemberRole } from "@/lib/supabase/types";
import { ZoomPanCanvas } from "@/components/trees/zoom-pan";
import { TreeDrilldown } from "@/components/trees/tree-drilldown";
import type { TreeNode } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type View = "unilevel" | "placement";

export interface UnilevelVals {
  total: number;
  depth: number;
  active: number;
  direct: number;
}
export interface PlacementVals {
  total: number;
  major: number;
  minor: number;
  balancePct: number; // 기타소실적 / 총활성 (0~1)
}

const ROLE_LABEL: Record<MemberRole, string> = {
  registered: "등록회원",
  subscriber: "구독회원",
  marketer: "파트너",
};

const LEGEND_UNI = [
  { c: "bg-crypto", t: "파트너" },
  { c: "bg-green-600", t: "구독회원" },
  { c: "bg-n-300", t: "등록회원" },
  { c: "bg-green-500 ring-2 ring-card", t: "점 = 활성 구독 중" },
];
const LEGEND_PLACE = [
  { c: "bg-crypto", t: "파트너" },
  { c: "bg-green-600 ring-2 ring-green-200", t: "주력 라인 (대실적)" },
  { c: "bg-warning", t: "후원배치 회원 (추천인≠후원부모)" },
  { c: "bg-green-500 ring-2 ring-card", t: "점 = 활성 구독 중" },
];

interface Stat {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  label: string;
  value: string;
}

export function OrgView({
  rootName,
  rootRole,
  rootPicker,
  unilevelVals,
  placementVals,
  unilevelTree,
  placementTree,
  unilevelRoot = null,
  placementRoot = null,
}: {
  rootName: string;
  rootRole: MemberRole;
  rootPicker?: React.ReactNode;
  unilevelVals: UnilevelVals;
  placementVals: PlacementVals;
  unilevelTree: React.ReactNode;
  placementTree: React.ReactNode;
  /** lg 미만 드릴다운용 원본 트리 — 없으면 도식만 렌더한다. */
  unilevelRoot?: TreeNode | null;
  placementRoot?: TreeNode | null;
}) {
  const [view, setView] = React.useState<View>("unilevel");

  const n = (v: number) => v.toLocaleString();
  const uniStats: Stat[] = [
    { icon: NetworkIcon, badge: "bg-crypto-soft text-crypto", label: "총 산하", value: `${n(unilevelVals.total)}명` },
    { icon: GitForkIcon, badge: "bg-info-soft text-info", label: "조직 깊이", value: `${unilevelVals.depth}단계` },
    { icon: UsersRoundIcon, badge: "bg-green-50 text-green-700", label: "활성 구독자", value: `${n(unilevelVals.active)}명` },
    { icon: UserPlusIcon, badge: "bg-green-50 text-green-700", label: "직추 (1대)", value: `${n(unilevelVals.direct)}명` },
  ];
  const balanceOk = placementVals.balancePct >= 0.3;
  const placeStats: Stat[] = [
    { icon: NetworkIcon, badge: "bg-crypto-soft text-crypto", label: "총 산하", value: `${n(placementVals.total)}명` },
    { icon: TrendingUpIcon, badge: "bg-green-50 text-green-700", label: "대실적 (최대 레그)", value: `${n(placementVals.major)}명` },
    { icon: GitForkIcon, badge: "bg-info-soft text-info", label: "기타소실적 (그 외)", value: `${n(placementVals.minor)}명` },
    { icon: CircleCheckIcon, badge: balanceOk ? "bg-green-50 text-green-700" : "bg-warning-soft text-warning", label: "30% 균형", value: `${Math.round(placementVals.balancePct * 100)}%` },
  ];
  const stats = view === "unilevel" ? uniStats : placeStats;
  const legend = view === "unilevel" ? LEGEND_UNI : LEGEND_PLACE;

  const toggles: { key: View; label: string }[] = [
    { key: "unilevel", label: "추천조직 (수당)" },
    { key: "placement", label: "후원배치" },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto bg-canvas p-4 lg:p-7">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {rootPicker ?? (
          <div className="flex items-center gap-2.5 rounded-[10px] bg-card py-1.5 pr-2 pl-3 ring-1 ring-border">
            <span className="text-xs text-text-secondary">기준 회원</span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-crypto-soft px-2.5 py-1">
              <span className="grid size-[22px] place-items-center rounded-md bg-crypto text-[11px] font-bold text-white">
                {(rootName.includes("·") ? rootName.split("·")[1] : rootName).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase()}
              </span>
              <span className="text-xs font-semibold text-crypto">{rootName} · {ROLE_LABEL[rootRole]}</span>
            </span>
          </div>
        )}

        <div className="flex w-full gap-0.5 rounded-[10px] bg-surface-muted p-[3px] ring-1 ring-border sm:w-auto">
          {toggles.map((t) => {
            const on = view === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={cn(
                  "flex-1 rounded-[7px] px-3.5 py-2 text-[12px] whitespace-nowrap transition-colors sm:flex-none sm:py-1.5",
                  on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-text-secondary hover:text-text-primary",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5 rounded-[14px] bg-card p-3 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)] lg:gap-3 lg:p-[15px]">
            <span className={cn("grid size-[38px] shrink-0 place-items-center rounded-[11px]", s.badge)}>
              <s.icon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-text-secondary lg:text-xs">{s.label}</div>
              <div className="text-[17px] font-bold text-text-primary tabular-nums lg:text-[19px]">{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        {legend.map((l) => (
          <span key={l.t} className="flex items-center gap-1.5 text-xs text-text-secondary">
            <span className={cn("size-2.5 rounded-full", l.c)} /> {l.t}
          </span>
        ))}
      </div>

      {/* lg 이상: 트리 도식(휠 확대 · 드래그 이동) — ZoomPanCanvas 는 마우스 전용 */}
      <div className="hidden lg:block">
        <ZoomPanCanvas>{view === "unilevel" ? unilevelTree : placementTree}</ZoomPanCanvas>
      </div>
      {/* lg 미만: 터치로 한 단계씩 내려가는 목록 */}
      <div className="rounded-[14px] bg-card p-3 ring-1 ring-border lg:hidden">
        <TreeDrilldown
          key={view}
          root={view === "unilevel" ? unilevelRoot : placementRoot}
          spine={view === "placement"}
          detailHref={(n) => `/admin/members/${n.id}`}
          emptyLabel="하위 회원이 없습니다."
        />
      </div>

      {/* 안내 — 후원배치: 배치 규칙 설명 / 추천조직: 레벨 수당 안내 */}
      {view === "placement" ? (
        <div className="rounded-[14px] bg-warning-soft p-4 ring-1 ring-warning/40">
          <div className="flex gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-warning text-white"><CornerDownRightIcon className="size-[18px]" /></span>
            <div className="space-y-1.5">
              <div className="text-[13px] font-bold text-warning">후원배치란?</div>
              <p className="text-xs leading-relaxed text-text-secondary">
                추천한 회원을 본인 바로 밑이 아니라 후원배치 라인의 더 아래(하위 파트너 밑)에 꽂는 것입니다. 추천선(수당)은 본인 그대로지만 후원 부모는 달라집니다 — 즉 <b className="text-text-primary">추천인 ≠ 후원부모</b>.
                <b className="text-warning"> ★ 아무 데나가 아니라 정해진 ‘단일 주력 라인(보통 왼쪽 한 라인)’에만</b> 계속 몰아줘(밀어주기) 그 라인을 깊게 누적시킵니다 → 대실적(MAX leg). 나머지 직추 라인은 소실적이 되고, 라인 위쪽 전원의 후원 하부로 함께 카운트돼 직급이 도미노로 상승합니다.
              </p>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-[11px] font-medium text-text-secondary ring-1 ring-warning/40">
                예: A 추천 → 주력 라인 말단 Z 밑 배치 → 추천인 = 나 · 후원부모 = Z
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 rounded-md bg-surface-muted px-3.5 py-3 text-xs leading-relaxed text-text-secondary">
          <SearchIcon className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
          추천조직 — 추천인(recommender) 기준 트리입니다. 레벨 수당은 1대 25% · 2대 9%로 지급되며 3대 이상은 차단됩니다.
        </div>
      )}
    </div>
  );
}

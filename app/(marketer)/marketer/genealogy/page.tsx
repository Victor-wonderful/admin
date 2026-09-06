import {
  UsersIcon,
  CircleCheckIcon,
  UserPlusIcon,
  LayersIcon,
  GitBranchIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { MemberTree } from "@/components/trees/member-tree";
import { GenealogyTrees } from "@/components/trees/genealogy-trees";
import { getBothTrees } from "@/lib/queries/trees";
import { getMajorMinor } from "@/lib/queries/legs";
import { listPendingPlacements, listPlacementTargets, getRecommendedPlacementTarget } from "@/lib/queries/placement";
import { PlacementPanel } from "@/components/marketer/placement-panel";
import { PlacementProvider } from "@/components/marketer/placement-context";
import { ZoomPanCanvas } from "@/components/trees/zoom-pan";
import { getMarketerViewerId } from "@/lib/session";
import { toUid } from "@/lib/uid";
import type { TreeNode } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function countAll(n: TreeNode | null): number {
  if (!n) return 0;
  return 1 + n.children.reduce((s, c) => s + countAll(c), 0);
}

export default async function MarketerGenealogyPage() {
  const viewerId = await getMarketerViewerId();
  const [{ unilevel, placement }, mm, pending] = await Promise.all([
    getBothTrees(viewerId),
    getMajorMinor(viewerId),
    listPendingPlacements(viewerId),
  ]);
  // 배치 대기가 있을 때만 배치 위치 후보를 불러온다(조직이 크면 무거움)
  const [targets, recommended] = pending.length > 0 ? await Promise.all([listPlacementTargets(viewerId), getRecommendedPlacementTarget(viewerId)]) : [[], null];
  const balancePct = mm.total_active > 0 ? Math.round((mm.other_minor / mm.total_active) * 100) : 0;

  const oneL = unilevel?.children.length ?? 0;
  const twoL = unilevel?.children.reduce((s, c) => s + c.children.length, 0) ?? 0;
  const active = unilevel?.meta?.activeCount ?? 0;
  const totalSub = Math.max(countAll(unilevel) - 1, 0);

  const stats = [
    { icon: UsersIcon, tone: "bg-green-50 text-green-700", label: "1대 직접 초대", value: `${oneL}명` },
    { icon: UsersIcon, tone: "bg-info-soft text-info", label: "2대", value: `${twoL}명` },
    { icon: CircleCheckIcon, tone: "bg-green-50 text-green-700", label: "활성 구독자", value: `${active.toLocaleString()}명` },
    { icon: UserPlusIcon, tone: "bg-crypto-soft text-crypto", label: "총 팀", value: `${totalSub.toLocaleString()}명` },
  ];

  const LEGEND = [
    { c: "bg-crypto", t: "파트너" },
    { c: "bg-green-600", t: "구독회원 (예비 파트너)" },
    { c: "bg-green-500", t: "점 = 활성 구독 중" },
    { c: "bg-card ring-1 ring-n-400", t: "비활성 (당월 미결제)" },
    { c: "bg-green-600 ring-2 ring-green-600", t: "좌측 = 1번 라인(첫 파트너 · 주력) · 자리는 한 번만 확정" },
  ];

  const SUMMARY = [
    { icon: UsersIcon, k: "1대 직접 초대", v: `${oneL}명` },
    { icon: UsersIcon, k: "2대", v: `${twoL}명` },
    { icon: LayersIcon, k: "주력 라인", v: `${mm.major_leg.toLocaleString()}명` },
    { icon: GitBranchIcon, k: `기타 라인 (${balancePct}%)`, v: `${mm.other_minor.toLocaleString()}명` },
    { icon: LayersIcon, k: "활성 팀원 전체", v: `${mm.total_active.toLocaleString()}명` },
  ];

  return (
    <>
      <Topbar title="내 팀" sub="추천조직 · 후원배치" uid={toUid(viewerId)} />

      <PlacementProvider ownerUid={toUid(viewerId)} pending={pending} targets={targets} recommended={recommended}>
      <div className="flex-1 space-y-4 overflow-auto p-4 lg:p-7">
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

        {pending.length > 0 ? (
          <PlacementPanel pending={pending} autoDays={7} />
        ) : null}

        <div id="team-trees" className="scroll-mt-4">
        <GenealogyTrees
          labels={{ uni: "추천조직", place: "후원배치" }}
          unilevel={
            <Panel sub="추천조직 — 내가 초대한 회원과 그 아래 (초대 리워드 1·2대) · 휠: 확대/축소 · 드래그: 이동">
              <ZoomPanCanvas><MemberTree root={unilevel} maxDepth={2} maxChildren={6} variant="partner" /></ZoomPanCanvas>
            </Panel>
          }
          placement={
            <Panel sub="후원배치 — 직급·팀 리워드 산정 기준 조직 · 휠: 확대/축소 · 드래그: 이동 · 좌측 1번 라인 = 첫 파트너 고정">
              <ZoomPanCanvas><MemberTree root={placement} maxDepth={3} maxChildren={6} variant="partner" placeable={pending.length > 0} /></ZoomPanCanvas>
            </Panel>
          }
        />
        </div>

        <div className="flex items-start gap-2.5 rounded-md bg-info-soft px-3.5 py-3 text-xs leading-relaxed text-info">
          <LayersIcon className="mt-0.5 size-4 shrink-0" />
          소프트 압축 — 비활성(당월 미결제) 회원은 해당 월 레벨 리워드 집계에서 제외됩니다. 추천조직·후원배치 자리는 유지되며 재결제 시 자동 회복됩니다. (레벨 리워드는 1·2대만, 3대 이상 차단)
        </div>

        <div>
          <Panel title="내 초대 라인 요약">
            <div>
              {SUMMARY.map((s, i) => (
                <div key={s.k} className={cn("flex items-center justify-between py-2.5", i < SUMMARY.length - 1 && "border-b")}>
                  <span className="flex items-center gap-2 text-[13px] text-text-secondary">
                    <span className="grid size-6 place-items-center rounded bg-surface-muted">
                      <s.icon className="size-3.5 text-text-tertiary" />
                    </span>
                    {s.k}
                  </span>
                  <span className="text-[15px] font-bold text-text-primary">{s.v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
      </PlacementProvider>
    </>
  );
}

import {
  UsersIcon,
  CircleCheckIcon,
  UserPlusIcon,
  LayersIcon,
  UserRoundIcon,
  MousePointerClickIcon,
  GitBranchIcon,
  ExternalLinkIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { MemberTree } from "@/components/trees/member-tree";
import { GenealogyTrees } from "@/components/trees/genealogy-trees";
import { getBothTrees } from "@/lib/queries/trees";
import { getMajorMinor } from "@/lib/queries/legs";
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
  const [{ unilevel, placement }, mm] = await Promise.all([
    getBothTrees(viewerId),
    getMajorMinor(viewerId),
  ]);
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
  ];

  const SUMMARY = [
    { icon: UsersIcon, k: "1대 직접 초대", v: `${oneL}명` },
    { icon: UsersIcon, k: "2대", v: `${twoL}명` },
    { icon: LayersIcon, k: "주력 라인 라인 (주력)", v: `${mm.major_leg.toLocaleString()}명` },
    { icon: GitBranchIcon, k: `기타 라인 (${balancePct}%)`, v: `${mm.other_minor.toLocaleString()}명` },
    { icon: LayersIcon, k: "활성 팀원 전체", v: `${mm.total_active.toLocaleString()}명` },
  ];

  return (
    <>
      <Topbar title="내 팀" sub="초대 관계(리워드) · 팀 배치(자동 배치)" uid={toUid(viewerId)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
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

        <GenealogyTrees
          unilevel={
            <Panel bodyClassName="overflow-x-auto" sub="초대 관계 — 레벨리워드 1·2대">
              <MemberTree root={unilevel} maxDepth={2} maxChildren={6} variant="partner" />
            </Panel>
          }
          placement={
            <Panel bodyClassName="overflow-x-auto" sub="팀 배치 — 등급·팀 리워드 (자동 배치)">
              <MemberTree root={placement} maxDepth={3} maxChildren={6} variant="partner" />
            </Panel>
          }
        />

        <div className="flex items-start gap-2.5 rounded-md bg-info-soft px-3.5 py-3 text-xs leading-relaxed text-info">
          <LayersIcon className="mt-0.5 size-4 shrink-0" />
          소프트 압축 — 비활성(당월 미결제) 회원은 해당 월 레벨 리워드 집계에서 제외됩니다. 초대 관계은 유지되며 재결제 시 자동 회복·자리 영구 보존됩니다. (레벨 리워드은 1·2대만, 3대 이상 차단)
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_388px]">
          <Panel>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-[46px] place-items-center rounded-[13px] bg-crypto-soft text-crypto">
                  <UserRoundIcon className="size-[22px]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-text-primary">{unilevel?.children[0]?.name ?? "—"}</span>
                    <Pill tone="green">1대 · 25%</Pill>
                  </div>
                  <div className="text-xs text-text-secondary">내 직접 초대 · 노드를 클릭해 상세 보기</div>
                </div>
              </div>
              <Pill tone="neutral"><MousePointerClickIcon className="size-3" /> 선택한 노드</Pill>
            </div>
            <div className="mt-4 flex gap-2.5">
              <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-[13px] font-bold text-white">
                <GitBranchIcon className="size-4" /> 조직 펼쳐보기
              </button>
              <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold text-text-secondary ring-1 ring-border-strong">
                <ExternalLinkIcon className="size-4" /> 회원 상세
              </button>
            </div>
          </Panel>

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
    </>
  );
}

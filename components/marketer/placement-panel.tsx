"use client";

import { GitBranchIcon } from "lucide-react";

import { usePlacement } from "@/components/marketer/placement-context";
import type { PendingPlacement } from "@/lib/queries/placement";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { registered: "등록회원", subscriber: "구독회원", marketer: "파트너" } as const;

// 배치 대기 목록 — "배치"를 누르면 공용 배치 창(PlacementProvider)이 열린다.
export function PlacementPanel({ pending, autoDays }: { pending: PendingPlacement[]; autoDays: number }) {
  const ctx = usePlacement();
  return (
    <div className="rounded-lg bg-card p-5 ring-1 ring-warning/40 shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <GitBranchIcon className="size-4 text-warning" /> 후원배치 대기 <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">{pending.length}명</span>
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            내가 초대한 회원 중 구독을 시작했지만 아직 후원 조직에 자리가 없는 회원 · 자리는 한 번만 정할 수 있습니다 · ‘배치’를 누른 뒤 권장 위치, 목록 선택, 또는 후원배치도에서 카드를 골라 넣습니다
          </div>
        </div>
      </div>
      <div className="mt-3">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 border-b py-2 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
          <span>회원</span><span>회원 구분</span><span>자동 배치까지</span><span className="text-right">배치</span>
        </div>
        {pending.map((p) => {
          const d = p.days_left;
          return (
            <div key={p.id} className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-3 border-b py-2.5 text-sm last:border-0">
              <span className="font-semibold text-text-primary">{p.uid}</span>
              <span className="text-[13px] text-text-secondary">{ROLE_LABEL[p.role]}{p.is_active_subscriber ? " · 활성" : ""}</span>
              <span className={cn("text-[12px] tabular-nums", d != null && d <= 2 ? "font-semibold text-warning" : "text-text-tertiary")}>
                {d == null ? "—" : d === 0 ? "오늘 자동 배치 예정" : `D-${d} (${autoDays}일 후 1번 라인 최하단)`}
              </span>
              <button type="button" onClick={() => ctx?.open({ memberId: p.id })} className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-bold text-white">
                <GitBranchIcon className="size-3.5" /> 배치
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

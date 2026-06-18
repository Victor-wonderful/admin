import * as React from "react";
import Link from "next/link";
import { UserRoundIcon } from "lucide-react";

import type { TreeNode, MemberRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const ROLE_RING: Record<MemberRole, string> = {
  marketer: "ring-crypto",
  subscriber: "ring-green-500",
  registered: "ring-n-300",
};
const ROLE_LABEL: Record<MemberRole, string> = {
  marketer: "마케터",
  subscriber: "구독회원",
  registered: "등록회원",
};

function Card({ n, highlight, label, spillover }: { n: TreeNode; highlight?: boolean; label?: string; spillover?: boolean }) {
  return (
    <Link
      href={`/admin/members/${n.id}`}
      title={`${n.name} 상세 보기`}
      className={cn(
        "relative block w-40 rounded-[11px] bg-card px-3 py-2.5 shadow-sm ring-[1.5px] transition hover:shadow-md hover:ring-green-500",
        highlight ? "ring-2 ring-green-600" : spillover ? "ring-warning/70" : ROLE_RING[n.role],
        !n.isActive && "opacity-55",
      )}
    >
      {label ? (
        <span className="absolute -top-2.5 -left-2 inline-flex items-center rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold text-white">
          {label}
        </span>
      ) : null}
      {!n.isActive ? (
        <span className="absolute -top-2.5 -right-2 inline-flex items-center rounded-full bg-negative-soft px-2 py-0.5 text-[10px] font-bold text-negative ring-1 ring-negative">
          비활성
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="relative grid size-7 place-items-center rounded-lg bg-green-50 text-crypto">
          <UserRoundIcon className="size-3.5" />
          <span className={cn("absolute -right-0.5 -bottom-0.5 size-2 rounded-full ring-2 ring-card", n.isActive ? "bg-green-500" : "bg-n-400")} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-text-primary">{n.name}</div>
          <div className="text-[10px] text-text-tertiary">
            {ROLE_LABEL[n.role]}
            {spillover ? <span className="ml-1 font-semibold text-warning">· 스필오버</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

function Chip({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-semibold text-text-secondary ring-1 ring-border">
      +{count.toLocaleString()} 하위
    </div>
  );
}

const LINE = "bg-n-300";

function Node({
  n,
  depth,
  maxDepth,
  maxChildren,
  showSpillover,
  spine,
  spineLine,
  majorHead,
  highlightLabel,
}: {
  n: TreeNode;
  depth: number;
  maxDepth: number;
  maxChildren: number;
  showSpillover?: boolean;
  // spine 모드(후원 배치): 좌측 주력(대실적) 한 줄만 깊게, 나머지(소실적)는 얕게.
  spine?: boolean;
  spineLine?: boolean; // 이 노드가 주력 라인 위에 있음(녹색 강조)
  majorHead?: boolean; // 주력 라인의 머리(라벨 표시)
  highlightLabel?: string;
}) {
  // 스필오버 배치 = 추천인 ≠ 후원 부모. 루트(기준회원)·주력 라인 머리는 제외.
  const isSpillover =
    !!showSpillover && depth > 0 && !majorHead && !!n.meta?.recommenderId && n.meta.recommenderId !== n.meta.parentId;

  // spine 모드: 활성 → 활성하위 많은 순으로 정렬 → 좌측(i=0)이 주력 라인.
  let kids = n.children;
  if (spine && kids.length > 1) {
    kids = [...kids].sort(
      (a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) || (b.meta?.activeCount ?? 0) - (a.meta?.activeCount ?? 0),
    );
  }
  const showKids = depth < maxDepth ? kids.slice(0, maxChildren) : [];
  const hidden = depth < maxDepth ? kids.length - showKids.length : kids.length;

  const cols: React.ReactNode[] = showKids.map((c, i) => {
    const childSpineLine = !!spine && i === 0 && (depth === 0 || !!spineLine);
    // 주력 라인만 깊게(maxDepth), 소실적 라인은 얕게(자식+칩만)
    const childMaxDepth = !spine || childSpineLine ? maxDepth : depth + 1;
    const childMajorHead = !!spine && depth === 0 && i === 0;
    return (
      <Node
        key={c.id}
        n={c}
        depth={depth + 1}
        maxDepth={childMaxDepth}
        maxChildren={maxChildren}
        showSpillover={showSpillover}
        spine={spine}
        spineLine={childSpineLine}
        majorHead={childMajorHead}
        highlightLabel={highlightLabel}
      />
    );
  });
  if (hidden > 0) cols.push(<Chip key="more" count={hidden} />);

  return (
    <div className="flex flex-col items-center">
      <Card n={n} highlight={!!spineLine} label={majorHead ? highlightLabel : undefined} spillover={isSpillover} />
      {cols.length > 0 ? (
        <>
          {/* 부모 → 가로 연결바 → 각 자식 세로선 */}
          <div className={cn("h-4 w-px", LINE)} />
          <div className="flex items-start">
            {cols.map((content, i) => {
              const isFirst = i === 0;
              const isLast = i === cols.length - 1;
              const single = cols.length === 1;
              return (
                <div key={i} className="relative flex flex-col items-center px-3 pt-4">
                  {!single ? (
                    <div
                      className={cn(
                        "absolute top-0 h-px",
                        LINE,
                        isFirst ? "left-1/2 right-0" : isLast ? "left-0 right-1/2" : "left-0 right-0",
                      )}
                    />
                  ) : null}
                  <div className={cn("absolute top-0 left-1/2 h-4 w-px -translate-x-1/2", LINE)} />
                  {content}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function MemberTree({
  root,
  maxDepth = 2,
  maxChildren = 4,
  showSpillover,
  spine,
  highlightLabel,
}: {
  root: TreeNode | null;
  maxDepth?: number;
  maxChildren?: number;
  showSpillover?: boolean;
  spine?: boolean;
  highlightLabel?: string;
}) {
  if (!root) {
    return <div className="py-8 text-center text-sm text-text-tertiary">조직 데이터가 없습니다.</div>;
  }
  return (
    <div className="flex min-w-max justify-center py-2">
      <Node n={root} depth={0} maxDepth={maxDepth} maxChildren={maxChildren} showSpillover={showSpillover} spine={spine} highlightLabel={highlightLabel} />
    </div>
  );
}

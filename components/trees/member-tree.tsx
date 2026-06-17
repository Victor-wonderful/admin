import * as React from "react";
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

function Card({ n }: { n: TreeNode }) {
  return (
    <div
      className={cn(
        "relative w-40 rounded-[11px] bg-card px-3 py-2.5 shadow-sm ring-[1.5px]",
        ROLE_RING[n.role],
        !n.isActive && "opacity-55",
      )}
    >
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
          <div className="text-[10px] text-text-tertiary">{ROLE_LABEL[n.role]}</div>
        </div>
      </div>
    </div>
  );
}

function Chip({ count }: { count: number }) {
  return (
    <div className="mt-4 inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-[11px] font-semibold text-text-secondary ring-1 ring-border">
      +{count.toLocaleString()} 하위
    </div>
  );
}

function Node({
  n,
  depth,
  maxDepth,
  maxChildren,
}: {
  n: TreeNode;
  depth: number;
  maxDepth: number;
  maxChildren: number;
}) {
  const kids = n.children;
  const showKids = depth < maxDepth ? kids.slice(0, maxChildren) : [];
  const hidden =
    depth < maxDepth ? kids.length - showKids.length : kids.length;

  return (
    <div className="flex flex-col items-center">
      <Card n={n} />
      {kids.length > 0 ? (
        <>
          <div className="h-5 w-px bg-n-200" />
          <div className="flex items-start gap-5">
            {showKids.map((c) => (
              <Node key={c.id} n={c} depth={depth + 1} maxDepth={maxDepth} maxChildren={maxChildren} />
            ))}
            {hidden > 0 ? <Chip count={hidden} /> : null}
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
}: {
  root: TreeNode | null;
  maxDepth?: number;
  maxChildren?: number;
}) {
  if (!root) {
    return (
      <div className="py-8 text-center text-sm text-text-tertiary">
        조직 데이터가 없습니다.
      </div>
    );
  }
  return (
    <div className="flex min-w-max justify-center py-2">
      <Node n={root} depth={0} maxDepth={maxDepth} maxChildren={maxChildren} />
    </div>
  );
}

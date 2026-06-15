"use client";

import { useState } from "react";
import type { TreeNode } from "@/lib/supabase/types";
import { RoleBadge } from "./RoleBadge";
import { cn } from "@/lib/utils";

// 직접추천(Unilevel) 트리 — 가로 무제한이라 들여쓰기 아웃라인으로 표현.
function Node({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/60"
        style={{ paddingLeft: depth * 18 + 4 }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-4 w-4 items-center justify-center text-xs text-muted-foreground",
            !hasChildren && "invisible"
          )}
          aria-label={open ? "collapse" : "expand"}
        >
          {open ? "▾" : "▸"}
        </button>
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            node.isActive ? "bg-emerald-500" : "border border-zinc-400 bg-transparent"
          )}
          title={node.isActive ? "활성 구독자" : "비활성"}
        />
        <span className="text-sm font-medium">{node.name}</span>
        <RoleBadge role={node.role} />
        {hasChildren ? (
          <span className="ml-auto text-xs text-muted-foreground">
            직속 {node.children.length} · 활성산하 {node.meta?.activeCount ?? 0}
          </span>
        ) : null}
      </div>
      {open && hasChildren ? (
        <div>
          {node.children.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function UnilevelTree({ root }: { root: TreeNode | null }) {
  if (!root) return <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>;
  return (
    <div className="rounded-lg border bg-card p-2">
      <Node node={root} depth={0} />
    </div>
  );
}

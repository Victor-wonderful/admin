"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { TreeNode } from "@/lib/supabase/types";

// react-d3-tree 는 브라우저 전용 → SSR 비활성화.
const Tree = dynamic(() => import("react-d3-tree"), { ssr: false });

type RawNode = {
  name: string;
  attributes: { role: string; active: string; activeCount: number };
  children?: RawNode[];
};

function toRaw(node: TreeNode): RawNode {
  return {
    name: node.name,
    attributes: {
      role: node.role,
      active: node.isActive ? "1" : "0",
      activeCount: node.meta?.activeCount ?? 0,
    },
    children: node.children.length ? node.children.map(toRaw) : undefined,
  };
}

function renderNode({ nodeDatum, toggleNode }: any) {
  const active = nodeDatum.attributes?.active === "1";
  const role = nodeDatum.attributes?.role as string;
  const stroke = role === "marketer" ? "#7c3aed" : role === "subscriber" ? "#0284c7" : "#a1a1aa";
  return (
    <g onClick={toggleNode} style={{ cursor: "pointer" }}>
      <circle r={9} fill={active ? "#10b981" : "#ffffff"} stroke={stroke} strokeWidth={2} />
      <text x={14} y={-2} style={{ fontSize: 12, fontWeight: 600, fill: "currentColor" }} strokeWidth={0}>
        {nodeDatum.name}
      </text>
      <text x={14} y={12} style={{ fontSize: 10, fill: "#71717a" }} strokeWidth={0}>
        활성산하 {nodeDatum.attributes?.activeCount ?? 0}
      </text>
    </g>
  );
}

export function PlacementTree({ root }: { root: TreeNode | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translate, setTranslate] = useState({ x: 300, y: 60 });
  const data = useMemo(() => (root ? toRaw(root) : null), [root]);

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 60 });
    }
  }, []);

  if (!data) return <p className="text-sm text-muted-foreground">데이터가 없습니다.</p>;

  return (
    <div ref={containerRef} className="h-[640px] w-full rounded-lg border bg-card">
      <Tree
        data={data as any}
        orientation="vertical"
        translate={translate}
        pathFunc="step"
        nodeSize={{ x: 150, y: 90 }}
        separation={{ siblings: 1, nonSiblings: 1.4 }}
        zoom={0.7}
        collapsible
        initialDepth={2}
        renderCustomNodeElement={renderNode}
      />
    </div>
  );
}

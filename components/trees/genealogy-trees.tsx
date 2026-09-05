"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// 초대 관계(리워드) ↔ 팀 배치(자동 배치) 트리 토글. 두 트리는 서버에서 렌더되어 props 로 전달.
export function GenealogyTrees({
  unilevel,
  placement,
  labels = { uni: "초대 관계 (리워드)", place: "팀 배치 (자동 배치)" },
}: {
  unilevel: React.ReactNode;
  placement: React.ReactNode;
  labels?: { uni: string; place: string };
}) {
  const [tab, setTab] = React.useState<"uni" | "place">("uni");
  return (
    <div className="space-y-4">
      <div className="flex w-fit gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
        {[
          { k: "uni" as const, label: labels.uni },
          { k: "place" as const, label: labels.place },
        ].map((t) => (
          <button
            key={t.k}
            type="button"
            onClick={() => setTab(t.k)}
            className={cn(
              "rounded px-4 py-1.5 text-[13px] transition-colors",
              tab === t.k ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary hover:text-text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className={tab === "uni" ? "" : "hidden"}>{unilevel}</div>
      <div className={tab === "place" ? "" : "hidden"}>{placement}</div>
    </div>
  );
}

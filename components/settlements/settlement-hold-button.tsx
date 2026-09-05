"use client";

import * as React from "react";
import { PauseIcon, PlayIcon, Loader2Icon } from "lucide-react";

import { setSettlementHold } from "@/lib/actions/settlementWorkflow";
import { cn } from "@/lib/utils";

// 정산 행 개별 보류/해제. paid 는 보류 불가(전이 안 함).
export function SettlementHoldButton({
  cycle,
  memberId,
  status,
  readOnly = false,
}: {
  cycle: string;
  memberId: string;
  status: string;
  readOnly?: boolean;
}) {
  const [pending, start] = React.useTransition();
  if (status === "paid") return null;

  const held = status === "held";
  const toggle = () => start(async () => { await setSettlementHold(cycle, memberId, !held); });

  return (
    <button
      type="button"
      disabled={pending || readOnly}
      onClick={toggle}
      title={readOnly ? "현재 역할은 실행 권한이 없습니다(조회 전용)" : held ? "보류 해제" : "지급 보류"}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 disabled:opacity-50",
        held
          ? "bg-green-50 text-green-700 ring-green-500"
          : "bg-card text-text-secondary ring-border-strong hover:text-text-primary",
      )}
    >
      {pending ? <Loader2Icon className="size-3 animate-spin" /> : held ? <PlayIcon className="size-3" /> : <PauseIcon className="size-3" />}
      {held ? "해제" : "보류"}
    </button>
  );
}

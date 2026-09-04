"use client";

import { currentCycle } from "@/lib/dates";
import * as React from "react";
import { CheckCheckIcon, Loader2Icon } from "lucide-react";

import { confirmSettlements } from "@/lib/actions/settlementWorkflow";

// 일괄 확정 — calculated 산정 건을 confirmed 로 전환.
export function ConfirmSettlementsButton({ cycle = currentCycle() }: { cycle?: string }) {
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState<number | null>(null);

  return (
    <span className="flex items-center gap-2">
      {done !== null ? (
        <span className="text-[12px] font-medium text-info">
          {done > 0 ? `${done}건 확정` : "확정 대상 없음"}
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setDone(await confirmSettlements(cycle)))}
        className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-60"
      >
        {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <CheckCheckIcon className="size-3.5" />}
        {pending ? "확정 중…" : "일괄 확정"}
      </button>
    </span>
  );
}

"use client";

import { currentCycle } from "@/lib/dates";
import * as React from "react";
import { RefreshCwIcon } from "lucide-react";

import { runSettlement, type SettlementRunResult } from "@/lib/actions/runSettlement";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export function RunSettlementButton({ cycle = currentCycle(), readOnly = false }: { cycle?: string; readOnly?: boolean }) {
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<SettlementRunResult | null>(null);

  return (
    <span className="flex items-center gap-2">
      {result ? (
        <span className="text-[12px] font-medium text-positive">
          {result.members_paid}명 · {usd(result.grand_total)} 산정 완료
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending || readOnly}
        title={readOnly ? "현재 역할은 실행 권한이 없습니다(조회 전용)" : undefined}
        onClick={() => start(async () => setResult(await runSettlement(cycle)))}
        className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-60"
      >
        <RefreshCwIcon className={cn("size-3.5", pending && "animate-spin")} />
        {pending ? "재산정 중…" : "재산정"}
      </button>
    </span>
  );
}

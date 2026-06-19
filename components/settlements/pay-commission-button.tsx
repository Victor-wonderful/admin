"use client";

import * as React from "react";
import { SendIcon } from "lucide-react";

import { payCommission, type PayResult } from "@/lib/actions/payCommission";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

// 지급 실행 — 직추+직급(instant, 상시). 공유(share)는 월 1회 별도.
export function PayCommissionButton({ cycle = "2026-06" }: { cycle?: string }) {
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<PayResult | null>(null);

  return (
    <span className="flex items-center gap-2">
      {result ? (
        <span className="text-[12px] font-medium text-positive">
          {result.members_paid}명 · {usd(result.total_paid)} 지급
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await payCommission(cycle, "instant")))}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60",
        )}
      >
        <SendIcon className="size-3.5" />
        {pending ? "지급 중…" : "지급 실행"}
      </button>
    </span>
  );
}

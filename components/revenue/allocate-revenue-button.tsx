"use client";

import { currentCycle } from "@/lib/dates";
import * as React from "react";
import { Layers2Icon, Loader2Icon } from "lucide-react";

import { allocateRevenue, type RevenueAllocationResult } from "@/lib/actions/allocateRevenue";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

// 매출 1차 배분 실행 — allocate_revenue 호출(수당풀/회사/지분/예비비 갱신).
export function AllocateRevenueButton({ cycle = currentCycle(), readOnly = false }: { cycle?: string; readOnly?: boolean }) {
  const [pending, start] = React.useTransition();
  const [res, setRes] = React.useState<RevenueAllocationResult | null>(null);

  return (
    <span className="flex items-center gap-2">
      {res ? (
        <span className="text-[12px] font-medium text-positive">
          배분 완료 · 수당풀 {usd(res.pool_commission)}
        </span>
      ) : null}
      <button
        type="button"
        disabled={pending || readOnly}
        title={readOnly ? "현재 역할은 실행 권한이 없습니다(조회 전용)" : undefined}
        onClick={() => start(async () => setRes(await allocateRevenue(cycle)))}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <Layers2Icon className="size-3.5" />}
        {pending ? "배분 중…" : "배분 실행"}
      </button>
    </span>
  );
}

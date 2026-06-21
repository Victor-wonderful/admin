"use client";

import * as React from "react";
import { CheckIcon, SendIcon, CheckCheckIcon, Loader2Icon, ExternalLinkIcon } from "lucide-react";

import { transitionWithdrawal, type WithdrawalStatus } from "@/lib/actions/withdrawals";

// 출금 행 액션 — 상태별 다음 전이 버튼. pending→승인/반려, approved→송금/반려, sending→완료.
export function WithdrawalActions({
  id,
  status,
  txHash,
}: {
  id: string;
  status: WithdrawalStatus;
  txHash: string | null;
}) {
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  const act = (to: WithdrawalStatus, hash?: string) =>
    start(async () => {
      setErr(null);
      try {
        await transitionWithdrawal(id, to, hash);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "처리 실패");
      }
    });

  const shortHash = (h: string) => (h.length > 12 ? `${h.slice(0, 6)}…${h.slice(-4)}` : h);

  if (status === "completed")
    return (
      <span className="flex items-center justify-end gap-1.5 text-[12px] tabular-nums text-text-tertiary">
        {txHash ? shortHash(txHash) : "완료"}
        <ExternalLinkIcon className="size-3 text-n-400" />
      </span>
    );
  if (status === "rejected")
    return <span className="flex justify-end text-[12px] text-text-tertiary">반려됨</span>;

  const spinner = pending ? <Loader2Icon className="size-3.5 animate-spin" /> : null;

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex justify-end gap-1.5">
        {status === "pending" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("approved")}
              className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {spinner ?? <CheckIcon className="size-3.5" />} 승인
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("rejected")}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-negative ring-1 ring-negative-soft disabled:opacity-60"
            >
              반려
            </button>
          </>
        )}
        {status === "approved" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("sending")}
              className="inline-flex items-center gap-1 rounded-md bg-info px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              {spinner ?? <SendIcon className="size-3.5" />} 송금
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => act("rejected")}
              className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-negative ring-1 ring-negative-soft disabled:opacity-60"
            >
              반려
            </button>
          </>
        )}
        {status === "sending" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => act("completed", `0x${id.replace(/-/g, "").slice(0, 12)}`)}
            className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {spinner ?? <CheckCheckIcon className="size-3.5" />} 완료 처리
          </button>
        )}
      </span>
      {err ? <span className="text-[10px] text-negative">{err}</span> : null}
    </span>
  );
}

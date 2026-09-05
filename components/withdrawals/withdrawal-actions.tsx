"use client";

import * as React from "react";
import { CheckIcon, SendIcon, CheckCheckIcon, Loader2Icon, ExternalLinkIcon } from "lucide-react";

import { transitionWithdrawal, type WithdrawalStatus } from "@/lib/actions/withdrawals";
import { isValidTxHash, txExplorerUrl, shortHash } from "@/lib/chain/explorer";
import { cn } from "@/lib/utils";

// 출금 행 액션 — 상태별 다음 전이. pending→승인/반려, approved→송금 시작/반려, sending→tx_hash 입력 후 완료.
// 송금은 운영자가 TronLink/MetaMask 로 직접 보내고(2026-09-04 결정), 체인에서 받은 tx_hash 를 여기 입력해 완료 처리한다.
export function WithdrawalActions({
  id,
  status,
  network,
  txHash,
}: {
  id: string;
  status: WithdrawalStatus;
  network: string;
  txHash: string | null;
}) {
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [hash, setHash] = React.useState("");

  const act = (to: WithdrawalStatus, h?: string) =>
    start(async () => {
      setErr(null);
      try {
        await transitionWithdrawal(id, to, h);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "처리 실패");
      }
    });

  if (status === "completed") {
    const url = txExplorerUrl(network, txHash);
    return txHash ? (
      <a
        href={url ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-end gap-1.5 font-mono text-[12px] tabular-nums text-text-tertiary hover:text-text-primary hover:underline"
        title={txHash}
      >
        {shortHash(txHash)}
        <ExternalLinkIcon className="size-3 text-n-400" />
      </a>
    ) : (
      <span className="flex justify-end text-[12px] text-text-tertiary">완료</span>
    );
  }
  if (status === "rejected") return <span className="flex justify-end text-[12px] text-text-tertiary">반려됨</span>;

  const spinner = pending ? <Loader2Icon className="size-3.5 animate-spin" /> : null;
  const hashOk = isValidTxHash(network, hash);

  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex justify-end gap-1.5">
        {status === "pending" && (
          <>
            <button type="button" disabled={pending} onClick={() => act("approved")} className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              {spinner ?? <CheckIcon className="size-3.5" />} 승인
            </button>
            <button type="button" disabled={pending} onClick={() => act("rejected")} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-negative ring-1 ring-negative-soft disabled:opacity-60">
              반려
            </button>
          </>
        )}
        {status === "approved" && (
          <>
            <button type="button" disabled={pending} onClick={() => act("sending")} className="inline-flex items-center gap-1 rounded-md bg-info px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60" title="지갑 앱에서 송금을 시작했으면 누르세요">
              {spinner ?? <SendIcon className="size-3.5" />} 송금 시작
            </button>
            <button type="button" disabled={pending} onClick={() => act("rejected")} className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-negative ring-1 ring-negative-soft disabled:opacity-60">
              반려
            </button>
          </>
        )}
        {status === "sending" && (
          <>
            <input
              value={hash}
              onChange={(e) => setHash(e.target.value.trim())}
              placeholder={network === "TRC20" ? "tx_hash (64자 hex)" : "tx_hash (0x + 64자)"}
              spellCheck={false}
              className={cn(
                "w-[200px] rounded-md bg-card px-2.5 py-1.5 font-mono text-[11px] text-text-primary ring-1 outline-none placeholder:text-text-tertiary focus:ring-2",
                hash && !hashOk ? "ring-negative focus:ring-negative" : "ring-border-strong focus:ring-green-500",
              )}
            />
            <button
              type="button"
              disabled={pending || !hashOk}
              onClick={() => act("completed", hash)}
              className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {spinner ?? <CheckCheckIcon className="size-3.5" />} 완료
            </button>
          </>
        )}
      </span>
      {status === "sending" && hash && !hashOk ? <span className="text-[10px] text-negative">{network} 해시 형식이 아닙니다</span> : null}
      {err ? <span className="text-[10px] text-negative">{err}</span> : null}
    </span>
  );
}

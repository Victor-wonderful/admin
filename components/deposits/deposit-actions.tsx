"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RadarIcon, Loader2Icon, UserRoundCheckIcon, BanIcon, CheckIcon } from "lucide-react";

import { runDepositScan, creditDepositToMember, ignoreDeposit } from "@/lib/actions/deposits";
import type { NetworkScanResult } from "@/lib/deposit-scan";
import { cn } from "@/lib/utils";

const inputCls =
  "rounded-md bg-card px-2.5 py-1.5 text-xs text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";

// "지금 스캔" — 크론과 같은 스캔을 즉시 실행하고 네트워크별 결과를 한 줄로 보여준다.
export function DepositScanButton({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const line = (r: NetworkScanResult) =>
    r.skipped ? `${r.network}: 건너뜀(${r.skipped})` : r.error ? `${r.network}: 오류 — ${r.error}` : `${r.network}: 조회 ${r.fetched} · 반영 ${r.credited} · 미확인 ${r.unmatched}`;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || readOnly}
        title={readOnly ? "현재 역할은 실행 권한이 없습니다(조회 전용)" : undefined}
        onClick={() =>
          start(async () => {
            setMsg(null);
            setErr(null);
            const res = await runDepositScan();
            if (!res.ok) {
              setErr(res.error);
              return;
            }
            setMsg(res.results.map(line).join(" / "));
            router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
      >
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <RadarIcon className="size-4" />} 지금 스캔
      </button>
      {msg ? <span className="max-w-[520px] text-right text-[11px] text-text-secondary">{msg}</span> : null}
      {err ? <span className="text-[11px] font-medium text-negative">{err}</span> : null}
    </div>
  );
}

// 미확인 입금 행 액션 — 회원 지정(이메일/UID) 후 잔액 반영, 또는 무시.
export function UnmatchedDepositActions({ depositId, readOnly = false }: { depositId: string; readOnly?: boolean }) {
  const router = useRouter();
  const [ref, setRef] = React.useState("");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<"credited" | "ignored" | null>(null);

  const credit = () =>
    start(async () => {
      setErr(null);
      const res = await creditDepositToMember(depositId, ref);
      if (!res.ok) return setErr(res.error);
      setDone("credited");
      router.refresh();
    });
  const ignore = () =>
    start(async () => {
      setErr(null);
      const res = await ignoreDeposit(depositId);
      if (!res.ok) return setErr(res.error);
      setDone("ignored");
      router.refresh();
    });

  if (readOnly) return <span className="flex justify-end text-[11px] text-text-tertiary" title="현재 역할은 실행 권한이 없습니다(조회 전용)">조회 전용</span>;
  if (done)
    return (
      <span className={cn("inline-flex items-center justify-end gap-1 text-[12px] font-semibold", done === "credited" ? "text-green-700" : "text-text-tertiary")}>
        <CheckIcon className="size-3.5" /> {done === "credited" ? "잔액 반영됨" : "무시됨"}
      </span>
    );

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="회원 이메일 또는 FT·UID"
          className={cn(inputCls, "w-[190px]")}
          spellCheck={false}
        />
        <button
          type="button"
          disabled={pending || !ref.trim()}
          onClick={credit}
          className="inline-flex items-center gap-1 rounded-md bg-brand px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <UserRoundCheckIcon className="size-3.5" />} 반영
        </button>
        <button type="button" disabled={pending} onClick={ignore} className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-border-strong disabled:opacity-50">
          <BanIcon className="size-3.5" /> 무시
        </button>
      </div>
      {err ? <span className="text-[10px] text-negative">{err}</span> : null}
    </div>
  );
}

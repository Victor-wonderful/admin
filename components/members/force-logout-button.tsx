"use client";

import * as React from "react";
import { LogOutIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { revokeMemberSessions } from "@/lib/actions/sessions";

// 관리자 회원 상세 — 강제 로그아웃(활성 세션 전부 폐기).
export function ForceLogoutButton({ memberId, activeCount }: { memberId: string; activeCount: number }) {
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const run = () =>
    start(async () => {
      setErr(null);
      const res = await revokeMemberSessions(memberId);
      if (!res.ok) {
        setErr(res.error ?? "실패");
        return;
      }
      setDone(true);
    });

  const disabled = pending || done || activeCount === 0;
  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={disabled}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-card py-2 text-[12px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-60"
      >
        {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : done ? <CheckIcon className="size-3.5 text-green-600" /> : <LogOutIcon className="size-3.5" />}
        {done ? "접속 종료됨" : activeCount === 0 ? "활성 접속 없음" : `강제 로그아웃 (${activeCount})`}
      </button>
      {err ? <span className="text-[11px] text-negative">{err}</span> : null}
    </div>
  );
}

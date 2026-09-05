"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, Loader2Icon } from "lucide-react";

import { revokeAdminSession, revokeOtherAdminSessions } from "@/lib/actions/admin-auth";

// 내 계정 · 로그인 중인 기기 — 다른 기기 세션 종료 버튼(현재 기기는 로그아웃 버튼 사용).
export function SessionRevokeButton({ sessionId, isCurrent }: { sessionId: string; isCurrent: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  if (isCurrent) return <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">현재 기기</span>;
  return (
    <span className="flex items-center gap-1.5">
      {err ? <span className="text-[10px] text-negative">{err}</span> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { setErr(null); const r = await revokeAdminSession(sessionId); if (!r.ok) setErr(r.error ?? "실패"); else router.refresh(); })}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border-strong hover:text-negative disabled:opacity-50"
      >
        {pending ? <Loader2Icon className="size-3 animate-spin" /> : <LogOutIcon className="size-3" />} 종료
      </button>
    </span>
  );
}

// 다른 기기 세션 전부 종료.
export function RevokeOthersButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  return (
    <span className="flex items-center gap-2">
      {msg ? <span className="text-[11px] text-text-tertiary">{msg}</span> : null}
      <button
        type="button"
        disabled={pending || count === 0}
        title={count === 0 ? "다른 기기 로그인이 없습니다" : undefined}
        onClick={() => { if (!window.confirm(`다른 기기 ${count}개의 로그인을 모두 종료할까요? 현재 기기는 유지됩니다.`)) return; start(async () => { const r = await revokeOtherAdminSessions(); setMsg(r.ok ? `${r.count ?? 0}개 종료` : r.error ?? "실패"); router.refresh(); }); }}
        className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-[12px] font-semibold text-text-secondary ring-1 ring-border-strong hover:text-negative disabled:opacity-50"
      >
        {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <LogOutIcon className="size-3.5" />} 다른 기기 모두 종료
      </button>
    </span>
  );
}

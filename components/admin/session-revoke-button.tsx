"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, Loader2Icon } from "lucide-react";

import { revokeAdminSession } from "@/lib/actions/admin-auth";

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

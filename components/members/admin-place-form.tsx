"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GitBranchIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { placeMemberByAdmin } from "@/lib/actions/placement";

const inputCls = "w-full rounded-md bg-card px-3 py-2 text-sm text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";

// 관리자 후원배치 이동 — 확정된 배치도 사유를 남기고 이동. 대상 부모는 회원 id(UUID) 또는 이메일.
export function AdminPlaceForm({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [parent, setParent] = React.useState("");
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const run = () =>
    start(async () => {
      setErr(null);
      setMsg(null);
      const res = await placeMemberByAdmin(memberId, parent.trim(), note);
      if (!res.ok) return setErr(res.error);
      setMsg(`${res.slot}번 자리로 이동했습니다`);
      setParent("");
      setNote("");
      router.refresh();
    });

  return (
    <div className="space-y-2">
      <input value={parent} onChange={(e) => setParent(e.target.value)} placeholder="새 후원 부모 회원 ID (UUID)" className={inputCls} spellCheck={false} />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="이동 사유 (필수)" className={inputCls} />
      <div className="flex items-center gap-3">
        <button type="button" disabled={pending || !parent.trim() || !note.trim()} onClick={run} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <GitBranchIcon className="size-4" />} 후원배치 이동
        </button>
        {msg ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckIcon className="size-3.5" /> {msg}</span> : null}
        {err ? <span className="text-xs font-medium text-negative">{err}</span> : null}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { UserPlusIcon, Loader2Icon, CheckIcon, XIcon, KeyRoundIcon, PowerIcon } from "lucide-react";

import { createAdmin, setAdminActive, resetAdminTotp } from "@/lib/actions/admin-auth";
import { Field } from "@/components/auth/field";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

const ROLE_OPTS = [
  { v: "super", l: "슈퍼관리자" }, { v: "settlement", l: "정산 관리자" }, { v: "ops", l: "운영 매니저" }, { v: "viewer", l: "조회 전용" },
];

// 관리자 추가 모달(슈퍼관리자) — 이메일·이름·역할·임시 비밀번호. 2FA 는 그 관리자의 첫 로그인 때 등록.
export function AddAdminButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState(createAdmin, undefined);
  const close = React.useCallback(() => setOpen(false), []);
  useEscapeKey(open, close);
  React.useEffect(() => {
    if (state?.ok && open) {
      const t = setTimeout(() => { setOpen(false); router.refresh(); }, 700);
      return () => clearTimeout(t);
    }
  }, [state, open, router]);
  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} title={disabled ? "슈퍼관리자만 추가할 수 있습니다" : undefined} className="inline-flex items-center gap-1.5 rounded-[10px] bg-brand px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
        <UserPlusIcon className="size-3.5" /> 관리자 추가
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={close} />
          <form action={action} className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">관리자 추가</h2>
                <p className="mt-0.5 text-xs text-text-secondary">임시 비밀번호를 전달하세요 · 첫 로그인에서 인증 앱을 등록합니다</p>
              </div>
              <button type="button" onClick={close} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><XIcon className="size-4" /></button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <Field label="이름" name="name" placeholder="홍길동" required />
              <Field label="이메일" name="email" type="email" placeholder="ops@example.com" required />
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text-secondary">역할</span>
                <select name="role" defaultValue="ops" className="w-full rounded-md bg-card px-3.5 py-2.5 text-sm text-text-primary ring-1 ring-border-strong outline-none focus:ring-2 focus:ring-green-500">
                  {ROLE_OPTS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                </select>
              </label>
              <Field label="임시 비밀번호" name="password" type="text" autoComplete="off" placeholder="8자 이상" minLength={8} required />
              {state?.error ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div> : null}
              {state?.ok ? <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"><CheckIcon className="size-3.5" /> 추가했습니다</div> : null}
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button type="button" onClick={close} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">취소</button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <UserPlusIcon className="size-3.5" />} 추가
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

// 행 액션 — 활성/비활성 토글, 2FA 재설정(슈퍼관리자만)
export function AdminRowActions({ adminId, active, isSelf, canManage }: { adminId: string; active: boolean; isSelf: boolean; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  if (!canManage) return <span className="text-[11px] text-text-tertiary">—</span>;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "실패");
      else router.refresh();
    });
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex gap-1.5">
        <button type="button" disabled={pending} onClick={() => run(() => resetAdminTotp(adminId))} title="인증 앱 분실 시 재등록" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border-strong disabled:opacity-50">
          <KeyRoundIcon className="size-3" /> 2FA 재설정
        </button>
        <button type="button" disabled={pending || isSelf} onClick={() => run(() => setAdminActive(adminId, !active))} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ring-1 disabled:opacity-50", active ? "text-negative ring-negative-soft" : "text-green-700 ring-green-500")}>
          <PowerIcon className="size-3" /> {active ? "비활성화" : "활성화"}
        </button>
      </span>
      {err ? <span className="text-[10px] text-negative">{err}</span> : null}
    </span>
  );
}

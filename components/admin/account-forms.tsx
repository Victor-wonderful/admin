"use client";

import { useActionState } from "react";
import { Loader2Icon, KeyRoundIcon, CheckCircle2Icon, ShieldCheckIcon } from "lucide-react";

import { changeAdminPassword, restartMyTotp, type AdminAuthState } from "@/lib/actions/admin-auth";
import { Field } from "@/components/auth/field";

function Status({ state, okMsg }: { state: AdminAuthState; okMsg: string }) {
  if (state?.error) return <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div>;
  if (state?.ok) return <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700"><CheckCircle2Icon className="size-3.5" /> {okMsg}</div>;
  return null;
}
const BTN = "inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60";

// 관리자 비밀번호 변경 — 현재 비밀번호 확인 → 8자 이상 새 비밀번호. 변경 시 다른 기기 세션은 종료.
export function AdminPasswordForm() {
  const [state, action, pending] = useActionState(changeAdminPassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="현재 비밀번호" name="current" type="password" autoComplete="current-password" required />
      <Field label="새 비밀번호" name="next" type="password" autoComplete="new-password" minLength={8} placeholder="8자 이상" required />
      <Field label="새 비밀번호 확인" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <Status state={state} okMsg="비밀번호를 변경했습니다. 다른 기기의 로그인은 종료됐습니다" />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <KeyRoundIcon className="size-4" />} 비밀번호 변경
      </button>
    </form>
  );
}

// 인증 앱 재등록 — 휴대폰을 바꿨을 때. 현재 비밀번호 확인 후 새 QR 화면으로 이동.
export function AdminTotpRestartForm() {
  const [state, action, pending] = useActionState(restartMyTotp, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="현재 비밀번호" name="current" type="password" autoComplete="current-password" required hint="확인 후 새 QR 이 표시되고, 새 코드로 등록해야 다시 들어올 수 있습니다" />
      <Status state={state} okMsg="" />
      <button type="submit" disabled={pending} className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-bold text-crypto ring-1 ring-crypto disabled:opacity-60">
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />} 인증 앱 다시 등록
      </button>
    </form>
  );
}

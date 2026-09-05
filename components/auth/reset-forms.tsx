"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon, MailIcon, KeyRoundIcon, CheckIcon, ArrowLeftIcon } from "lucide-react";

import { requestMemberPasswordReset, completeMemberPasswordReset, type ResetState } from "@/lib/actions/auth";
import { Field } from "@/components/auth/field";

const BTN = "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-60";

function ErrorBox({ state }: { state: ResetState }) {
  if (!state?.error) return null;
  return <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div>;
}

// 비밀번호 찾기 — ID(이메일)로 재설정 링크 요청. 결과 문구는 계정 존재 여부와 무관하게 동일.
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestMemberPasswordReset, undefined);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-text-secondary">가입한 ID(이메일)로 재설정 링크를 보내드립니다</p>
      </div>

      {state?.ok ? (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-md bg-green-50 px-3.5 py-3 text-xs leading-relaxed text-green-700">
            <CheckIcon className="size-4 shrink-0" />
            <span><b>{state.values?.email}</b> 이 가입된 ID 라면 재설정 링크를 보냈습니다. 링크는 <b>30분</b> 동안 한 번만 쓸 수 있습니다. 메일이 없으면 스팸함을 확인하세요.</span>
          </div>
          {state.devLink ? (
            <div className="space-y-1.5 rounded-md bg-surface-muted p-3 ring-1 ring-border">
              <div className="text-[11px] font-semibold text-text-secondary">개발 모드 · 메일 제공자 미설정 — 링크를 여기에 표시합니다</div>
              <a href={state.devLink} className="block break-all font-mono text-[11px] text-brand underline-offset-2 hover:underline">{state.devLink}</a>
            </div>
          ) : null}
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <Field label="ID" name="email" type="email" autoComplete="username" placeholder="you@example.com" defaultValue={state?.values?.email} autoFocus required />
          <ErrorBox state={state} />
          <button type="submit" disabled={pending} className={BTN}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <MailIcon className="size-4" />} 재설정 링크 보내기
          </button>
        </form>
      )}

      <p className="text-center text-xs text-text-secondary">
        <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-crypto hover:underline"><ArrowLeftIcon className="size-3.5" /> 로그인으로</Link>
      </p>
    </div>
  );
}

// 링크로 들어온 새 비밀번호 설정. 성공하면 서버 액션이 /login?reason=reset_done 으로 보낸다.
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(completeMemberPasswordReset, undefined);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary">새 비밀번호 설정</h1>
        <p className="mt-1 text-sm text-text-secondary">{email} · 8자 이상 · 포르투나 앱 로그인에도 같은 비밀번호가 적용됩니다</p>
      </div>
      <form action={action} className="space-y-3">
        <input type="hidden" name="token" value={token} />
        <Field label="새 비밀번호" name="next" type="password" autoComplete="new-password" placeholder="8자 이상" minLength={8} autoFocus required />
        <Field label="새 비밀번호 확인" name="confirm" type="password" autoComplete="new-password" placeholder="한 번 더 입력" minLength={8} required />
        <ErrorBox state={state} />
        <button type="submit" disabled={pending} className={BTN}>
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <KeyRoundIcon className="size-4" />} 비밀번호 변경
        </button>
        <p className="text-center text-[11px] text-text-tertiary">변경하면 기존 로그인은 모두 해제됩니다</p>
      </form>
    </div>
  );
}

// 토큰이 죽어 있을 때 안내.
export function ResetLinkInvalid() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary">링크를 사용할 수 없습니다</h1>
        <p className="mt-1 text-sm text-text-secondary">재설정 링크가 잘못되었거나 만료(30분)되었거나 이미 사용되었습니다</p>
      </div>
      <Link href="/forgot" className={BTN}>새 링크 요청</Link>
      <p className="text-center text-xs text-text-secondary">
        <Link href="/login" className="font-semibold text-crypto hover:underline">로그인으로</Link>
      </p>
    </div>
  );
}

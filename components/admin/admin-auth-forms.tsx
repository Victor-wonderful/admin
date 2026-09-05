"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { Loader2Icon, LogInIcon, ShieldCheckIcon, TriangleAlertIcon, CopyIcon, CheckIcon, MailIcon, KeyRoundIcon, ArrowLeftIcon } from "lucide-react";

import { adminLogin, adminVerifyTotp, requestAdminPasswordReset, completeAdminPasswordReset, type AdminAuthState } from "@/lib/actions/admin-auth";
import { Field } from "@/components/auth/field";

const BTN = "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-60";

function ErrorBox({ state }: { state: AdminAuthState }) {
  if (!state?.error) return null;
  return (
    <div className="flex gap-2 rounded-md bg-negative-soft px-3.5 py-3 text-xs leading-relaxed text-negative">
      <TriangleAlertIcon className="size-4 shrink-0" /> <span>{state.error}</span>
    </div>
  );
}

function NoticeBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-md bg-green-50 px-3.5 py-3 text-xs leading-relaxed text-green-700">
      <CheckIcon className="size-4 shrink-0" /> <span>{children}</span>
    </div>
  );
}

// 1단계 — 이메일 + 비밀번호
export function AdminLoginForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="space-y-3">
      {notice && !state?.error ? <NoticeBox>{notice}</NoticeBox> : null}
      <Field label="이메일" name="email" type="email" autoComplete="username" placeholder="admin@fortuna.demo" defaultValue={state?.values?.email} required />
      <Field label="비밀번호" name="password" type="password" autoComplete="current-password" placeholder="비밀번호 입력" required />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <LogInIcon className="size-4" />} 다음 · 2단계 인증
      </button>
      <div className="flex items-center justify-between text-[11px] text-text-tertiary">
        <span>IP·기기 기록 · 5회 오입력 시 15분 잠금</span>
        <Link href="/admin-forgot" className="font-semibold text-text-secondary underline-offset-2 hover:underline">비밀번호를 잊으셨나요?</Link>
      </div>
    </form>
  );
}

// 비밀번호 찾기 — 이메일로 재설정 링크 요청. 결과 문구는 계정 존재 여부와 무관하게 동일.
export function AdminForgotForm() {
  const [state, action, pending] = useActionState(requestAdminPasswordReset, undefined);
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <NoticeBox>
          <b>{state.values?.email}</b> 이 등록된 관리자 이메일이면 재설정 링크를 보냈습니다. 링크는 <b>30분</b> 동안 한 번만 쓸 수 있습니다. 메일이 없으면 스팸함을 확인하세요.
        </NoticeBox>
        {state.devLink ? (
          <div className="space-y-1.5 rounded-md bg-surface-muted p-3 ring-1 ring-border">
            <div className="text-[11px] font-semibold text-text-secondary">개발 모드 · 메일 제공자 미설정 — 링크를 여기에 표시합니다</div>
            <a href={state.devLink} className="block break-all font-mono text-[11px] text-brand underline-offset-2 hover:underline">{state.devLink}</a>
          </div>
        ) : null}
        <p className="text-[12px] leading-relaxed text-text-secondary">메일을 받을 수 없다면 슈퍼관리자에게 <b>관리자 관리 → 비밀번호 초기화</b>로 임시 비밀번호 발급을 요청하세요.</p>
        <Link href="/admin-login" className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-secondary underline-offset-2 hover:underline"><ArrowLeftIcon className="size-3.5" /> 로그인으로</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <Field label="관리자 이메일" name="email" type="email" autoComplete="username" placeholder="admin@fortuna.demo" defaultValue={state?.values?.email} autoFocus required />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <MailIcon className="size-4" />} 재설정 링크 보내기
      </button>
      <p className="text-[11px] leading-relaxed text-text-tertiary">메일을 받을 수 없다면 슈퍼관리자에게 임시 비밀번호 발급을 요청하세요(관리자 관리 → 비밀번호 초기화).</p>
      <Link href="/admin-login" className="inline-flex items-center gap-1 text-[12px] font-semibold text-text-secondary underline-offset-2 hover:underline"><ArrowLeftIcon className="size-3.5" /> 로그인으로</Link>
    </form>
  );
}

// 링크로 들어온 새 비밀번호 설정. 성공하면 서버 액션이 /admin-login?reset=1 로 보낸다.
export function AdminResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(completeAdminPasswordReset, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <Field label="새 비밀번호" name="next" type="password" autoComplete="new-password" placeholder="8자 이상" minLength={8} autoFocus required />
      <Field label="새 비밀번호 확인" name="confirm" type="password" autoComplete="new-password" placeholder="한 번 더 입력" minLength={8} required />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <KeyRoundIcon className="size-4" />} 비밀번호 변경
      </button>
      <p className="text-center text-[11px] text-text-tertiary">변경하면 이 계정의 모든 기기 로그인이 해제됩니다</p>
    </form>
  );
}

// 2단계 — 인증 앱 코드. 미등록이면 QR·비밀키를 함께 보여 등록을 겸한다.
export function AdminTotpForm({ enrolled, secret, otpauth, account }: { enrolled: boolean; secret: string; otpauth: string; account: string }) {
  const [state, action, pending] = useActionState(adminVerifyTotp, undefined);
  const [copied, setCopied] = React.useState(false);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(otpauth)}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <form action={action} className="space-y-4">
      {!enrolled ? (
        <div className="space-y-3 rounded-lg bg-surface-muted p-4 ring-1 ring-border">
          <div className="text-[13px] font-bold text-text-primary">인증 앱 등록 (처음 한 번)</div>
          <p className="text-[12px] leading-relaxed text-text-secondary">
            Google Authenticator·Authy 같은 인증 앱으로 아래 QR 을 스캔하세요. 스캔이 안 되면 비밀키를 직접 입력합니다. 계정 이름: <b className="text-text-primary">{account}</b>
          </p>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="인증 앱 등록 QR" width={140} height={140} className="rounded-md bg-white p-1 ring-1 ring-border" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="text-[11px] font-medium text-text-tertiary">비밀키 (base32)</div>
              <button type="button" onClick={copy} className="flex w-full items-center gap-2 rounded-md bg-card px-3 py-2 text-left font-mono text-[12px] tracking-wider text-text-primary ring-1 ring-border-strong hover:ring-green-500">
                <span className="flex-1 break-all">{secret.match(/.{1,4}/g)?.join(" ")}</span>
                {copied ? <CheckIcon className="size-4 text-green-600" /> : <CopyIcon className="size-4 text-text-tertiary" />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <Field label="인증 코드 (6자리)" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" placeholder="000000" maxLength={7} autoFocus required />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <ShieldCheckIcon className="size-4" />} {enrolled ? "확인하고 들어가기" : "등록 확정하고 들어가기"}
      </button>
    </form>
  );
}

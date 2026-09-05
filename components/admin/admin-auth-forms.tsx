"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2Icon, LogInIcon, ShieldCheckIcon, TriangleAlertIcon, CopyIcon, CheckIcon } from "lucide-react";

import { adminLogin, adminVerifyTotp, type AdminAuthState } from "@/lib/actions/admin-auth";
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

// 1단계 — 이메일 + 비밀번호
export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLogin, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="이메일" name="email" type="email" autoComplete="username" placeholder="admin@fortuna.demo" defaultValue={state?.values?.email} required />
      <Field label="비밀번호" name="password" type="password" autoComplete="current-password" placeholder="비밀번호 입력" required />
      <ErrorBox state={state} />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <LogInIcon className="size-4" />} 다음 · 2단계 인증
      </button>
      <p className="text-center text-[11px] text-text-tertiary">IP·기기 기록 · 5회 오입력 시 15분 잠금</p>
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

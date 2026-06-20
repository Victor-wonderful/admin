"use client";

import * as React from "react";
import { useActionState } from "react";
import { Loader2Icon, LogInIcon, UserRoundIcon, CreditCardIcon, BadgeCheckIcon } from "lucide-react";

import { loginByEmail, loginAs } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const QUICK = [
  { id: "registered", label: "등록회원", icon: UserRoundIcon, tone: "ring-n-400 text-n-600" },
  { id: "subscriber", label: "구독회원", icon: CreditCardIcon, tone: "ring-green-500 text-green-700" },
  { id: "marketer", label: "마케터", icon: BadgeCheckIcon, tone: "ring-crypto text-crypto" },
] as const;

export function LoginForm({ demoIds }: { demoIds: Record<string, string> }) {
  const [state, action, pending] = useActionState(loginByEmail, undefined);
  const [quickPending, startQuick] = React.useTransition();

  return (
    <div className="w-full max-w-[400px] space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary">로그인</h1>
        <p className="mt-1 text-sm text-text-secondary">Alpha Gate 회원 포털 · 등급에 맞는 화면으로 이동합니다</p>
      </div>

      <form action={action} className="space-y-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-text-secondary">이메일</span>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-md bg-card px-3.5 py-2.5 text-sm text-text-primary ring-1 ring-border-strong outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        {state?.error ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div> : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <LogInIcon className="size-4" />} 로그인
        </button>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] font-medium text-text-tertiary">데모 빠른 로그인</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {QUICK.map((q) => (
          <button
            key={q.id}
            type="button"
            disabled={quickPending}
            onClick={() => startQuick(() => { void loginAs(demoIds[q.id]); })}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg bg-card px-2 py-3.5 ring-1 transition-colors hover:bg-surface-muted disabled:opacity-60",
              q.tone,
            )}
          >
            <q.icon className="size-5" />
            <span className="text-[12px] font-semibold text-text-primary">{q.label}</span>
          </button>
        ))}
      </div>
      <p className="text-center text-[11px] text-text-tertiary">데모: 비밀번호 없이 등급별 계정으로 즉시 로그인</p>
    </div>
  );
}

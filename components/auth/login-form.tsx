"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon, LogInIcon } from "lucide-react";

import { loginByEmail } from "@/lib/actions/auth";
import { Field } from "@/components/auth/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginByEmail, undefined);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary">로그인</h1>
        <p className="mt-1 text-sm text-text-secondary">포르투나 회원 포털 · 등급에 맞는 화면으로 이동합니다</p>
      </div>

      <form action={action} className="space-y-3">
        <Field
          label="ID"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          defaultValue={state?.values?.email}
          required
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          required
        />
        {state?.error ? (
          <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <LogInIcon className="size-4" />} 로그인
        </button>
      </form>

      <p className="text-center text-xs text-text-secondary">
        계정이 없으면{" "}
        <Link href="/signup" className="font-semibold text-crypto hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  );
}

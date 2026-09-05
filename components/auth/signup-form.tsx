"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2Icon, UserRoundPlusIcon } from "lucide-react";

import { signup } from "@/lib/actions/auth";
import { Field } from "@/components/auth/field";

export function SignupForm({ refCode }: { refCode?: string }) {
  const [state, action, pending] = useActionState(signup, undefined);
  const v = state?.values ?? {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold text-text-primary">회원가입</h1>
        <p className="mt-1 text-sm text-text-secondary">추천 코드로 가입 · 등록회원으로 시작합니다</p>
      </div>

      <form action={action} className="space-y-3">
        <Field
          label="닉네임"
          name="nickname"
          autoComplete="nickname"
          placeholder="화면에 표시될 이름"
          defaultValue={v.nickname}
          maxLength={20}
          required
        />
        <Field
          label="ID"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@example.com"
          defaultValue={v.email}
          hint="이메일 주소가 ID로 사용됩니다"
          required
        />
        <Field
          label="비밀번호"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="8자 이상"
          minLength={8}
          required
        />
        <Field
          label="비밀번호 확인"
          name="confirm"
          type="password"
          autoComplete="new-password"
          placeholder="비밀번호 다시 입력"
          minLength={8}
          required
        />
        <Field
          label="추천 코드"
          name="ref"
          placeholder="예: REF0"
          defaultValue={v.ref ?? refCode}
          hint="추천한 파트너의 코드 · 가입 후 변경할 수 없습니다"
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
          {pending ? <Loader2Icon className="size-4 animate-spin" /> : <UserRoundPlusIcon className="size-4" />} 회원가입
        </button>
      </form>

      <p className="text-center text-xs text-text-secondary">
        이미 계정이 있으면{" "}
        <Link href="/login" className="font-semibold text-crypto hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}

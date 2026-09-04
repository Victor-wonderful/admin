"use client";

import { useActionState } from "react";
import { Loader2Icon, CheckCircle2Icon, KeyRoundIcon, UserRoundPenIcon, WalletIcon } from "lucide-react";

import { updateNickname, changePassword, updatePayoutAddresses } from "@/lib/actions/profile";
import { Field } from "@/components/auth/field";

function Status({ state, okMsg }: { state: { ok?: boolean; error?: string } | undefined; okMsg: string }) {
  if (state?.error) return <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div>;
  if (state?.ok)
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
        <CheckCircle2Icon className="size-3.5" /> {okMsg}
      </div>
    );
  return null;
}

const BTN = "inline-flex items-center justify-center gap-2 rounded-md bg-brand px-4 py-2.5 text-[13px] font-bold text-white disabled:opacity-60";

export function NicknameForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(updateNickname, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="닉네임" name="nickname" defaultValue={current} maxLength={20} placeholder="화면에 표시될 이름" required />
      <Status state={state} okMsg="닉네임을 변경했습니다" />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <UserRoundPenIcon className="size-4" />} 닉네임 저장
      </button>
    </form>
  );
}

export function PayoutAddressForm({ trc20, bep20 }: { trc20: string; bep20: string }) {
  const [state, action, pending] = useActionState(updatePayoutAddresses, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="Tron (TRC20) 지갑 주소" name="trc20" defaultValue={trc20} placeholder="T로 시작하는 34자리" autoComplete="off" spellCheck={false} />
      <Field label="BSC (BEP20) 지갑 주소" name="bep20" defaultValue={bep20} placeholder="0x로 시작하는 42자리" autoComplete="off" spellCheck={false} />
      <Status state={state} okMsg="지갑 주소를 저장했습니다" />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <WalletIcon className="size-4" />} 지갑 주소 저장
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="현재 비밀번호" name="current" type="password" autoComplete="current-password" required />
      <Field label="새 비밀번호" name="next" type="password" autoComplete="new-password" minLength={8} placeholder="8자 이상" required />
      <Field label="새 비밀번호 확인" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <Status state={state} okMsg="비밀번호를 변경했습니다" />
      <button type="submit" disabled={pending} className={BTN}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : <KeyRoundIcon className="size-4" />} 비밀번호 변경
      </button>
    </form>
  );
}

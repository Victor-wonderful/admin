"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { UserPlusIcon, Loader2Icon, CheckIcon, XIcon, KeyRoundIcon, PowerIcon, LockKeyholeIcon, CopyIcon } from "lucide-react";

import { createAdmin, setAdminActive, resetAdminTotp, resetAdminPassword, setAdminRole } from "@/lib/actions/admin-auth";
import type { AdminRole } from "@/lib/admin-session";
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

// 임시 비밀번호 표시 모달 — 한 번만 보여주므로 복사해 전달하게 안내.
function TempPasswordModal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  useEscapeKey(true, onClose);
  const copy = async () => {
    try { await navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-text-primary">임시 비밀번호 발급</h2>
            <p className="mt-0.5 text-xs text-text-secondary">{email} · 이 창을 닫으면 다시 볼 수 없습니다</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><XIcon className="size-4" /></button>
        </div>
        <div className="space-y-3 px-6 py-5">
          <button type="button" onClick={copy} className="flex w-full items-center gap-2 rounded-md bg-surface-muted px-3.5 py-3 text-left font-mono text-[15px] tracking-wider text-text-primary ring-1 ring-border-strong hover:ring-green-500">
            <span className="flex-1">{password}</span>
            {copied ? <CheckIcon className="size-4 text-green-600" /> : <CopyIcon className="size-4 text-text-tertiary" />}
          </button>
          <p className="text-[12px] leading-relaxed text-text-secondary">
            해당 관리자에게 안전한 경로로 전달하세요. 기존 비밀번호는 즉시 무효화되고 모든 기기에서 로그아웃됩니다. 로그인 후 <b>내 계정</b>에서 비밀번호를 바꾸도록 안내하세요.
          </p>
        </div>
        <div className="flex justify-end border-t px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white">닫기</button>
        </div>
      </div>
    </div>
  );
}

// 행 액션 — 활성/비활성 토글, 2FA 재설정, 비밀번호 초기화(슈퍼관리자만)
export function AdminRowActions({ adminId, email, role, active, isSelf, canManage }: { adminId: string; email: string; role: AdminRole; active: boolean; isSelf: boolean; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [temp, setTemp] = React.useState<string | null>(null);
  if (!canManage) return <span className="text-[11px] text-text-tertiary">—</span>;
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (!r.ok) setErr(r.error ?? "실패");
      else router.refresh();
    });
  const resetPassword = () => {
    if (!window.confirm(`${email} 의 비밀번호를 초기화할까요?\n기존 비밀번호는 무효화되고 모든 기기에서 로그아웃됩니다.`)) return;
    start(async () => {
      setErr(null);
      const r = await resetAdminPassword(adminId);
      if (!r.ok || !r.tempPassword) setErr(r.error ?? "실패");
      else { setTemp(r.tempPassword); router.refresh(); }
    });
  };
  return (
    <span className="flex flex-col items-end gap-1">
      {temp ? <TempPasswordModal email={email} password={temp} onClose={() => setTemp(null)} /> : null}
      <span className="flex gap-1.5">
        <select
          value={role}
          disabled={pending || isSelf}
          title={isSelf ? "본인 역할은 다른 슈퍼관리자가 변경" : "역할 변경 · 즉시 적용"}
          onChange={(e) => {
            const next = e.target.value as AdminRole;
            if (!window.confirm(`${email} 의 역할을 '${ROLE_OPTS.find((o) => o.v === next)?.l}' 로 바꿀까요?`)) { e.target.value = role; return; }
            run(() => setAdminRole(adminId, next));
          }}
          className="rounded-md bg-card px-2 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border-strong outline-none disabled:opacity-50"
        >
          {ROLE_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
        </select>
        <button type="button" disabled={pending || isSelf} onClick={resetPassword} title={isSelf ? "본인은 내 계정에서 변경" : "비밀번호 분실 시 임시 비밀번호 발급"} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border-strong disabled:opacity-50">
          <LockKeyholeIcon className="size-3" /> 비밀번호 초기화
        </button>
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

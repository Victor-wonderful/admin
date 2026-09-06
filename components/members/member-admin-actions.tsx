"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon, BanIcon, CircleCheckIcon, Loader2Icon, XIcon, CopyIcon, CheckIcon, CalendarPlusIcon } from "lucide-react";

import { resetMemberPassword, setMemberSuspended, extendMemberTrial } from "@/lib/actions/member-admin";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

// 회원 상세 상단 액션 — 비밀번호 재설정(임시 비밀번호 1회 표시) · 계정 정지/해제(사유 필수) · 체험 연장(슈퍼관리자, 앱 이용 기한 갱신).

const BTN = "inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium ring-1 ring-border-strong disabled:opacity-50";
const RO_TITLE = "현재 역할은 실행 권한이 없습니다(조회 전용)";

// 체험 연장 기본값: 현재 기한(미래면) 또는 오늘 + 7일. 렌더 밖(클릭 시)에서만 호출.
function defaultTrialDate(accessUntil: string | null): string {
  const now = Date.now();
  const base = accessUntil && new Date(accessUntil).getTime() > now ? new Date(accessUntil) : new Date(now);
  base.setDate(base.getDate() + 7);
  return base.toISOString().slice(0, 10);
}

function Modal({ title, sub, onClose, children }: { title: string; sub: string; onClose: () => void; children: React.ReactNode }) {
  useEscapeKey(true, onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={onClose} />
      <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
        <div className="flex items-start justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><XIcon className="size-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function MemberAdminActions({ memberId, label, suspended, suspendReason, readOnly = false, canExtendTrial = false, accessUntil = null }: { memberId: string; label: string; suspended: boolean; suspendReason: string | null; readOnly?: boolean; canExtendTrial?: boolean; accessUntil?: string | null }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [temp, setTemp] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [suspendOpen, setSuspendOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [trialOpen, setTrialOpen] = React.useState(false);
  const [trialDate, setTrialDate] = React.useState("");
  const doExtend = () =>
    start(async () => {
      setErr(null);
      const r = await extendMemberTrial(memberId, trialDate);
      if (!r.ok) return setErr(r.error ?? "실패");
      setTrialOpen(false);
      router.refresh();
    });

  const resetPw = () => {
    if (!window.confirm(`${label} 의 비밀번호를 초기화할까요?\n기존 비밀번호는 무효화되고 모든 기기에서 로그아웃됩니다. 포르투나 앱 로그인에도 같은 비밀번호가 적용됩니다.`)) return;
    start(async () => {
      setErr(null);
      const r = await resetMemberPassword(memberId);
      if (!r.ok) return setErr(r.error);
      setTemp(r.tempPassword);
      router.refresh();
    });
  };
  const copy = async () => {
    if (!temp) return;
    try { await navigator.clipboard.writeText(temp); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };
  const doSuspend = () =>
    start(async () => {
      setErr(null);
      const r = await setMemberSuspended(memberId, true, reason);
      if (!r.ok) return setErr(r.error ?? "실패");
      setSuspendOpen(false);
      setReason("");
      router.refresh();
    });
  const unsuspend = () => {
    if (!window.confirm(`${label} 의 계정 정지를 해제할까요? 다시 로그인할 수 있게 됩니다.`)) return;
    start(async () => {
      setErr(null);
      const r = await setMemberSuspended(memberId, false, "");
      if (!r.ok) return setErr(r.error ?? "실패");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button type="button" disabled={pending || readOnly} onClick={resetPw} title={readOnly ? RO_TITLE : "임시 비밀번호 발급 · 회원 세션 전부 종료"} className={cn(BTN, "text-text-secondary")}>
          {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <KeyRoundIcon className="size-3.5" />} 비밀번호 재설정
        </button>
        {canExtendTrial ? (
          <button type="button" disabled={pending || readOnly} onClick={() => { setTrialDate(defaultTrialDate(accessUntil)); setTrialOpen(true); }} title={readOnly ? RO_TITLE : "포르투나 앱 이용 기한 연장(슈퍼관리자)"} className={cn(BTN, "text-text-secondary")}>
            <CalendarPlusIcon className="size-3.5" /> 체험 연장
          </button>
        ) : null}
        {suspended ? (
          <button type="button" disabled={pending || readOnly} onClick={unsuspend} title={readOnly ? RO_TITLE : suspendReason ?? undefined} className={cn(BTN, "text-green-700")}>
            <CircleCheckIcon className="size-3.5" /> 정지 해제
          </button>
        ) : (
          <button type="button" disabled={pending || readOnly} onClick={() => setSuspendOpen(true)} title={readOnly ? RO_TITLE : "로그인 차단 · 세션 종료 · 포르투나 앱 차단"} className={cn(BTN, "text-negative")}>
            <BanIcon className="size-3.5" /> 계정 정지
          </button>
        )}
      </div>
      {err ? <span className="text-[11px] text-negative">{err}</span> : null}

      {temp ? (
        <Modal title="임시 비밀번호 발급" sub={`${label} · 이 창을 닫으면 다시 볼 수 없습니다`} onClose={() => setTemp(null)}>
          <div className="space-y-3 px-6 py-5">
            <button type="button" onClick={copy} className="flex w-full items-center gap-2 rounded-md bg-surface-muted px-3.5 py-3 text-left font-mono text-[15px] tracking-wider text-text-primary ring-1 ring-border-strong hover:ring-green-500">
              <span className="flex-1">{temp}</span>
              {copied ? <CheckIcon className="size-4 text-green-600" /> : <CopyIcon className="size-4 text-text-tertiary" />}
            </button>
            <p className="text-[12px] leading-relaxed text-text-secondary">회원에게 안전한 경로로 전달하세요. 기존 비밀번호는 즉시 무효화되고 모든 기기에서 로그아웃되었습니다. 포르투나 앱도 같은 비밀번호로 로그인합니다. 로그인 후 프로필에서 비밀번호를 바꾸도록 안내하세요.</p>
          </div>
          <div className="flex justify-end border-t px-6 py-4">
            <button type="button" onClick={() => setTemp(null)} className="rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white">닫기</button>
          </div>
        </Modal>
      ) : null}

      {trialOpen ? (
        <Modal title="체험 연장" sub={`${label} · 포르투나 앱 이용 기한을 지정한 날짜 끝(한국시간)까지로`} onClose={() => setTrialOpen(false)}>
          <div className="space-y-3 px-6 py-5">
            <p className="text-[12px] text-text-secondary">현재 이용 기한: <b className="text-text-primary">{accessUntil ? new Date(accessUntil).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "미정"}</b></p>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-secondary">연장 종료일</span>
              <input type="date" value={trialDate} onChange={(e) => setTrialDate(e.target.value)} className="w-full rounded-md bg-card px-3.5 py-2.5 text-sm text-text-primary ring-1 ring-border-strong outline-none focus:ring-2 focus:ring-green-500" />
            </label>
            <p className="text-[12px] leading-relaxed text-text-secondary">저장 즉시 포르투나 앱에 반영됩니다. 구독을 결제하면 구독 종료일과 비교해 더 늦은 날짜가 적용됩니다. 감사 로그에 남습니다.</p>
            {err ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div> : null}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <button type="button" onClick={() => setTrialOpen(false)} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">취소</button>
            <button type="button" disabled={pending || !trialDate} onClick={doExtend} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
              {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <CalendarPlusIcon className="size-3.5" />} 연장
            </button>
          </div>
        </Modal>
      ) : null}

      {suspendOpen ? (
        <Modal title="계정 정지" sub={`${label} · 로그인 차단 · 활성 세션 종료 · 포르투나 앱 계정 차단`} onClose={() => setSuspendOpen(false)}>
          <div className="space-y-3 px-6 py-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-text-secondary">정지 사유 (필수 · 감사 로그에 남습니다)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 약관 위반 · 다중 계정 · 결제 분쟁" autoFocus className="w-full rounded-md bg-card px-3.5 py-2.5 text-sm text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500" />
            </label>
            <p className="text-[12px] leading-relaxed text-text-secondary">정지 중에는 리워드 지급과 구독 갱신은 그대로 진행됩니다. 해제하면 즉시 다시 로그인할 수 있습니다.</p>
            {err ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div> : null}
          </div>
          <div className="flex justify-end gap-2 border-t px-6 py-4">
            <button type="button" onClick={() => setSuspendOpen(false)} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">취소</button>
            <button type="button" disabled={pending || !reason.trim()} onClick={doSuspend} className="inline-flex items-center gap-1.5 rounded-md bg-negative px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
              {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <BanIcon className="size-3.5" />} 정지
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

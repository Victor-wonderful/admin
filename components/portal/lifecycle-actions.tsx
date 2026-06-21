"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, XIcon, CheckCircle2Icon, PlusIcon } from "lucide-react";

import { chargeWallet, subscribeMember, upgradeToMarketer, subscribeAndUpgrade } from "@/lib/actions/memberLifecycle";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${n.toLocaleString()}`;

const DONE_MSG: Record<string, string> = {
  subscribe: "구독 완료 — 구독회원 전환",
  upgrade: "승급 완료 — 마케터 전환",
  subscribe_upgrade: "마케터 전환 완료 — 이동 중…",
};

// 구독/승급/한번에 실행 버튼 — 성공 시 새 등급 화면으로 자동 이동. 잔액 부족 등 예외는 인라인.
export function LifecycleButton({
  mode,
  memberId,
  amount,
  className,
  children,
}: {
  mode: "subscribe" | "upgrade" | "subscribe_upgrade";
  memberId: string;
  amount: number;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const run = () =>
    start(async () => {
      setErr(null);
      try {
        let dest: string;
        if (mode === "subscribe") dest = await subscribeMember(memberId, amount);
        else if (mode === "upgrade") dest = await upgradeToMarketer(memberId, amount);
        else dest = await subscribeAndUpgrade(memberId);
        setDone(true);
        router.push(dest); // 새 등급 화면으로 자동 전환
      } catch (e) {
        setErr(e instanceof Error ? e.message : "처리 실패");
      }
    });

  if (done)
    return (
      <div className={cn("inline-flex items-center justify-center gap-2 rounded-md bg-green-50 py-3 text-sm font-bold text-green-700", className)}>
        <CheckCircle2Icon className="size-4" /> {DONE_MSG[mode]}
      </div>
    );

  return (
    <div className={cn("flex flex-col gap-1.5", className?.includes("w-full") && "w-full")}>
      <button type="button" disabled={pending} onClick={run} className={cn(className, "disabled:opacity-60")}>
        {pending ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {children}
      </button>
      {err ? <span className="text-[11px] font-medium text-negative">{err}</span> : null}
    </div>
  );
}

// 충전 버튼 — 금액 입력 모달 → chargeWallet(데모 입금 반영).
export function ChargeButton({
  memberId,
  className,
  children,
}: {
  memberId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("150");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  const amt = Number(amount);
  const submit = () =>
    start(async () => {
      setErr(null);
      try {
        await chargeWallet(memberId, amt);
        setOpen(false);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "충전 실패");
      }
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">USDT 충전</h2>
                <p className="mt-0.5 text-xs text-text-secondary">데모: 입금 반영 (실서비스는 온체인 자동 감지)</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="space-y-3 px-6 py-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-secondary">충전 금액 (USDT)</span>
                <div className="flex gap-2">
                  {[120, 150, 320].map((v) => (
                    <button key={v} type="button" onClick={() => setAmount(String(v))} className={cn("flex-1 rounded-md py-2 text-[13px] font-semibold ring-1 transition-colors", amt === v ? "bg-green-50 text-green-700 ring-green-500" : "bg-card text-text-secondary ring-border-strong")}>
                      {usd(v)}
                    </button>
                  ))}
                </div>
                <input
                  value={amount}
                  inputMode="decimal"
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="w-full rounded-md bg-card px-3 py-2 text-sm font-bold text-text-primary ring-1 ring-border-strong outline-none focus:ring-2 focus:ring-green-500"
                />
              </label>
              {err ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div> : null}
            </div>
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">취소</button>
              <button type="button" disabled={pending || !(amt > 0)} onClick={submit} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
                {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <PlusIcon className="size-3.5" />} {usd(amt || 0)} 충전
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

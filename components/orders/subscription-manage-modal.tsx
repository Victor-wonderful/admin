"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings2Icon, XIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { setAutoRenew } from "@/lib/actions/subscriptionSettings";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

// 구독 관리 모달 — 현재 상태·이용 기간·다음 결제 + 자동 갱신 on/off(해지 예약).
export function SubscriptionManageModal({
  active,
  periodStart,
  periodEnd,
  price,
  autoRenew,
  className,
}: {
  active: boolean;
  periodStart: string | null;
  periodEnd: string | null;
  price: number;
  autoRenew: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [on, setOn] = React.useState(autoRenew);
  const [pending, start] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  const toggle = () =>
    start(async () => {
      const next = !on;
      const res = await setAutoRenew(next);
      if (!res.ok) {
        setMsg(res.error ?? "저장 실패");
        return;
      }
      setOn(next);
      setMsg(next ? "자동 갱신을 다시 켰습니다" : "해지 예약됨 — 종료일까지 이용 후 자동으로 만료됩니다");
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <Settings2Icon className="size-4" /> 구독 관리
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-[440px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">구독 관리</h2>
                <p className="mt-0.5 text-xs text-text-secondary">포르투나 구독 · {usd(price)} / 30일</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                {[
                  ["상태", active ? "이용 중" : "만료"],
                  ["이용 기간", periodStart && periodEnd ? `${periodStart} ~ ${periodEnd}` : "—"],
                  ["다음 결제", active ? (on ? `${periodEnd} · 잔액에서 ${usd(price)} 자동 결제` : `${periodEnd} 종료 후 갱신 안 함 (해지 예약)`) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b py-2 text-[13px] last:border-0">
                    <span className="text-text-secondary">{k}</span>
                    <span className="text-right font-semibold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg p-4 ring-1 ring-border">
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">자동 갱신</div>
                  <div className="text-[11px] text-text-tertiary">
                    {on ? "종료일에 잔액에서 자동 결제되어 30일 연장됩니다" : "꺼두면 종료일 이후 갱신되지 않고 만료됩니다. 언제든 다시 켤 수 있습니다"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggle}
                  disabled={pending}
                  aria-pressed={on}
                  className={cn("flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors disabled:opacity-60", on ? "bg-brand" : "bg-n-300")}
                >
                  {pending ? <Loader2Icon className="size-4 animate-spin text-white" /> : <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />}
                </button>
              </div>

              {msg ? (
                <div className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium", on ? "bg-green-50 text-green-700" : "bg-warning-soft text-warning")}>
                  <CheckIcon className="size-3.5" /> {msg}
                </div>
              ) : null}
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-brand px-5 py-2 text-[13px] font-semibold text-white">
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import * as React from "react";
import { PlusIcon, XIcon, HashIcon, CopyIcon, CheckIcon, QrCodeIcon, TriangleAlertIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// 충전(입금) 안내 모달 — 입금은 온체인 전송이므로 주소/네트워크 안내 + 복사.
// 실제 잔액 반영은 온체인 입금 감지 시 자동(별도 인프라). 여기서는 신뢰성 있는 안내만 제공.
export function DepositModal({
  address,
  network = "TRC20",
}: {
  address: string;
  network?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 미지원 무시 */
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-[10px] bg-white/15 px-6 py-3 text-[15px] font-bold text-white"
      >
        <PlusIcon className="size-[18px]" /> 충전
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">USDT 충전</h2>
                <p className="mt-0.5 text-xs text-text-secondary">아래 주소로 입금 · 온체인 확인 후 자동 반영</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* QR 자리(실제 QR 라이브러리 연동 전 플레이스홀더) */}
              <div className="mx-auto grid size-36 place-items-center rounded-xl bg-surface-muted ring-1 ring-border">
                <QrCodeIcon className="size-20 text-n-300" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">입금 주소</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    <span className="size-1.5 rounded-full bg-green-500" /> USDT · {network}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copy}
                  className="flex w-full items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 text-left ring-1 ring-border transition-colors hover:ring-green-500"
                >
                  <HashIcon className="size-3.5 shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate font-mono text-xs text-text-primary">{address}</span>
                  {copied ? <CheckIcon className="size-4 text-green-600" /> : <CopyIcon className="size-4 text-text-tertiary" />}
                </button>
                {copied ? <span className="text-[11px] font-medium text-green-700">주소가 복사되었습니다</span> : null}
              </div>

              <div className="flex gap-2 rounded-lg bg-warning-soft px-3.5 py-3">
                <TriangleAlertIcon className="size-4 shrink-0 text-warning" />
                <div className="space-y-1 text-[11px] leading-relaxed text-text-secondary">
                  <p><b className="text-text-primary">{network}</b> 네트워크의 <b className="text-text-primary">USDT</b>만 입금하세요. 다른 자산·네트워크로 보내면 복구되지 않습니다.</p>
                  <p>입금은 네트워크 컨펌 후 잔액에 자동 반영됩니다.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className={cn("rounded-md bg-brand px-5 py-2 text-[13px] font-semibold text-white")}>
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

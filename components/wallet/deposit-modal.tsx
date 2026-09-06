"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { XIcon, HashIcon, CopyIcon, CheckIcon, QrCodeIcon, TriangleAlertIcon, Loader2Icon, FlaskConicalIcon } from "lucide-react";

import { chargeWallet } from "@/lib/actions/memberLifecycle";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

export type DepositNetworkOption = { code: string; label: string; chain: string; address: string | null };

// USDT 입금 모달 — 네트워크(Tron/BSC) 선택 → 회사 입금 주소 안내 + 복사.
// 실제 잔액 반영은 온체인 입금 감지(서버)에서 처리한다. 개발 환경에서만 "테스트 입금 반영"이 추가로 보인다.
export function DepositModal({
  networks,
  memberId,
  demoEnabled = false,
  className,
  children,
}: {
  networks: DepositNetworkOption[];
  memberId: string;
  demoEnabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState(networks[0]?.code ?? "TRC20");
  const [copied, setCopied] = React.useState(false);
  const [demoAmount, setDemoAmount] = React.useState("150");
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);

  const net = networks.find((n) => n.code === code) ?? networks[0];
  const address = net?.address ?? null;
  // 입금 주소 QR — 지갑 앱 카메라로 찍어 주소를 옮겨 적는 실수를 막는다(초대 링크 QR 과 같은 방식)
  const qr = address ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(address)}` : null;
  const close = React.useCallback(() => setOpen(false), []);
  useEscapeKey(open, close);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 미지원 무시 */
    }
  };

  const amt = Number(demoAmount);
  const runDemo = () =>
    start(async () => {
      setErr(null);
      const res = await chargeWallet(memberId, amt);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children ?? "USDT 입금하기"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">USDT 입금</h2>
                <p className="mt-0.5 text-xs text-text-secondary">회사 입금 주소로 USDT 를 보내면 확인 후 내 지갑 잔액에 반영됩니다</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              {/* 네트워크 선택 */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-text-secondary">네트워크</span>
                <div className="flex gap-2">
                  {networks.map((n) => (
                    <button
                      key={n.code}
                      type="button"
                      onClick={() => setCode(n.code)}
                      className={cn(
                        "flex-1 rounded-md py-2 text-[13px] font-semibold ring-1 transition-colors",
                        n.code === code ? "bg-green-50 text-green-700 ring-green-500" : "bg-card text-text-secondary ring-border-strong",
                      )}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 입금 주소 QR — 주소가 준비된 네트워크에만 표시 */}
              {qr ? (
                <div className="mx-auto grid size-36 place-items-center rounded-xl bg-white ring-1 ring-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt={`${net?.label} 입금 주소 QR`} width={128} height={128} className="rounded-md" />
                </div>
              ) : (
                <div className="mx-auto flex size-36 flex-col items-center justify-center gap-1.5 rounded-xl bg-surface-muted text-center ring-1 ring-border">
                  <QrCodeIcon className="size-10 text-n-300" />
                  <span className="px-3 text-[11px] leading-snug text-text-tertiary">주소가 등록되면 QR 이 표시됩니다</span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-secondary">입금 주소</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    <span className="size-1.5 rounded-full bg-green-500" /> USDT · {net?.code}
                  </span>
                </div>
                {address ? (
                  <button
                    type="button"
                    onClick={copy}
                    className="flex w-full items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 text-left ring-1 ring-border transition-colors hover:ring-green-500"
                  >
                    <HashIcon className="size-3.5 shrink-0 text-text-tertiary" />
                    <span className="flex-1 truncate font-mono text-xs text-text-primary">{address}</span>
                    {copied ? <CheckIcon className="size-4 text-green-600" /> : <CopyIcon className="size-4 text-text-tertiary" />}
                  </button>
                ) : (
                  <div className="rounded-md bg-surface-muted px-3 py-2.5 text-xs font-medium text-text-tertiary ring-1 ring-border">
                    {net?.label} 입금 주소 준비 중입니다. 잠시 후 다시 확인해 주세요.
                  </div>
                )}
                {copied ? <span className="text-[11px] font-medium text-green-700">주소가 복사되었습니다</span> : null}
              </div>

              <div className="flex gap-2 rounded-lg bg-warning-soft px-3.5 py-3">
                <TriangleAlertIcon className="size-4 shrink-0 text-warning" />
                <div className="space-y-1 text-[11px] leading-relaxed text-text-secondary">
                  <p>
                    <b className="text-text-primary">{net?.chain}</b> 네트워크의 <b className="text-text-primary">USDT</b>만 보내세요. 다른 자산·네트워크로 보내면 복구되지 않습니다.
                  </p>
                  <p>입금은 네트워크 확인 후 내 지갑 잔액에 반영됩니다.</p>
                </div>
              </div>

              {demoEnabled ? (
                <div className="space-y-2 rounded-lg bg-crypto-soft px-3.5 py-3 ring-1 ring-crypto/20">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-crypto">
                    <FlaskConicalIcon className="size-3.5" /> 테스트 입금 반영 (개발 환경 전용 · 실제 송금 없음)
                  </div>
                  <div className="flex gap-2">
                    {[120, 150, 320].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setDemoAmount(String(v))}
                        className={cn("flex-1 rounded-md py-1.5 text-[12px] font-semibold ring-1", amt === v ? "bg-card text-crypto ring-crypto" : "bg-card text-text-secondary ring-border-strong")}
                      >
                        ${v}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={pending || !(amt > 0)}
                      onClick={runDemo}
                      className="inline-flex items-center gap-1 rounded-md bg-crypto px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : null} 반영
                    </button>
                  </div>
                  {err ? <div className="text-[11px] font-medium text-negative">{err}</div> : null}
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

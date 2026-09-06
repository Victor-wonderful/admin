"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleArrowUpIcon, XIcon, ChevronDownIcon, Loader2Icon, CheckCircle2Icon } from "lucide-react";

import { requestWithdrawal } from "@/lib/actions/withdrawals";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-md bg-card px-3 py-2 text-sm text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";
const labelCls = "text-xs font-medium text-text-secondary";

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
// 회사 지갑이 받는 체인과 동일(Tron TRC20 / BSC BEP20)
const NETWORKS = ["TRC20", "BEP20"];

// 출금 신청 모달(전 등급 공용) — 잔액 한도(금액+수수료) 검증 후 requestWithdrawal 로 홀드 신청.
export function WithdrawalRequestModal({
  memberId,
  balance,
  defaultAddress,
  defaultNetwork = "TRC20",
  fee = 1,
}: {
  memberId: string;
  balance: number;
  defaultAddress: string;
  defaultNetwork?: string;
  fee?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [address, setAddress] = React.useState(defaultAddress);
  const [network, setNetwork] = React.useState(defaultNetwork);
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [pending, start] = React.useTransition();

  const amt = Number(amount);
  const need = amt > 0 ? amt + fee : 0;
  const maxAmount = Math.max(0, balance - fee);
  const invalid = !(amt > 0) || !address.trim() || need > balance;

  const close = React.useCallback(() => {
    setOpen(false);
    setAmount("");
    setAddress(defaultAddress);
    setNetwork(defaultNetwork);
    setErr(null);
    setDone(false);
  }, [defaultAddress, defaultNetwork]);
  useEscapeKey(open, close);

  const submit = () =>
    start(async () => {
      setErr(null);
      try {
        await requestWithdrawal(memberId, amt, address.trim(), network, fee);
        setDone(true);
        router.refresh(); // 잔액(홀드 반영) 갱신
      } catch (e) {
        setErr(e instanceof Error ? e.message : "출금 신청에 실패했습니다");
      }
    });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-6 text-sm font-bold whitespace-nowrap text-green-700 sm:h-auto sm:py-3 sm:text-[15px]"
      >
        <CircleArrowUpIcon className="size-[18px]" /> 출금 신청
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={close} />
          <div className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">출금 신청</h2>
                <p className="mt-0.5 text-xs text-text-secondary">USDT 온체인 출금 · 운영자 승인 후 송금</p>
              </div>
              <button type="button" onClick={close} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <CheckCircle2Icon className="size-12 text-green-600" />
                <div className="text-[15px] font-bold text-text-primary">출금 신청이 접수되었습니다</div>
                <p className="text-xs text-text-secondary">
                  {usd(amt)} (수수료 {usd(fee)} 포함 {usd(need)} 홀드) · 운영자 승인 대기 중
                </p>
                <button type="button" onClick={close} className="mt-2 rounded-md bg-brand px-5 py-2 text-[13px] font-semibold text-white">
                  확인
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-4 px-6 py-5">
                  <div className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-3 ring-1 ring-border">
                    <span className="text-xs font-medium text-text-secondary">사용 가능 잔액</span>
                    <span className="text-[15px] font-bold tabular-nums text-text-primary">{usd(balance)}</span>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>출금 금액 (USDT)</span>
                    <div className="relative">
                      <input
                        className={cn(inputCls, "pr-16")}
                        placeholder="0"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      />
                      <button
                        type="button"
                        onClick={() => setAmount(String(maxAmount))}
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700"
                      >
                        MAX
                      </button>
                    </div>
                    <span className="text-[11px] text-text-tertiary">
                      수수료 {usd(fee)} · 최대 출금 {usd(maxAmount)}
                      {amt > 0 ? ` · 총 차감 ${usd(need)}` : ""}
                    </span>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>출금 주소</span>
                    <input
                      className={cn(inputCls, "font-mono text-xs")}
                      placeholder="0x… / T…"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className={labelCls}>네트워크</span>
                    <div className="relative">
                      <select
                        className={cn(inputCls, "appearance-none pr-9")}
                        value={network}
                        onChange={(e) => setNetwork(e.target.value)}
                      >
                        {NETWORKS.map((n) => (
                          <option key={n}>{n}</option>
                        ))}
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-tertiary" />
                    </div>
                  </label>

                  {need > balance && amt > 0 ? (
                    <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">
                      잔액 부족 — 총 차감 {usd(need)}이 잔액 {usd(balance)}을 초과합니다.
                    </div>
                  ) : null}
                  {err ? (
                    <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2 border-t px-6 py-4">
                  <button type="button" onClick={close} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={invalid || pending}
                    onClick={submit}
                    className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <CircleArrowUpIcon className="size-3.5" />}
                    출금 신청
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

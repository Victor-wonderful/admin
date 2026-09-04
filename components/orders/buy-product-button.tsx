"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, ShoppingBagIcon, CheckCircle2Icon } from "lucide-react";

import { purchaseProduct } from "@/lib/actions/purchase";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

// 상품 구매 버튼 — 확인 단계(금액 재확인) → 잔액 결제 → 완료 표시.
export function BuyProductButton({ productId, name, price, className }: { productId: string; name: string; price: number; className?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const run = () =>
    start(async () => {
      setErr(null);
      const res = await purchaseProduct(productId);
      if (!res.ok) {
        setErr(res.error);
        setConfirming(false);
        return;
      }
      setDone(true);
      setConfirming(false);
      router.refresh();
    });

  if (done)
    return (
      <div className={cn("inline-flex items-center justify-center gap-1.5 rounded-md bg-green-50 py-2.5 text-[13px] font-bold text-green-700", className)}>
        <CheckCircle2Icon className="size-4" /> 구매 완료
      </div>
    );

  return (
    <div className="flex flex-col gap-1.5">
      {confirming ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setConfirming(false)} className="flex-1 rounded-md bg-card py-2.5 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
            취소
          </button>
          <button type="button" disabled={pending} onClick={run} className={cn("flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-[13px] font-bold text-white disabled:opacity-60")}>
            {pending ? <Loader2Icon className="size-4 animate-spin" /> : <ShoppingBagIcon className="size-4" />} {usd(price)} 결제 확정
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={cn("inline-flex items-center justify-center gap-1.5 rounded-md bg-brand py-2.5 text-[13px] font-bold text-white", className)}>
          <ShoppingBagIcon className="size-4" /> {name} 구매 · {usd(price)}
        </button>
      )}
      {confirming ? <span className="text-center text-[11px] text-text-tertiary">내 지갑 잔액에서 {usd(price)} 가 차감됩니다</span> : null}
      {err ? <span className="text-[11px] font-medium text-negative">{err}</span> : null}
    </div>
  );
}

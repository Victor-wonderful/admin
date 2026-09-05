"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, Loader2Icon } from "lucide-react";

import { deleteProduct } from "@/lib/actions/products";
import { cn } from "@/lib/utils";

// 상품 카드의 삭제 버튼 — 구매 이력이 없을 때만 삭제 가능. 이력이 있으면 눌러도 안내만.
export function DeleteProductButton({ id, name, purchaseCount, readOnly = false }: { id: string; name: string; purchaseCount: number; readOnly?: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const blocked = purchaseCount > 0;

  const run = () => {
    setErr(null);
    if (blocked) return setErr(`구매 이력 ${purchaseCount}건이 있어 삭제할 수 없습니다. 판매 중지로 숨기세요.`);
    if (!window.confirm(`'${name}' 상품을 삭제할까요?\n되돌릴 수 없습니다. 회원 화면에서 즉시 사라집니다.`)) return;
    start(async () => {
      const r = await deleteProduct(id);
      if (!r.ok) return setErr(r.error ?? "삭제 실패");
      router.refresh();
    });
  };

  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || readOnly}
        onClick={run}
        title={readOnly ? "현재 역할은 실행 권한이 없습니다(조회 전용)" : blocked ? `구매 이력 ${purchaseCount}건 · 삭제 대신 판매 중지` : "구매 이력 없음 · 삭제 가능"}
        className={cn("inline-flex items-center gap-1 text-xs font-medium disabled:opacity-50", blocked ? "text-text-tertiary hover:text-text-secondary" : "text-text-tertiary hover:text-negative")}
      >
        {pending ? <Loader2Icon className="size-3 animate-spin" /> : <Trash2Icon className="size-3" />} 삭제
      </button>
      {err ? <span className="max-w-[220px] text-right text-[10px] leading-snug text-negative">{err}</span> : null}
    </span>
  );
}

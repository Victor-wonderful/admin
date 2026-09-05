"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { setProductActive } from "@/lib/actions/products";
import { cn } from "@/lib/utils";

// 상품 카드의 판매 활성 토글 — 즉시 저장.
export function ActiveToggle({ id, active, readOnly = false }: { id: string; active: boolean; readOnly?: boolean }) {
  const router = useRouter();
  const [on, setOn] = React.useState(active);
  const [pending, start] = React.useTransition();

  const flip = () =>
    start(async () => {
      const next = !on;
      setOn(next);
      const res = await setProductActive(id, next);
      if (!res.ok) setOn(!next);
      else router.refresh();
    });

  return (
    <button
      type="button"
      onClick={flip}
      disabled={pending || readOnly}
      aria-pressed={on}
      title={readOnly ? "현재 역할은 실행 권한이 없습니다(조회 전용)" : on ? "판매 중 · 누르면 판매 중지" : "판매 중지 · 누르면 판매 시작"}
      className={cn("flex h-6 w-10 items-center rounded-full px-0.5 transition-colors disabled:opacity-60", on ? "bg-brand" : "bg-n-300")}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-4")} />
    </button>
  );
}

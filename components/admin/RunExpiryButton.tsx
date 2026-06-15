"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runMonthlyExpiry } from "@/lib/actions/runExpiry";

// 데모용 "월 만료 실행" — 일부 구독을 만료시키고 활성 플래그 재계산.
export function RunExpiryButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await runMonthlyExpiry();
            setMsg(`${r.expired}건 만료 처리 → 활성 카운트 갱신됨`);
          })
        }
      >
        {pending ? "처리 중…" : "월 만료 실행 (데모)"}
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

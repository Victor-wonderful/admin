"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { placeUnderMajorLeg } from "@/lib/actions/spillover";

// 대상 회원을 지정 마케터의 대실적 라인 최하단으로 스필오버 배치.
export function SpilloverButton({
  marketerId,
  targetMemberId,
}: {
  marketerId: string;
  targetMemberId: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await placeUnderMajorLeg(marketerId, targetMemberId);
              setMsg(`이동 완료 → 부모 ${r.movedTo.slice(0, 8)}…`);
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "오류");
            }
          })
        }
      >
        {pending ? "이동 중…" : "대실적 라인 최하단으로 배치"}
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}

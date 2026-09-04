"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, CheckCircle2Icon } from "lucide-react";

import { subscribeMember, upgradeToMarketer, subscribeAndUpgrade, renewSubscription } from "@/lib/actions/memberLifecycle";
import { cn } from "@/lib/utils";

const DONE_MSG: Record<string, string> = {
  subscribe: "구독 완료 — 구독회원 전환",
  renew: "구독 갱신 완료 — 30일 연장",
  upgrade: "파트너 멤버십 시작 — 파트너 포털로 이동 중…",
  subscribe_upgrade: "파트너 멤버십 시작 — 이동 중…",
};

// 구독/등급 상승/한번에 실행 버튼 — 성공 시 새 등급 화면으로 자동 이동. 잔액 부족 등 예외는 인라인.
export function LifecycleButton({
  mode,
  memberId,
  amount,
  className,
  children,
}: {
  mode: "subscribe" | "renew" | "upgrade" | "subscribe_upgrade";
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
      const res =
        mode === "subscribe"
          ? await subscribeMember(memberId, amount)
          : mode === "renew"
            ? await renewSubscription(memberId, amount)
            : mode === "upgrade"
              ? await upgradeToMarketer(memberId, amount)
              : await subscribeAndUpgrade(memberId);
      if (!res.ok) {
        setErr(res.error); // 잔액 부족 등 — DB 함수의 한글 메시지 그대로 표시
        return;
      }
      setDone(true);
      router.push(res.dest); // 새 등급 화면으로 자동 전환
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

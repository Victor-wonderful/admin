import * as React from "react";

import { cn } from "@/lib/utils";

export type KpiTone =
  | "green"
  | "info"
  | "warning"
  | "negative"
  | "crypto"
  | "neutral";

const badgeTone: Record<KpiTone, string> = {
  green: "bg-green-50 text-green-700",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  negative: "bg-negative-soft text-negative",
  crypto: "bg-crypto-soft text-crypto",
  neutral: "bg-n-100 text-n-500",
};

export function KpiCard({
  icon: Icon,
  tone = "green",
  label,
  value,
  sub,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg bg-card p-3 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)] lg:gap-3 lg:p-4",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-[12px] lg:size-10",
          badgeTone[tone],
        )}
      >
        <Icon className="size-[17px] lg:size-[19px]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-text-secondary lg:text-xs">{label}</div>
        <div className="text-lg font-bold text-text-primary tabular-nums lg:text-xl">
          {value}
        </div>
        {sub ? (
          <div className="mt-0.5 text-[11px] text-text-tertiary">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

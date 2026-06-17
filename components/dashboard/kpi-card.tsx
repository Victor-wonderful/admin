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
        "flex items-center gap-3 rounded-lg bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]",
        className,
      )}
    >
      <div
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-[12px]",
          badgeTone[tone],
        )}
      >
        <Icon className="size-[19px]" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="text-xl font-bold text-text-primary tabular-nums">
          {value}
        </div>
        {sub ? (
          <div className="mt-0.5 text-[11px] text-text-tertiary">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}

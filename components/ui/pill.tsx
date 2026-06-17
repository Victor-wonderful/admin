import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const pillVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      tone: {
        green: "bg-green-50 text-green-700",
        info: "bg-info-soft text-info",
        warning: "bg-warning-soft text-warning",
        negative: "bg-negative-soft text-negative",
        crypto: "bg-crypto-soft text-crypto",
        neutral: "bg-n-100 text-n-600",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const dotTone: Record<string, string> = {
  green: "bg-green-600",
  info: "bg-info",
  warning: "bg-warning",
  negative: "bg-negative",
  crypto: "bg-crypto",
  neutral: "bg-n-400",
};

export function Pill({
  tone = "neutral",
  dot,
  className,
  children,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof pillVariants> & { dot?: boolean }) {
  return (
    <span className={cn(pillVariants({ tone }), className)} {...props}>
      {dot ? (
        <span className={cn("size-2 rounded-full", dotTone[tone ?? "neutral"])} />
      ) : null}
      {children}
    </span>
  );
}

export { pillVariants };

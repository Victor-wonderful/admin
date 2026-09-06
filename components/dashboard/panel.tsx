import * as React from "react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  sub,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)] lg:p-5",
        className,
      )}
    >
      {title || action ? (
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:mb-4">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-base font-semibold text-text-primary">
                {title}
              </h3>
            ) : null}
            {sub ? (
              <p className="mt-0.5 text-xs text-text-secondary">{sub}</p>
            ) : null}
          </div>
          {action ? <div className="max-w-full shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

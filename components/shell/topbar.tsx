import * as React from "react";
import { BellIcon, UserRoundIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Topbar({
  title,
  sub,
  uid,
  actions,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  uid?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 border-b bg-card px-7 py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
        {sub ? <p className="text-[13px] text-text-secondary">{sub}</p> : null}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button
          type="button"
          aria-label="알림"
          className="grid size-[38px] place-items-center rounded-[10px] bg-card text-text-secondary ring-1 ring-border transition-colors hover:bg-n-50"
        >
          <BellIcon className="size-[17px]" />
        </button>
        {uid ? (
          <div className="flex items-center gap-2.5 rounded-[10px] bg-card py-1.5 pr-2.5 pl-1.5 ring-1 ring-border">
            <span className="grid size-7 place-items-center rounded-lg bg-n-100 text-n-500">
              <UserRoundIcon className="size-[15px]" />
            </span>
            <span className="text-[13px] font-semibold text-text-primary">
              {uid}
            </span>
          </div>
        ) : null}
      </div>
    </header>
  );
}

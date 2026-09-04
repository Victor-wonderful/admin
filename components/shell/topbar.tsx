import * as React from "react";
import { UserRoundIcon } from "lucide-react";

import { NotificationBell } from "@/components/shell/notification-bell";
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
        <NotificationBell />
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

import * as React from "react";
import { UserRoundIcon } from "lucide-react";

import { NotificationBell } from "@/components/shell/notification-bell";
import { AccountMenu } from "@/components/shell/account-menu";
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
        "flex items-center justify-between gap-3 border-b bg-card px-4 py-3 lg:gap-4 lg:px-7 lg:py-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-[17px] font-semibold text-text-primary lg:text-xl">{title}</h1>
        {/* 부제는 좁은 화면에서 두 줄로 밀려 헤더를 키우므로 sm 이상에서만 노출 */}
        {sub ? <p className="hidden truncate text-[13px] text-text-secondary sm:block">{sub}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2 lg:gap-3">
        {actions}
        <NotificationBell />
        {/* 모바일: 계정 메뉴(프로필·구독·로그아웃) — 사이드바가 숨겨져 로그아웃 진입점이 없어지는 것을 대신한다 */}
        {uid ? <AccountMenu uid={uid} /> : null}
        {/* 데스크톱: 기존 UID 배지 */}
        {uid ? (
          <div className="hidden items-center gap-2.5 rounded-[10px] bg-card py-1.5 pr-2.5 pl-1.5 ring-1 ring-border lg:flex">
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

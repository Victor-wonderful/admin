"use client";

import * as React from "react";
import { MenuIcon } from "lucide-react";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { FortunaMark } from "@/components/brand/fortuna-logo";
import type { AdminRole } from "@/lib/admin-session";

// 어드민 모바일·태블릿(<lg) 상단 바 — 좌측 햄버거로 사이드바를 드로어로 연다.
// 회원 포털과 달리 메뉴가 20개 가까이라 하단 탭바가 아니라 드로어가 맞다.
export function AdminMobileHeader(props: {
  name?: string;
  role?: AdminRole;
  roleLabel?: string;
  mfa?: boolean;
  mfaOff?: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  // 드로어 안의 메뉴 링크를 누르면 이동과 함께 닫는다(하위 메뉴 펼침 버튼은 <a> 가 아니라 유지된다).
  const closeIfNavigating = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  };

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b bg-sidebar px-3 lg:hidden">
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-[10px] text-n-600 transition-colors hover:bg-n-100"
      >
        <MenuIcon className="size-5" />
      </button>
      <span className="grid size-[26px] place-items-center rounded-lg bg-brand text-white">
        <FortunaMark className="size-[15px]" />
      </span>
      <span className="text-[14px] font-semibold text-text-primary">포르투나</span>
      <span className="text-[11px] text-text-tertiary">운영 콘솔</span>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] p-0 sm:max-w-[280px]" showCloseButton={false}>
          <SheetTitle className="sr-only">운영 콘솔 메뉴</SheetTitle>
          <div className="contents" onClick={closeIfNavigating}>
            <AdminSidebar {...props} className="flex h-full w-full overflow-y-auto border-r-0" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

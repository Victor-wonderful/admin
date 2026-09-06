import * as React from "react";

import { MemberSidebar, type MemberRole } from "@/components/shell/member-sidebar";
import { MemberTabBar } from "@/components/shell/member-tabbar";

// 회원(등록·구독·파트너) 공통 셸.
// - lg 이상: 좌측 사이드바
// - lg 미만: 하단 탭바(고정) — main 하단에 탭바 높이 + safe-area 만큼 여백을 준다.
export function MemberShell({
  role,
  uid,
  gradeSub,
  children,
}: {
  role: MemberRole;
  uid: string;
  gradeSub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <MemberSidebar role={role} uid={uid} gradeSub={gradeSub} />
      <main className="flex min-w-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
      <MemberTabBar role={role} />
    </div>
  );
}

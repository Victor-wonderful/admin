import * as React from "react";

import { MemberSidebar, type MemberRole } from "@/components/shell/member-sidebar";

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
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

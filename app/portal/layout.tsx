import { redirect } from "next/navigation";

import { MemberShell } from "@/components/shell/member-shell";
import { getShellProps } from "@/lib/portal-shell";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

// 등록회원·구독회원 포털 공통 레이아웃. 마케터는 마케터 포털로 보낸다.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  if (member.role === "marketer") redirect("/marketer/dashboard");
  const shell = await getShellProps(member);

  return <MemberShell {...shell}>{children}</MemberShell>;
}

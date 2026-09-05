import { redirect } from "next/navigation";

import { MemberShell } from "@/components/shell/member-shell";
import { getShellProps } from "@/lib/portal-shell";
import { requireMember } from "@/lib/session";
import { renewOnVisit } from "@/lib/renewal";
import { getMember } from "@/lib/queries/members";

export const dynamic = "force-dynamic";

// 등록회원·구독회원 포털 공통 레이아웃. 파트너는 파트너 포털로 보낸다.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const member = await requireMember();
  if (member.role === "marketer") redirect("/marketer/dashboard");
  // 방문 시 본인 구독 자동 갱신/만료 처리(크론 전이라도 화면이 최신 상태)
  const fresh = (await renewOnVisit(member)) ? await getMember(member.id) : null;
  const shell = await getShellProps(fresh ?? member);

  return <MemberShell {...shell}>{children}</MemberShell>;
}

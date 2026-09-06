import { MemberShell } from "@/components/shell/member-shell";
import { getShellProps } from "@/lib/portal-shell";
import { requireMember } from "@/lib/session";
import { renewOnVisit } from "@/lib/renewal";

export const dynamic = "force-dynamic";

export default async function MarketerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await requireMember("marketer"); // 파트너 외 등급은 각자 포털로 리다이렉트
  await renewOnVisit(member); // 방문 시 본인 구독 자동 갱신/만료 처리
  const shell = await getShellProps(member);

  return <MemberShell {...shell}>{children}</MemberShell>;
}

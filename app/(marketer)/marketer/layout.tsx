import { MemberSidebar } from "@/components/shell/member-sidebar";
import { requireMember } from "@/lib/session";
import { getMemberRank } from "@/lib/queries/ranks";
import { toUid } from "@/lib/uid";

export const dynamic = "force-dynamic";

export default async function MarketerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = await requireMember("marketer"); // 마케터 외 등급은 각자 포털로 리다이렉트
  const rank = await getMemberRank(id);
  const grade =
    rank && rank.rank > 0
      ? `${rank.rank}직급 · 활성 산하 ${rank.total_active.toLocaleString()}명`
      : "무직급 · 활성 산하 집계";

  return (
    <div className="flex min-h-screen bg-canvas">
      <MemberSidebar role="marketer" uid={toUid(id)} gradeSub={grade} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

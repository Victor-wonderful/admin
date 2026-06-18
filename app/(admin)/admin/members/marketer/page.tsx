import { Topbar } from "@/components/shell/topbar";
import { MembersExplorer } from "@/components/members/members-explorer";
import { getMembersView } from "../members-data";

export const dynamic = "force-dynamic";

export default async function AdminMarketerMembersPage() {
  const { rows, counts } = await getMembersView("marketer");

  return (
    <>
      <Topbar title="마케터" sub="연회비 $200/년 · 수당 자격" uid="운영자" />
      <MembersExplorer rows={rows} counts={counts} lockedRole="marketer" />
    </>
  );
}

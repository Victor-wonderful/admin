import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { MembersExplorer } from "@/components/members/members-explorer";
import { getMembersView } from "../members-data";

export const dynamic = "force-dynamic";

export default async function AdminMarketerMembersPage() {
  const admin = await requireAdminPage("members");
  const { rows, counts } = await getMembersView("marketer");

  return (
    <>
      <Topbar title="파트너" sub="연회비 $200/년 · 수당 자격" uid={admin.display_name} />
      <MembersExplorer rows={rows} counts={counts} lockedRole="marketer" />
    </>
  );
}

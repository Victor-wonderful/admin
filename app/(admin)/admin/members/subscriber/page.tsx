import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { MembersExplorer } from "@/components/members/members-explorer";
import { getMembersView } from "../members-data";

export const dynamic = "force-dynamic";

export default async function AdminSubscriberMembersPage() {
  const admin = await requireAdminPage("members");
  const { rows, counts } = await getMembersView("subscriber");

  return (
    <>
      <Topbar title="구독회원" sub="구독 $120/월 또는 상품 결제 · 예비 마케터" uid={admin.display_name} />
      <MembersExplorer rows={rows} counts={counts} lockedRole="subscriber" />
    </>
  );
}

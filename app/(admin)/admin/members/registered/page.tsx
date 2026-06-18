import { Topbar } from "@/components/shell/topbar";
import { MembersExplorer } from "@/components/members/members-explorer";
import { getMembersView } from "../members-data";

export const dynamic = "force-dynamic";

export default async function AdminRegisteredMembersPage() {
  const { rows, counts } = await getMembersView("registered");

  return (
    <>
      <Topbar title="등록회원" sub="추천 코드로 가입 · 미결제" uid="운영자" />
      <MembersExplorer rows={rows} counts={counts} lockedRole="registered" />
    </>
  );
}

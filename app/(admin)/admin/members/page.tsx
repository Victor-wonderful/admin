import { Topbar } from "@/components/shell/topbar";
import { MembersExplorer } from "@/components/members/members-explorer";
import { getMembersView } from "./members-data";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const { rows, counts } = await getMembersView();

  return (
    <>
      <Topbar title="회원 관리" sub="등록 · 구독 · 마케터 전체 회원" uid="운영자" />
      <MembersExplorer rows={rows} counts={counts} />
    </>
  );
}

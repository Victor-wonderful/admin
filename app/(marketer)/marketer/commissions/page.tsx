import { MarketerCommissionsView } from "@/components/marketer/commissions-view";
import { getMarketerViewerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketerCommissionsPage() {
  const viewerId = await getMarketerViewerId(); // 로그인 + 파트너 가드
  return <MarketerCommissionsView viewerId={viewerId} />;
}

import { MarketerDashboardView } from "@/components/marketer/dashboard-view";
import { getMarketerViewerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketerDashboardPage() {
  const viewerId = await getMarketerViewerId(); // 로그인 + 파트너 가드
  return <MarketerDashboardView viewerId={viewerId} />;
}

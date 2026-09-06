import { SubscriberHome } from "@/components/portal/subscriber-home";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SubscriberDashboardPage() {
  const me = await requireMember("subscriber"); // 로그인 + 역할 가드
  return <SubscriberHome member={me} />;
}

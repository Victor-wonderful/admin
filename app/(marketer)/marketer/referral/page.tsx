import { MarketerReferralView } from "@/components/marketer/referral-view";
import { getMarketerViewerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketerReferralPage() {
  const viewerId = await getMarketerViewerId(); // 로그인 + 파트너 가드
  return <MarketerReferralView viewerId={viewerId} />;
}

import { ProfileView } from "@/components/profile/profile-view";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketerProfilePage() {
  const me = await requireMember("marketer");
  return <ProfileView member={me} />;
}

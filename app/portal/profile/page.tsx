import { ProfileView } from "@/components/profile/profile-view";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const me = await requireMember();
  return <ProfileView member={me} />;
}

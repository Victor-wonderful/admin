import { RegisteredHome } from "@/components/portal/registered-home";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RegisteredDashboardPage() {
  const me = await requireMember("registered"); // 로그인 + 역할 가드
  return <RegisteredHome member={me} />;
}

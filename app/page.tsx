import { redirect } from "next/navigation";
import { getCurrentMember, roleHome } from "@/lib/session";

export const dynamic = "force-dynamic";

// 루트: 로그인 회원은 역할별 홈으로, 아니면 로그인 페이지로.
export default async function Home() {
  const member = await getCurrentMember();
  if (member) redirect(roleHome(member.role));
  redirect("/login");
}

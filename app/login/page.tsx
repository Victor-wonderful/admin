import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentMember, roleHome } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // 이미 로그인했으면 역할 홈으로
  const member = await getCurrentMember();
  if (member) redirect(roleHome(member.role));

  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

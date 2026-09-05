import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/reset-forms";
import { getCurrentMember, roleHome } from "@/lib/session";

export const dynamic = "force-dynamic";

// 회원 비밀번호 찾기 — ID(이메일)로 30분짜리 1회용 재설정 링크.
export default async function ForgotPasswordPage() {
  const member = await getCurrentMember();
  if (member) redirect(roleHome(member.role));
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

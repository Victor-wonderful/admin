import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm, ResetLinkInvalid } from "@/components/auth/reset-forms";
import { checkMemberPasswordReset } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

// 메일 링크로 들어오는 새 비밀번호 설정 화면.
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const target = await checkMemberPasswordReset(token);
  return (
    <AuthLayout>
      {target ? <ResetPasswordForm token={token} email={target.email} /> : <ResetLinkInvalid />}
    </AuthLayout>
  );
}

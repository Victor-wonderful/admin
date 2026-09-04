import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentMember, roleHome } from "@/lib/session";

export const dynamic = "force-dynamic";

// 세션 종료 사유별 안내 문구 (/login?reason=...)
const REASON_NOTICE: Record<string, string> = {
  other_device: "다른 기기에서 로그인되어 이 기기의 접속이 종료되었습니다. 한 계정은 한 기기에서만 사용할 수 있습니다.",
  expired: "로그인 유지 기간이 지났습니다. 다시 로그인해 주세요.",
  admin: "관리자에 의해 접속이 종료되었습니다. 다시 로그인해 주세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  // 이미 로그인했으면 역할 홈으로
  const member = await getCurrentMember();
  if (member) redirect(roleHome(member.role));

  const { reason } = await searchParams;
  const notice = reason ? REASON_NOTICE[reason] : undefined;

  return (
    <AuthLayout>
      <LoginForm notice={notice} />
    </AuthLayout>
  );
}

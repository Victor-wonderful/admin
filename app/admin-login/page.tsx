import { redirect } from "next/navigation";

import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { AdminLoginForm } from "@/components/admin/admin-auth-forms";
import { getCurrentAdmin, isMfaRequired } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

// 관리자 로그인 1단계. 이미 2FA 까지 통과한 세션이면 대시보드로. ?reset=1 은 비밀번호 재설정 직후 안내.
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const cur = await getCurrentAdmin();
  const mfa = isMfaRequired();
  if (cur && (cur.mfaOk || !mfa)) redirect("/admin/dashboard");
  const { reset } = await searchParams;
  return (
    <AdminAuthShell title="관리자 로그인" sub={mfa ? "이메일 · 비밀번호 · 인증 앱 코드 (2단계)" : "이메일 · 비밀번호 (개발 모드 · 2단계 인증 꺼짐)"}>
      <AdminLoginForm notice={reset === "1" ? "비밀번호를 변경했습니다. 새 비밀번호로 로그인하세요." : undefined} />
    </AdminAuthShell>
  );
}

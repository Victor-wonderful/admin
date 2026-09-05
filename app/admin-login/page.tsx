import { redirect } from "next/navigation";

import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { AdminLoginForm } from "@/components/admin/admin-auth-forms";
import { getCurrentAdmin } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

// 관리자 로그인 1단계. 이미 2FA 까지 통과한 세션이면 대시보드로.
export default async function AdminLoginPage() {
  const cur = await getCurrentAdmin();
  if (cur?.mfaOk) redirect("/admin/dashboard");
  return (
    <AdminAuthShell title="관리자 로그인" sub="이메일 · 비밀번호 · 인증 앱 코드 (2단계)">
      <AdminLoginForm />
    </AdminAuthShell>
  );
}

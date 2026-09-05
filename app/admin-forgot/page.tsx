import { redirect } from "next/navigation";

import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { AdminForgotForm } from "@/components/admin/admin-auth-forms";
import { getCurrentAdmin, isMfaRequired } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

// 관리자 비밀번호 찾기 — 이메일로 30분짜리 1회용 재설정 링크를 보낸다.
export default async function AdminForgotPage() {
  const cur = await getCurrentAdmin();
  if (cur && (cur.mfaOk || !isMfaRequired())) redirect("/admin/dashboard");
  return (
    <AdminAuthShell title="비밀번호 찾기" sub="등록된 관리자 이메일로 재설정 링크를 보내드립니다">
      <AdminForgotForm />
    </AdminAuthShell>
  );
}

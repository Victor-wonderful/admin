import { redirect } from "next/navigation";

import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { AdminTotpForm } from "@/components/admin/admin-auth-forms";
import { getCurrentAdmin } from "@/lib/admin-session";
import { ensureTotpSecret } from "@/lib/actions/admin-auth";
import { otpauthUrl } from "@/lib/totp";

export const dynamic = "force-dynamic";

// 관리자 로그인 2단계 — TOTP. 미등록 관리자는 여기서 QR 로 등록 후 첫 코드로 확정.
export default async function AdminTwoFactorPage() {
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  // 2FA 강제 중이면 통과한 세션은 대시보드로. 개발 모드(꺼짐)에서는 자발적 등록·재등록용으로 열어 둔다.
  if (cur.mfaOk && cur.admin.totp_enabled) redirect("/admin/dashboard");
  const secret = await ensureTotpSecret(cur.admin.id, cur.admin.totp_secret);
  return (
    <AdminAuthShell
      title={cur.admin.totp_enabled ? "2단계 인증" : "2단계 인증 등록"}
      sub={cur.admin.totp_enabled ? `${cur.admin.email} · 인증 앱의 6자리 코드를 입력하세요` : `${cur.admin.email} · 처음 로그인이라 인증 앱을 등록합니다`}
    >
      <AdminTotpForm enrolled={cur.admin.totp_enabled} secret={secret} otpauth={otpauthUrl(secret, cur.admin.email)} account={cur.admin.email} />
    </AdminAuthShell>
  );
}

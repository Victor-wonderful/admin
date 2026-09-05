import { AdminSidebar } from "@/components/shell/admin-sidebar";
import { requireAdmin, ADMIN_ROLE_LABEL, isMfaRequired } from "@/lib/admin-session";

// DB(서비스롤) 기반 → 정적 프리렌더 대신 요청 시 동적 렌더.
export const dynamic = "force-dynamic";

// /admin/* 전체 가드 — 관리자 로그인 + 2단계 인증을 통과해야 렌더된다(아니면 /admin-login, /admin-2fa 로).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar name={admin.display_name} roleLabel={ADMIN_ROLE_LABEL[admin.role]} mfa={admin.totp_enabled} mfaOff={!isMfaRequired()} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

import "server-only";
import { redirect } from "next/navigation";

import { getCurrentAdmin, requireAdmin, ADMIN_ROLE_LABEL, type AdminRow } from "@/lib/admin-session";
import { audit } from "@/lib/audit";
import { can, canView, CAPABILITY_LABEL, PAGE_LABEL, type AdminPage, type Capability } from "@/lib/admin-permissions";

// 역할 기반 가드. 화면은 requireAdminPage, 서버 액션은 checkCapability / assertCapability.
// 거부는 모두 감사 로그(permission_denied)에 남긴다.

export class PermissionError extends Error {
  constructor(message: string) { super(message); this.name = "PermissionError"; }
}

// 페이지 진입 가드 — 로그인·2FA 통과(requireAdmin) 후 역할이 그 화면을 볼 수 있는지 확인. 아니면 대시보드로.
export async function requireAdminPage(page: AdminPage): Promise<AdminRow> {
  const admin = await requireAdmin();
  if (!canView(admin.role, page)) {
    await audit({ category: "permission", action: "permission_denied", target: `${PAGE_LABEL[page]} 화면 접근 · ${ADMIN_ROLE_LABEL[admin.role]} 권한 없음`, ok: false, actor: { id: admin.id, name: admin.display_name, email: admin.email } });
    redirect(`/admin/dashboard?denied=${page}`);
  }
  return admin;
}

// 서버 액션 가드(반환형) — { ok:false, error } 를 그대로 UI 에 돌려줄 수 있다.
export async function checkCapability(cap: Capability, what: string): Promise<{ ok: true; admin: AdminRow } | { ok: false; error: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || !cur.mfaOk) {
    await audit({ category: "permission", action: "permission_denied", target: `${what} 시도 · 관리자 로그인 없음`, ok: false, risk: true, actor: null });
    return { ok: false, error: "관리자 로그인이 필요합니다" };
  }
  if (!can(cur.admin.role, cap)) {
    await audit({ category: "permission", action: "permission_denied", target: `${what} 시도 · ${ADMIN_ROLE_LABEL[cur.admin.role]}에게 ${CAPABILITY_LABEL[cap]} 권한 없음`, ok: false, risk: true, actor: { id: cur.admin.id, name: cur.admin.display_name, email: cur.admin.email } });
    return { ok: false, error: `이 작업은 ${CAPABILITY_LABEL[cap]} 권한이 필요합니다 (현재 역할: ${ADMIN_ROLE_LABEL[cur.admin.role]})` };
  }
  return { ok: true, admin: cur.admin };
}

// 서버 액션 가드(예외형) — throw 스타일 액션용.
export async function assertCapability(cap: Capability, what: string): Promise<AdminRow> {
  const g = await checkCapability(cap, what);
  if (!g.ok) throw new PermissionError(g.error);
  return g.admin;
}

import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerClient } from "@/lib/supabase/server";

// 관리자 세션 — 회원 세션(ft_session)과 별개 쿠키. 토큰 sha256 으로 admin_sessions 조회.
export const ADMIN_COOKIE = "ft_admin";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12; // 12시간

// 2단계 인증 강제 여부. 개발 중에는 .env.development.local 에 ADMIN_MFA=off 로 끈다(Victor 결정 2026-09-05: 개발 완료 후 켬).
// 운영 빌드에서는 값이 없으면 항상 강제.
export function isMfaRequired(): boolean {
  return process.env.ADMIN_MFA !== "off";
}

export type AdminRole = "super" | "settlement" | "ops" | "viewer";
export interface AdminRow {
  id: string;
  email: string;
  display_name: string;
  role: AdminRole;
  is_active: boolean;
  totp_enabled: boolean;
  totp_secret?: string | null;
  last_login_at: string | null;
  created_at: string;
}
export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = { super: "슈퍼관리자", settlement: "정산 관리자", ops: "운영 매니저", viewer: "조회 전용" };

export function hashAdminToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function lookup(): Promise<{ adminId: string | null; mfaOk: boolean; token: string | null }> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value ?? null;
  if (!token) return { adminId: null, mfaOk: false, token: null };
  const sb = getServerClient();
  const { data, error } = await sb.rpc("touch_admin_session", { p_token_hash: hashAdminToken(token) });
  if (error) return { adminId: null, mfaOk: false, token };
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { adminId: null, mfaOk: false, token };
  return { adminId: row.admin_id as string, mfaOk: Boolean(row.mfa_ok), token };
}

export async function getAdminById(id: string): Promise<AdminRow | null> {
  const sb = getServerClient();
  const { data } = await sb.from("admins").select("id, email, display_name, role, is_active, totp_enabled, totp_secret, last_login_at, created_at").eq("id", id).maybeSingle();
  return (data as AdminRow | null) ?? null;
}

// 현재 관리자 + 2FA 통과 여부(없으면 null)
export async function getCurrentAdmin(): Promise<{ admin: AdminRow; mfaOk: boolean; token: string } | null> {
  const { adminId, mfaOk, token } = await lookup();
  if (!adminId || !token) return null;
  const admin = await getAdminById(adminId);
  if (!admin || !admin.is_active) return null;
  return { admin, mfaOk, token };
}

// /admin/* 가드: 미로그인 → /admin-login, 2FA 미통과(또는 미등록) → /admin-2fa (ADMIN_MFA=off 면 2FA 생략)
export async function requireAdmin(): Promise<AdminRow> {
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  if (isMfaRequired() && !cur.mfaOk) redirect("/admin-2fa");
  return cur.admin;
}

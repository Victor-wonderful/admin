"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, hashAdminToken, getCurrentAdmin } from "@/lib/admin-session";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";

export type AdminAuthState = { error?: string; ok?: boolean; values?: { email?: string } } | undefined;

const LOGIN_ERRORS: Record<string, string> = {
  INVALID: "이메일 또는 비밀번호가 올바르지 않습니다",
  LOCKED: "5회 이상 실패해 15분간 잠겼습니다. 잠시 후 다시 시도하세요",
  DISABLED: "비활성화된 관리자 계정입니다",
};

// 1단계: 이메일 + 비밀번호 → 세션(mfa_ok=false) → /admin-2fa
export async function adminLogin(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "이메일과 비밀번호를 입력하세요", values: { email } };

  const sb = getServerClient();
  const { data, error } = await sb.rpc("admin_login", { p_email: email, p_password: password });
  if (error) {
    const code = Object.keys(LOGIN_ERRORS).find((k) => error.message.includes(k));
    return { error: code ? LOGIN_ERRORS[code] : "로그인 처리 중 오류가 발생했습니다", values: { email } };
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { error: LOGIN_ERRORS.INVALID, values: { email } };

  const token = randomBytes(32).toString("hex");
  const h = await headers();
  const { error: sErr } = await sb.rpc("open_admin_session", {
    p_admin: row.id,
    p_token_hash: hashAdminToken(token),
    p_user_agent: h.get("user-agent") ?? "",
    p_ip: (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim(),
  });
  if (sErr) return { error: "세션 생성 실패", values: { email } };
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: ADMIN_SESSION_MAX_AGE });
  redirect("/admin-2fa");
}

// 2단계: TOTP 확인(등록된 경우) 또는 등록 확정(미등록: 화면에 보여준 비밀키로 첫 코드 검증) → mfa_ok
export async function adminVerifyTotp(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const code = String(formData.get("code") ?? "").trim();
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  const secret = cur.admin.totp_secret;
  if (!secret) return { error: "인증 키가 없습니다. 페이지를 새로고침하세요" };
  if (!verifyTotp(secret, code)) return { error: "인증 코드가 맞지 않습니다. 앱의 새 코드를 입력하세요" };

  const sb = getServerClient();
  if (!cur.admin.totp_enabled) {
    await sb.from("admins").update({ totp_enabled: true }).eq("id", cur.admin.id);
  }
  await sb.rpc("mark_admin_session_mfa", { p_token_hash: hashAdminToken(cur.token) });
  redirect("/admin/dashboard");
}

// 2FA 미등록 관리자에게 비밀키 발급(없을 때만). 페이지 렌더에서 호출.
export async function ensureTotpSecret(adminId: string, existing: string | null | undefined): Promise<string> {
  if (existing) return existing;
  const secret = generateTotpSecret();
  const sb = getServerClient();
  await sb.from("admins").update({ totp_secret: secret }).eq("id", adminId);
  return secret;
}

export async function adminLogout() {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (token) {
    const sb = getServerClient();
    await sb.rpc("close_admin_session", { p_token_hash: hashAdminToken(token) });
  }
  store.delete(ADMIN_COOKIE);
  redirect("/admin-login");
}

// 관리자 추가(슈퍼관리자만)
const CREATE_ERRORS: Record<string, string> = { EMAIL_INVALID: "이메일 형식이 아닙니다", PASSWORD_TOO_SHORT: "임시 비밀번호는 8자 이상", EMAIL_TAKEN: "이미 등록된 이메일입니다" };
export async function createAdmin(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const cur = await getCurrentAdmin();
  if (!cur || !cur.mfaOk || cur.admin.role !== "super") return { error: "슈퍼관리자만 관리자를 추가할 수 있습니다" };
  const email = String(formData.get("email") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "viewer");
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "이름을 입력하세요" };
  const sb = getServerClient();
  const { error } = await sb.rpc("create_admin", { p_email: email, p_name: name, p_password: password, p_role: role, p_by: cur.admin.id });
  if (error) {
    const code = Object.keys(CREATE_ERRORS).find((k) => error.message.includes(k));
    return { error: code ? CREATE_ERRORS[code] : error.message };
  }
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function setAdminActive(adminId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || !cur.mfaOk || cur.admin.role !== "super") return { ok: false, error: "슈퍼관리자만 변경할 수 있습니다" };
  if (cur.admin.id === adminId && !active) return { ok: false, error: "본인 계정은 비활성화할 수 없습니다" };
  const sb = getServerClient();
  const { error } = await sb.from("admins").update({ is_active: active }).eq("id", adminId);
  if (error) return { ok: false, error: error.message };
  if (!active) await sb.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: "admin" }).eq("admin_id", adminId).is("revoked_at", null);
  revalidatePath("/admin/admins");
  return { ok: true };
}

// 2FA 재설정(슈퍼관리자가 다른 관리자의 인증 앱 분실 시): 키 삭제 → 다음 로그인에서 재등록
export async function resetAdminTotp(adminId: string): Promise<{ ok: boolean; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || !cur.mfaOk || cur.admin.role !== "super") return { ok: false, error: "슈퍼관리자만 변경할 수 있습니다" };
  const sb = getServerClient();
  const { error } = await sb.from("admins").update({ totp_secret: null, totp_enabled: false }).eq("id", adminId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/admins");
  return { ok: true };
}

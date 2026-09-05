"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, ADMIN_ROLE_LABEL, hashAdminToken, getCurrentAdmin, isMfaRequired, type AdminRole } from "@/lib/admin-session";
import { audit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/passwords";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";
import { sendEmail } from "@/lib/notify";

export type AdminAuthState = { error?: string; ok?: boolean; values?: { email?: string }; devLink?: string } | undefined;

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
    // 알려진 코드가 아니면 운영 진단용으로 원인을 서버 로그에 남긴다(비밀번호는 기록하지 않음).
    if (!code) console.error("[admin-login] rpc admin_login 실패:", error.message, error.code ?? "", error.details ?? "");
    await audit({ category: "auth", action: code === "LOCKED" ? "login_locked" : "login_failed", target: `${email} · ${code === "LOCKED" ? "5회 오류 · 15분 잠금" : code === "DISABLED" ? "비활성 계정" : "이메일 또는 비밀번호 불일치"}`, ok: false, risk: code === "LOCKED", actor: { email } });
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
  // 개발 모드(ADMIN_MFA=off): 2단계 없이 바로 입장. 등록된 관리자라도 코드를 묻지 않는다.
  if (!isMfaRequired()) {
    await sb.rpc("mark_admin_session_mfa", { p_token_hash: hashAdminToken(token) });
    await audit({ category: "auth", action: "login", target: "관리자 콘솔 로그인 · 개발 모드(2단계 인증 꺼짐)", actor: { id: row.id, email } });
    redirect("/admin/dashboard");
  }
  await audit({ category: "auth", action: "login", target: "1단계(비밀번호) 통과 · 2단계 인증 대기", actor: { id: row.id, email } });
  redirect("/admin-2fa");
}

// 2단계: TOTP 확인(등록된 경우) 또는 등록 확정(미등록: 화면에 보여준 비밀키로 첫 코드 검증) → mfa_ok
export async function adminVerifyTotp(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const code = String(formData.get("code") ?? "").trim();
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  const secret = cur.admin.totp_secret;
  if (!secret) return { error: "인증 키가 없습니다. 페이지를 새로고침하세요" };
  if (!verifyTotp(secret, code)) {
    await audit({ category: "auth", action: "mfa_failed", target: "인증 앱 코드 불일치", ok: false });
    return { error: "인증 코드가 맞지 않습니다. 앱의 새 코드를 입력하세요" };
  }

  const sb = getServerClient();
  if (!cur.admin.totp_enabled) {
    await sb.from("admins").update({ totp_enabled: true }).eq("id", cur.admin.id);
  }
  await sb.rpc("mark_admin_session_mfa", { p_token_hash: hashAdminToken(cur.token) });
  await audit({ category: "auth", action: "mfa_verified", target: cur.admin.totp_enabled ? "관리자 콘솔 로그인 · 2단계 인증 통과" : "인증 앱 최초 등록 · 2단계 인증 통과" });
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
  await audit({ category: "auth", action: "logout", target: "관리자 콘솔 로그아웃" });
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
  if (!cur || (isMfaRequired() && !cur.mfaOk) || cur.admin.role !== "super") {
    await audit({ category: "permission", action: "permission_denied", target: "관리자 추가 시도(권한 없음)", ok: false, risk: true });
    return { error: "슈퍼관리자만 관리자를 추가할 수 있습니다" };
  }
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
  await audit({ category: "permission", action: "admin_create", target: `${email.toLowerCase()} · ${name} · ${ADMIN_ROLE_LABEL[role as AdminRole] ?? role}`, risk: true });
  revalidatePath("/admin/admins");
  return { ok: true };
}

export async function setAdminActive(adminId: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || (isMfaRequired() && !cur.mfaOk) || cur.admin.role !== "super") return { ok: false, error: "슈퍼관리자만 변경할 수 있습니다" };
  if (cur.admin.id === adminId && !active) return { ok: false, error: "본인 계정은 비활성화할 수 없습니다" };
  const sb = getServerClient();
  const { error } = await sb.from("admins").update({ is_active: active }).eq("id", adminId);
  if (error) return { ok: false, error: error.message };
  if (!active) await sb.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: "admin" }).eq("admin_id", adminId).is("revoked_at", null);
  await audit({ category: "permission", action: active ? "admin_activate" : "admin_deactivate", target: `${await adminLabel(adminId)} ${active ? "활성화" : "비활성화 · 세션 전부 종료"}`, targetId: adminId, risk: !active });
  revalidatePath("/admin/admins");
  return { ok: true };
}

// 2FA 재설정(슈퍼관리자가 다른 관리자의 인증 앱 분실 시): 키 삭제 → 다음 로그인에서 재등록
export async function resetAdminTotp(adminId: string): Promise<{ ok: boolean; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || (isMfaRequired() && !cur.mfaOk) || cur.admin.role !== "super") return { ok: false, error: "슈퍼관리자만 변경할 수 있습니다" };
  const sb = getServerClient();
  const { error } = await sb.from("admins").update({ totp_secret: null, totp_enabled: false }).eq("id", adminId);
  if (error) return { ok: false, error: error.message };
  await audit({ category: "permission", action: "admin_totp_reset", target: `${await adminLabel(adminId)} 인증 앱 재설정(다음 로그인에서 재등록)`, targetId: adminId, risk: true });
  revalidatePath("/admin/admins");
  return { ok: true };
}

// 감사 로그 대상 표기용 — "이름 (이메일)".
async function adminLabel(adminId: string): Promise<string> {
  const sb = getServerClient();
  const { data } = await sb.from("admins").select("display_name, email").eq("id", adminId).maybeSingle();
  const a = data as { display_name: string; email: string } | null;
  return a ? `${a.display_name} (${a.email})` : adminId;
}

// 내 비밀번호 변경 — 현재 비밀번호 확인(DB 함수) 후 변경. 다른 기기의 세션은 모두 끊는다(현재 세션 유지).
const PW_ERRORS: Record<string, string> = { CURRENT_PASSWORD_WRONG: "현재 비밀번호가 맞지 않습니다", PASSWORD_TOO_SHORT: "새 비밀번호는 8자 이상이어야 합니다" };
export async function changeAdminPassword(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current || !next) return { error: "현재 비밀번호와 새 비밀번호를 입력하세요" };
  if (next !== confirm) return { error: "새 비밀번호 확인이 일치하지 않습니다" };
  if (next === current) return { error: "현재 비밀번호와 다른 비밀번호를 입력하세요" };
  const sb = getServerClient();
  const { error } = await sb.rpc("change_admin_password", { p_admin: cur.admin.id, p_current: current, p_new: next });
  if (error) {
    const code = Object.keys(PW_ERRORS).find((k) => error.message.includes(k));
    return { error: code ? PW_ERRORS[code] : "변경 처리 중 오류가 발생했습니다" };
  }
  await sb.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: "password_changed" })
    .eq("admin_id", cur.admin.id).is("revoked_at", null).neq("token_hash", hashAdminToken(cur.token));
  await audit({ category: "auth", action: "password_change", target: "내 비밀번호 변경 · 다른 기기 세션 종료" });
  revalidatePath("/admin/account");
  return { ok: true };
}

// 내 2FA 재등록 시작 — 현재 비밀번호 확인 후 키를 지우고 /admin-2fa 로(새 QR).
export async function restartMyTotp(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  const current = String(formData.get("current") ?? "");
  if (!current) return { error: "현재 비밀번호를 입력하세요" };
  const sb = getServerClient();
  // 비밀번호 검증은 로그인 함수로(잠금 규칙 동일 적용)
  const { error: lErr } = await sb.rpc("admin_login", { p_email: cur.admin.email, p_password: current });
  if (lErr) return { error: "현재 비밀번호가 맞지 않습니다" };
  await sb.from("admins").update({ totp_secret: null, totp_enabled: false }).eq("id", cur.admin.id);
  await sb.from("admin_sessions").update({ mfa_ok: false }).eq("token_hash", hashAdminToken(cur.token));
  await audit({ category: "auth", action: "totp_reenroll", target: "내 인증 앱 재등록 시작" });
  redirect("/admin-2fa");
}

// ── 비밀번호 복구 ────────────────────────────────────────────────────────────

// 재설정 링크의 기준 URL. ADMIN_BASE_URL 이 있으면 우선, 없으면 요청 헤더로 계산.
async function getBaseUrl(): Promise<string> {
  const env = process.env.ADMIN_BASE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

// (1) 슈퍼관리자가 다른 관리자의 비밀번호를 초기화 — 임시 비밀번호를 한 번만 화면에 보여준다.
const RESET_ERRORS: Record<string, string> = {
  NOT_SUPER: "슈퍼관리자만 초기화할 수 있습니다",
  SELF_RESET: "본인 비밀번호는 내 계정에서 변경하세요",
  NOT_FOUND: "관리자를 찾을 수 없습니다",
};
export async function resetAdminPassword(adminId: string): Promise<{ ok: boolean; tempPassword?: string; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || (isMfaRequired() && !cur.mfaOk) || cur.admin.role !== "super") {
    await audit({ category: "permission", action: "permission_denied", target: "관리자 비밀번호 초기화 시도(권한 없음)", targetId: adminId, ok: false, risk: true });
    return { ok: false, error: RESET_ERRORS.NOT_SUPER };
  }
  if (cur.admin.id === adminId) return { ok: false, error: RESET_ERRORS.SELF_RESET };
  const temp = generateTempPassword();
  const sb = getServerClient();
  const { error } = await sb.rpc("reset_admin_password", { p_admin: adminId, p_new: temp, p_by: cur.admin.id });
  if (error) {
    const code = Object.keys(RESET_ERRORS).find((k) => error.message.includes(k));
    return { ok: false, error: code ? RESET_ERRORS[code] : "초기화 처리 중 오류가 발생했습니다" };
  }
  await audit({ category: "permission", action: "admin_password_reset", target: `${await adminLabel(adminId)} 임시 비밀번호 발급 · 세션 전부 종료`, targetId: adminId, risk: true });
  revalidatePath("/admin/admins");
  return { ok: true, tempPassword: temp };
}

// (2-a) 이메일로 재설정 링크 요청. 계정 존재 여부와 무관하게 같은 안내를 돌려준다.
//  메일 제공자 미설정(개발)이면 링크를 서버 로그에 남기고, 비운영 빌드에서는 화면에도 보여준다.
export async function requestAdminPasswordReset(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "이메일을 입력하세요", values: { email } };

  const token = randomBytes(32).toString("hex");
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
  const sb = getServerClient();
  const { data, error } = await sb.rpc("request_admin_password_reset", { p_email: email, p_token_hash: hashAdminToken(token), p_ip: ip });
  if (error) {
    if (error.message.includes("RATE_LIMITED")) return { error: "요청이 너무 잦습니다. 1시간 뒤 다시 시도하세요", values: { email } };
    return { error: "요청 처리 중 오류가 발생했습니다", values: { email } };
  }
  const row = Array.isArray(data) ? data[0] : null;
  await audit({ category: "auth", action: "password_reset_request", target: row ? `${email} · 재설정 링크 발급(30분)` : `${email} · 미등록 이메일(발송 없음)`, actor: row ? { id: row.admin_id, email } : { email } });
  if (!row) return { ok: true, values: { email } }; // 미등록 이메일 — 노출 방지

  const link = `${await getBaseUrl()}/admin-reset?token=${token}`;
  const result = await sendEmail(
    row.email,
    "[포르투나 운영 콘솔] 관리자 비밀번호 재설정",
    `${row.display_name}님,\n\n아래 링크에서 새 비밀번호를 설정하세요. 링크는 30분 동안 한 번만 사용할 수 있습니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 바뀌지 않습니다.\n\n— 포르투나 운영 콘솔`,
  );
  if (result !== "sent") console.info(`[admin-reset] 재설정 링크(${result}): ${link}`);
  const devLink = result === "skipped" && process.env.NODE_ENV !== "production" ? link : undefined;
  return { ok: true, values: { email }, devLink };
}

// (2-b) 링크 토큰으로 새 비밀번호 설정 → 로그인 화면으로.
const COMPLETE_ERRORS: Record<string, string> = {
  TOKEN_INVALID: "재설정 링크가 올바르지 않습니다. 다시 요청하세요",
  TOKEN_USED: "이미 사용된 링크입니다. 다시 요청하세요",
  TOKEN_EXPIRED: "링크가 만료되었습니다(30분). 다시 요청하세요",
  PASSWORD_TOO_SHORT: "새 비밀번호는 8자 이상이어야 합니다",
};
export async function completeAdminPasswordReset(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: COMPLETE_ERRORS.TOKEN_INVALID };
  if (!next) return { error: "새 비밀번호를 입력하세요" };
  if (next.length < 8) return { error: COMPLETE_ERRORS.PASSWORD_TOO_SHORT };
  if (next !== confirm) return { error: "새 비밀번호 확인이 일치하지 않습니다" };
  const sb = getServerClient();
  const { data, error } = await sb.rpc("complete_admin_password_reset", { p_token_hash: hashAdminToken(token), p_new: next });
  if (error) {
    const code = Object.keys(COMPLETE_ERRORS).find((k) => error.message.includes(k));
    await audit({ category: "auth", action: "password_reset_failed", target: `재설정 링크 사용 실패 · ${code ?? "오류"}`, ok: false, actor: null });
    return { error: code ? COMPLETE_ERRORS[code] : "재설정 처리 중 오류가 발생했습니다" };
  }
  const done = Array.isArray(data) ? data[0] : null;
  await audit({ category: "auth", action: "password_reset_complete", target: "이메일 링크로 비밀번호 재설정 · 세션 전부 종료", actor: done ? { id: done.admin_id, email: done.email } : null });
  // 이 브라우저에 남은 관리자 쿠키가 있어도 세션은 이미 끊겼으니 지운다.
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin-login?reset=1");
}

// 재설정 페이지 렌더용 — 토큰이 살아 있으면 대상 이메일.
export async function checkAdminPasswordReset(token: string): Promise<{ email: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const sb = getServerClient();
  const { data } = await sb.rpc("check_admin_password_reset", { p_token_hash: hashAdminToken(token) });
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { email: row.email as string } : null;
}

// 역할 변경(슈퍼관리자만 · 본인 제외). 즉시 사이드바·페이지 가드에 반영(세션은 유지).
export async function setAdminRole(adminId: string, role: AdminRole): Promise<{ ok: boolean; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur || (isMfaRequired() && !cur.mfaOk) || cur.admin.role !== "super") {
    await audit({ category: "permission", action: "permission_denied", target: "관리자 역할 변경 시도(권한 없음)", targetId: adminId, ok: false, risk: true });
    return { ok: false, error: "슈퍼관리자만 역할을 바꿀 수 있습니다" };
  }
  if (cur.admin.id === adminId) return { ok: false, error: "본인 역할은 바꿀 수 없습니다(다른 슈퍼관리자에게 요청)" };
  if (!(role in ADMIN_ROLE_LABEL)) return { ok: false, error: "알 수 없는 역할입니다" };
  const sb = getServerClient();
  const { data: before } = await sb.from("admins").select("role").eq("id", adminId).maybeSingle();
  const prev = (before as { role: AdminRole } | null)?.role;
  if (prev === role) return { ok: true };
  const { error } = await sb.from("admins").update({ role }).eq("id", adminId);
  if (error) return { ok: false, error: error.message };
  await audit({ category: "permission", action: "admin_role_change", target: `${await adminLabel(adminId)} 역할 변경: ${prev ? ADMIN_ROLE_LABEL[prev] : "?"} → ${ADMIN_ROLE_LABEL[role]}`, targetId: adminId, risk: true });
  revalidatePath("/admin/admins");
  return { ok: true };
}

// 내 다른 기기 세션 종료(현재 세션 제외 · 본인 세션만).
export async function revokeAdminSession(sessionId: string): Promise<{ ok: boolean; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur) return { ok: false, error: "로그인이 필요합니다" };
  const sb = getServerClient();
  const { data: s } = await sb.from("admin_sessions").select("id, admin_id, token_hash, user_agent").eq("id", sessionId).maybeSingle();
  const row = s as { id: string; admin_id: string; token_hash: string; user_agent: string | null } | null;
  if (!row || row.admin_id !== cur.admin.id) return { ok: false, error: "내 세션이 아닙니다" };
  if (row.token_hash === hashAdminToken(cur.token)) return { ok: false, error: "현재 기기는 로그아웃 버튼을 사용하세요" };
  const { error } = await sb.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: "admin" }).eq("id", sessionId).is("revoked_at", null);
  if (error) return { ok: false, error: error.message };
  await audit({ category: "auth", action: "session_revoke", target: "내 다른 기기 세션 종료", targetId: sessionId });
  revalidatePath("/admin/account");
  return { ok: true };
}

// 내 표시 이름 변경(2~30자). 감사 로그·사이드바·Topbar 에 즉시 반영.
export async function updateMyName(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const cur = await getCurrentAdmin();
  if (!cur) redirect("/admin-login");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 30) return { error: "이름은 2~30자로 입력하세요" };
  if (name === cur.admin.display_name) return { error: "현재 이름과 같습니다" };
  const sb = getServerClient();
  const { error } = await sb.from("admins").update({ display_name: name }).eq("id", cur.admin.id);
  if (error) return { error: "변경 처리 중 오류가 발생했습니다" };
  await audit({ category: "auth", action: "profile_name_change", target: `내 이름 변경: ${cur.admin.display_name} → ${name}`, actor: { id: cur.admin.id, name, email: cur.admin.email } });
  revalidatePath("/admin/account");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// 내 다른 기기 세션 전부 종료(현재 세션 유지).
export async function revokeOtherAdminSessions(): Promise<{ ok: boolean; count?: number; error?: string }> {
  const cur = await getCurrentAdmin();
  if (!cur) return { ok: false, error: "로그인이 필요합니다" };
  const sb = getServerClient();
  const { data, error } = await sb.from("admin_sessions").update({ revoked_at: new Date().toISOString(), revoke_reason: "admin" })
    .eq("admin_id", cur.admin.id).is("revoked_at", null).neq("token_hash", hashAdminToken(cur.token)).select("id");
  if (error) return { ok: false, error: error.message };
  const n = (data ?? []).length;
  if (n > 0) await audit({ category: "auth", action: "session_revoke_all", target: `내 다른 기기 세션 ${n}개 종료` });
  revalidatePath("/admin/account");
  return { ok: true, count: n };
}

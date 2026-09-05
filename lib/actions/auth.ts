"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, hashSessionToken, roleHome } from "@/lib/session";
import { syncFortunaAccount } from "@/lib/fortuna-auth";
import { sendEmail } from "@/lib/notify";
import type { MemberRole } from "@/lib/supabase/types";

export type AuthState = { error?: string; values?: Record<string, string> } | undefined;

// 세션 열기: 무작위 토큰 발급 → DB 에 해시 저장(같은 회원의 다른 세션은 모두 폐기 = 1기기 제한) → 쿠키에 토큰.
async function openSession(memberId: string) {
  const token = randomBytes(32).toString("hex");
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();

  const sb = getServerClient();
  const { error } = await sb.rpc("open_member_session", {
    p_member: memberId,
    p_token_hash: hashSessionToken(token),
    p_user_agent: ua,
    p_ip: ip,
  });
  if (error) throw new Error("세션 생성 실패: " + error.message);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, { path: "/", httpOnly: true, sameSite: "lax", maxAge: SESSION_MAX_AGE });
}

// ID(이메일) + 비밀번호 로그인(검증은 DB 함수 member_login 에서 bcrypt 비교). 실패 시 에러 문자열 반환.
export async function loginByEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email) return { error: "ID(이메일)를 입력하세요", values: { email } };
  if (!password) return { error: "비밀번호를 입력하세요", values: { email } };

  const sb = getServerClient();
  const { data, error } = await sb.rpc("member_login", { p_email: email, p_password: password });
  if (error) {
    if (error.message.includes("SUSPENDED")) return { error: "정지된 계정입니다. 고객센터에 문의하세요", values: { email } };
    console.error("[login] rpc member_login 실패:", error.message, error.code ?? "", error.details ?? "");
    return { error: "로그인 처리 중 오류가 발생했습니다", values: { email } };
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { error: "ID 또는 비밀번호가 올바르지 않습니다", values: { email } };

  // Fortuna 앱 계정 동기화(기존 회원 backfill): 방금 검증된 비밀번호로 같은 계정을 보장.
  const { data: m } = await sb.from("members").select("display_name").eq("id", row.id).maybeSingle();
  await syncFortunaAccount({ memberId: row.id, email, password, displayName: m?.display_name ?? email.split("@")[0] });

  await openSession(row.id);
  redirect(roleHome(row.role as MemberRole));
}

// DB 함수가 던지는 코드 → 사용자 메시지
const SIGNUP_ERRORS: Record<string, string> = {
  NAME_REQUIRED: "닉네임을 입력하세요",
  EMAIL_INVALID: "ID는 이메일 형식으로 입력하세요",
  PASSWORD_TOO_SHORT: "비밀번호는 8자 이상이어야 합니다",
  REF_CODE_INVALID: "유효하지 않은 추천 코드입니다",
  EMAIL_TAKEN: "이미 가입된 ID입니다",
};

// 회원가입: 닉네임 + ID(이메일) + 비밀번호 + 추천 코드 → 등록회원 생성 → Fortuna 계정 동기화 → 자동 로그인.
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = {
    nickname: String(formData.get("nickname") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    ref: String(formData.get("ref") ?? "").trim().toUpperCase(),
  };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!values.nickname) return { error: SIGNUP_ERRORS.NAME_REQUIRED, values };
  if (!values.email) return { error: "ID(이메일)를 입력하세요", values };
  if (password.length < 8) return { error: SIGNUP_ERRORS.PASSWORD_TOO_SHORT, values };
  if (password !== confirm) return { error: "비밀번호 확인이 일치하지 않습니다", values };
  if (!values.ref) return { error: "추천 코드를 입력하세요", values };

  const sb = getServerClient();
  const { data, error } = await sb.rpc("register_member", {
    p_name: values.nickname,
    p_email: values.email,
    p_password: password,
    p_ref_code: values.ref,
  });
  if (error) {
    const code = Object.keys(SIGNUP_ERRORS).find((k) => error.message.includes(k));
    return { error: code ? SIGNUP_ERRORS[code] : "가입 처리 중 오류가 발생했습니다", values };
  }

  const memberId = String(data);
  await syncFortunaAccount({ memberId, email: values.email, password, displayName: values.nickname });

  await openSession(memberId);
  redirect(roleHome("registered"));
}

// 로그아웃: 현재 세션만 폐기 + 쿠키 삭제.
export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const sb = getServerClient();
    await sb.rpc("close_member_session", { p_token_hash: hashSessionToken(token) });
  }
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

// ── 비밀번호 찾기(이메일 링크 · 30분 · 1회용) ──────────────────────────────────

// 재설정 링크의 기준 URL. PORTAL_BASE_URL 이 있으면 우선, 없으면 요청 헤더로 계산.
async function getPortalBaseUrl(): Promise<string> {
  const env = process.env.PORTAL_BASE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export type ResetState = { error?: string; ok?: boolean; values?: { email?: string }; devLink?: string } | undefined;

// 링크 요청. 계정 존재 여부와 무관하게 같은 안내를 돌려준다(이메일 노출 방지).
//  메일 제공자 미설정(개발)이면 링크를 서버 로그에 남기고, 비운영 빌드에서는 화면에도 보여준다.
export async function requestMemberPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "ID(이메일)를 입력하세요", values: { email } };

  const token = randomBytes(32).toString("hex");
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim();
  const sb = getServerClient();
  const { data, error } = await sb.rpc("request_member_password_reset", { p_email: email, p_token_hash: hashSessionToken(token), p_ip: ip });
  if (error) {
    if (error.message.includes("RATE_LIMITED")) return { error: "요청이 너무 잦습니다. 1시간 뒤 다시 시도하세요", values: { email } };
    return { error: "요청 처리 중 오류가 발생했습니다", values: { email } };
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { ok: true, values: { email } };

  const link = `${await getPortalBaseUrl()}/reset-password?token=${token}`;
  const result = await sendEmail(
    row.email,
    "[포르투나] 비밀번호 재설정 안내",
    `${row.display_name}님,\n\n아래 링크에서 새 비밀번호를 설정하세요. 링크는 30분 동안 한 번만 사용할 수 있습니다.\n\n${link}\n\n본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 바뀌지 않습니다.\n\n— 포르투나`,
  );
  if (result !== "sent") console.info(`[member-reset] 재설정 링크(${result}): ${link}`);
  const devLink = result === "skipped" && process.env.NODE_ENV !== "production" ? link : undefined;
  return { ok: true, values: { email }, devLink };
}

// 링크 토큰으로 새 비밀번호 설정 → Fortuna 앱 계정도 같은 비밀번호로 → 로그인 화면.
const RESET_ERRORS: Record<string, string> = {
  TOKEN_INVALID: "재설정 링크가 올바르지 않습니다. 다시 요청하세요",
  TOKEN_USED: "이미 사용된 링크입니다. 다시 요청하세요",
  TOKEN_EXPIRED: "링크가 만료되었습니다(30분). 다시 요청하세요",
  PASSWORD_TOO_SHORT: "새 비밀번호는 8자 이상이어야 합니다",
};
export async function completeMemberPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!/^[0-9a-f]{64}$/.test(token)) return { error: RESET_ERRORS.TOKEN_INVALID };
  if (!next) return { error: "새 비밀번호를 입력하세요" };
  if (next.length < 8) return { error: RESET_ERRORS.PASSWORD_TOO_SHORT };
  if (next !== confirm) return { error: "비밀번호 확인이 일치하지 않습니다" };
  const sb = getServerClient();
  const { data, error } = await sb.rpc("complete_member_password_reset", { p_token_hash: hashSessionToken(token), p_new: next });
  if (error) {
    const code = Object.keys(RESET_ERRORS).find((k) => error.message.includes(k));
    return { error: code ? RESET_ERRORS[code] : "재설정 처리 중 오류가 발생했습니다" };
  }
  const row = Array.isArray(data) ? data[0] : null;
  if (row) await syncFortunaAccount({ memberId: row.member_id, email: row.email, password: next, displayName: row.display_name });
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login?reason=reset_done");
}

// 재설정 페이지 렌더용 — 토큰이 살아 있으면 대상 이메일.
export async function checkMemberPasswordReset(token: string): Promise<{ email: string } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const sb = getServerClient();
  const { data } = await sb.rpc("check_member_password_reset", { p_token_hash: hashSessionToken(token) });
  const row = Array.isArray(data) ? data[0] : null;
  return row ? { email: row.email as string } : null;
}

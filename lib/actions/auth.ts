"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, roleHome } from "@/lib/session";
import { syncFortunaAccount } from "@/lib/fortuna-auth";
import type { MemberRole } from "@/lib/supabase/types";

const MAX_AGE = 60 * 60 * 24 * 7; // 7일

export type AuthState = { error?: string; values?: Record<string, string> } | undefined;

async function setSession(memberId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, memberId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE });
}

// ID(이메일) + 비밀번호 로그인(검증은 DB 함수 member_login 에서 bcrypt 비교). 실패 시 에러 문자열 반환.
export async function loginByEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email) return { error: "ID(이메일)를 입력하세요", values: { email } };
  if (!password) return { error: "비밀번호를 입력하세요", values: { email } };

  const sb = getServerClient();
  const { data, error } = await sb.rpc("member_login", { p_email: email, p_password: password });
  if (error) return { error: "로그인 처리 중 오류가 발생했습니다", values: { email } };
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return { error: "ID 또는 비밀번호가 올바르지 않습니다", values: { email } };

  // Fortuna 앱 계정 동기화(기존 회원 backfill): 방금 검증된 비밀번호로 같은 계정을 보장.
  const { data: m } = await sb.from("members").select("display_name").eq("id", row.id).maybeSingle();
  await syncFortunaAccount({ memberId: row.id, email, password, displayName: m?.display_name ?? email.split("@")[0] });

  await setSession(row.id);
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

  await setSession(memberId);
  redirect(roleHome("registered"));
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

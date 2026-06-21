"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, roleHome } from "@/lib/session";
import type { MemberRole } from "@/lib/supabase/types";

const MAX_AGE = 60 * 60 * 24 * 7; // 7일

async function setSession(memberId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, memberId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: MAX_AGE });
}

// 데모 로그인: 회원 id 로 바로 로그인 → 역할별 홈으로.
export async function loginAs(memberId: string) {
  const sb = getServerClient();
  const { data, error } = await sb.from("members").select("id, role").eq("id", memberId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("회원을 찾을 수 없습니다");
  await setSession(data.id);
  redirect(roleHome(data.role as MemberRole));
}

// 이메일로 로그인(데모: 비밀번호 없음). 미존재 시 에러 문자열 반환(폼에서 표시).
export async function loginByEmail(_prev: unknown, formData: FormData): Promise<{ error: string } | void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "이메일을 입력하세요" };
  const sb = getServerClient();
  const { data, error } = await sb.from("members").select("id, role").ilike("email", email).maybeSingle();
  if (error) return { error: "조회 중 오류가 발생했습니다" };
  if (!data) return { error: "해당 이메일의 회원이 없습니다" };
  await setSession(data.id);
  redirect(roleHome(data.role as MemberRole));
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

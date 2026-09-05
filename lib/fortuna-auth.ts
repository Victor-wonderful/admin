import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerClient } from "@/lib/supabase/server";

// Fortuna 제품 앱(Supabase 클라우드)의 Auth 계정 동기화.
// 포털 가입 ID(이메일)·비밀번호를 Fortuna 로그인에 그대로 쓸 수 있도록 auth.users 를 맞춘다.
// 미설정(FORTUNA_* 환경변수 없음)이거나 실패해도 포털 흐름은 막지 않는다(경고 로그만).

export function isFortunaConfigured(): boolean {
  return Boolean(process.env.FORTUNA_SUPABASE_URL && process.env.FORTUNA_SUPABASE_SERVICE_ROLE_KEY);
}

function fortunaAdmin(): SupabaseClient | null {
  const url = process.env.FORTUNA_SUPABASE_URL;
  const key = process.env.FORTUNA_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// 이메일로 기존 Fortuna 사용자 검색(관리 API 는 이메일 필터가 없어 페이지 순회).
async function findUserIdByEmail(sb: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 1000) break;
  }
  return null;
}

// Fortuna 계정을 보장한다: 이미 연결된 id 가 있으면 비밀번호만 갱신, 없으면 생성(이메일 중복이면 찾아서 갱신).
// 성공 시 Fortuna user id, 실패/미설정 시 null.
export async function ensureFortunaUser(args: {
  email: string;
  password: string;
  displayName: string;
  knownId?: string | null;
}): Promise<string | null> {
  const sb = fortunaAdmin();
  if (!sb) return null;
  const email = args.email.toLowerCase();

  try {
    if (args.knownId) {
      const { error } = await sb.auth.admin.updateUserById(args.knownId, { password: args.password });
      if (!error) return args.knownId;
      console.warn("[fortuna-auth] updateUserById 실패, 재검색:", error.message);
    }

    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: args.password,
      email_confirm: true,
      user_metadata: { display_name: args.displayName },
    });
    if (!error && data.user) return data.user.id;

    // 이미 Fortuna 에 같은 이메일이 있으면 그 계정의 비밀번호를 포털과 맞춘다.
    const existing = await findUserIdByEmail(sb, email);
    if (existing) {
      const { error: upErr } = await sb.auth.admin.updateUserById(existing, { password: args.password });
      if (upErr) console.warn("[fortuna-auth] 기존 계정 비밀번호 갱신 실패:", upErr.message);
      return existing;
    }
    console.warn("[fortuna-auth] createUser 실패:", error?.message);
    return null;
  } catch (e) {
    console.warn("[fortuna-auth] 동기화 예외:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Fortuna 앱 계정 차단/해제(회원 정지 연동). 차단은 100년 ban, 해제는 none. 실패해도 무시.
export async function setFortunaBanned(fortunaUserId: string, banned: boolean): Promise<void> {
  const sb = fortunaAdmin();
  if (!sb) return;
  const { error } = await sb.auth.admin.updateUserById(fortunaUserId, { ban_duration: banned ? "876000h" : "none" });
  if (error) console.warn("[fortuna-auth] 계정 차단 상태 변경 실패:", error.message);
}

// Fortuna profiles.display_name 갱신(닉네임 변경 시). 실패해도 무시.
export async function updateFortunaDisplayName(fortunaUserId: string, displayName: string): Promise<void> {
  const sb = fortunaAdmin();
  if (!sb) return;
  const { error } = await sb.from("profiles").update({ display_name: displayName }).eq("id", fortunaUserId);
  if (error) console.warn("[fortuna-auth] display_name 갱신 실패:", error.message);
}

// 포털 members.fortuna_user_id 기록.
export async function linkFortunaUser(memberId: string, fortunaUserId: string): Promise<void> {
  const sb = getServerClient();
  const { error } = await sb.from("members").update({ fortuna_user_id: fortunaUserId }).eq("id", memberId);
  if (error) console.warn("[fortuna-auth] fortuna_user_id 기록 실패:", error.message);
}

// 회원의 현재 연결 id 조회.
export async function getLinkedFortunaId(memberId: string): Promise<string | null> {
  const sb = getServerClient();
  const { data } = await sb.from("members").select("fortuna_user_id, display_name, email").eq("id", memberId).maybeSingle();
  return (data?.fortuna_user_id as string | null) ?? null;
}

// 가입/로그인/비밀번호 변경 공통: 계정 보장 후 연결 id 저장.
export async function syncFortunaAccount(args: {
  memberId: string;
  email: string | null;
  password: string;
  displayName: string;
}): Promise<void> {
  if (!isFortunaConfigured() || !args.email) return;
  const knownId = await getLinkedFortunaId(args.memberId);
  const id = await ensureFortunaUser({ email: args.email, password: args.password, displayName: args.displayName, knownId });
  if (id && id !== knownId) await linkFortunaUser(args.memberId, id);
}

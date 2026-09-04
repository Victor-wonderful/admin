"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/session";
import { syncFortunaAccount, updateFortunaDisplayName } from "@/lib/fortuna-auth";

// 프로필 액션은 클라이언트가 보낸 id 를 믿지 않고 세션 회원 기준으로만 동작한다.
export type ProfileState = { ok?: boolean; error?: string } | undefined;

function revalidateProfile() {
  revalidatePath("/portal/profile");
  revalidatePath("/marketer/profile");
}

// 닉네임(display_name) 변경 — Fortuna 앱 프로필 이름도 함께 갱신.
export async function updateNickname(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await getCurrentMember();
  if (!me) return { error: "로그인이 필요합니다" };
  const nickname = String(formData.get("nickname") ?? "").trim();
  if (nickname.length < 1 || nickname.length > 20) return { error: "닉네임은 1~20자로 입력하세요" };

  const sb = getServerClient();
  const { error } = await sb.from("members").update({ display_name: nickname }).eq("id", me.id);
  if (error) return { error: "닉네임 변경에 실패했습니다" };
  if (me.fortuna_user_id) await updateFortunaDisplayName(me.fortuna_user_id, nickname);
  revalidateProfile();
  return { ok: true };
}

// 회원 본인 지갑 주소(출금 목적지 · 입금 보낸 주소 식별). 빈 값은 해제.
const TRC20_RE = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;
const BEP20_RE = /^0x[0-9a-fA-F]{40}$/;

export async function updatePayoutAddresses(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await getCurrentMember();
  if (!me) return { error: "로그인이 필요합니다" };
  const trc20 = String(formData.get("trc20") ?? "").trim();
  const bep20 = String(formData.get("bep20") ?? "").trim();
  if (trc20 && !TRC20_RE.test(trc20)) return { error: "Tron(TRC20) 주소 형식이 올바르지 않습니다. T로 시작하는 34자리 주소를 입력하세요" };
  if (bep20 && !BEP20_RE.test(bep20)) return { error: "BSC(BEP20) 주소 형식이 올바르지 않습니다. 0x로 시작하는 42자리 주소를 입력하세요" };

  const sb = getServerClient();
  const { error } = await sb
    .from("members")
    .update({ payout_address_trc20: trc20 || null, payout_address_bep20: bep20 || null })
    .eq("id", me.id);
  if (error) return { error: "지갑 주소 저장에 실패했습니다" };
  revalidateProfile();
  revalidatePath("/portal/wallet");
  revalidatePath("/marketer/wallet");
  return { ok: true };
}

const PW_ERRORS: Record<string, string> = {
  PASSWORD_TOO_SHORT: "새 비밀번호는 8자 이상이어야 합니다",
  CURRENT_PASSWORD_WRONG: "현재 비밀번호가 올바르지 않습니다",
  MEMBER_NOT_FOUND: "회원 정보를 찾을 수 없습니다",
};

// 비밀번호 변경(현재 비밀번호 확인은 DB 함수에서 bcrypt 비교) — Fortuna 앱 비밀번호도 같은 값으로 갱신.
export async function changePassword(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const me = await getCurrentMember();
  if (!me) return { error: "로그인이 필요합니다" };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current) return { error: "현재 비밀번호를 입력하세요" };
  if (next.length < 8) return { error: PW_ERRORS.PASSWORD_TOO_SHORT };
  if (next !== confirm) return { error: "새 비밀번호 확인이 일치하지 않습니다" };

  const sb = getServerClient();
  const { error } = await sb.rpc("change_member_password", { p_member: me.id, p_current: current, p_new: next });
  if (error) {
    const code = Object.keys(PW_ERRORS).find((k) => error.message.includes(k));
    return { error: code ? PW_ERRORS[code] : "비밀번호 변경에 실패했습니다" };
  }
  await syncFortunaAccount({ memberId: me.id, email: me.email, password: next, displayName: me.display_name });
  return { ok: true };
}

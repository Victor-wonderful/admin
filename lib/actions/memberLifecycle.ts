"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CYCLE_ASOF = "2026-06-15";

// 액션 결과 — 예외를 던지지 않고 결과 객체로 돌려준다.
// (서버 액션에서 throw 하면 프로덕션에선 메시지가 가려지고, Supabase 에러 객체는 클라이언트에 원시 객체로 찍힌다.)
export type LifecycleResult = { ok: true; dest: string } | { ok: false; error: string };

function revalidatePortals() {
  revalidatePath("/portal/registered");
  revalidatePath("/portal/subscriber");
  revalidatePath("/marketer/dashboard");
  revalidatePath("/admin/members");
}

// DB 함수(raise exception)의 메시지를 사용자 문구로. 이미 한글 메시지라 그대로 쓰되 형식만 다듬는다.
function toMessage(error: { message?: string } | null, fallback: string): string {
  const m = error?.message?.trim();
  return m && m.length > 0 ? m : fallback;
}

// 지갑 충전(데모: 명시 입금 반영). 실서비스는 온체인 감지로 대체.
export async function chargeWallet(memberId: string, amount: number): Promise<LifecycleResult> {
  const sb = getServerClient();
  const { error } = await sb.rpc("record_deposit", { p_member: memberId, p_amount: amount });
  if (error) return { ok: false, error: toMessage(error, "충전에 실패했습니다") };
  revalidatePortals();
  return { ok: true, dest: "" };
}

// 등록회원 → 구독회원 ($120 결제). 성공 시 새 역할 홈 경로 반환(자동 이동용). 잔액 부족 등은 error 메시지.
export async function subscribeMember(memberId: string, amount = 120): Promise<LifecycleResult> {
  const sb = getServerClient();
  const { error } = await sb.rpc("subscribe_member", { p_member: memberId, p_amount: amount, p_as_of: CYCLE_ASOF });
  if (error) return { ok: false, error: toMessage(error, "구독 처리에 실패했습니다") };
  revalidatePortals();
  return { ok: true, dest: "/portal/subscriber" };
}

// 구독회원 → 마케터 (연회비 $200 결제). 마케터 홈 경로 반환.
export async function upgradeToMarketer(memberId: string, amount = 200): Promise<LifecycleResult> {
  const sb = getServerClient();
  const { error } = await sb.rpc("upgrade_to_marketer", { p_member: memberId, p_amount: amount, p_as_of: CYCLE_ASOF });
  if (error) return { ok: false, error: toMessage(error, "승급 처리에 실패했습니다") };
  revalidatePortals();
  return { ok: true, dest: "/marketer/dashboard" };
}

// 등록회원 → 마케터 한 번에 (구독+연회비 합산 $320). 마케터 홈 경로 반환.
export async function subscribeAndUpgrade(memberId: string, sub = 120, annual = 200): Promise<LifecycleResult> {
  const sb = getServerClient();
  const { error } = await sb.rpc("subscribe_and_upgrade", {
    p_member: memberId,
    p_sub: sub,
    p_annual: annual,
    p_as_of: CYCLE_ASOF,
  });
  if (error) return { ok: false, error: toMessage(error, "마케터 전환에 실패했습니다") };
  revalidatePortals();
  return { ok: true, dest: "/marketer/dashboard" };
}

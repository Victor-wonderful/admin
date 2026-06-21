"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const CYCLE_ASOF = "2026-06-15";

function revalidatePortals() {
  revalidatePath("/portal/registered");
  revalidatePath("/portal/subscriber");
  revalidatePath("/marketer/dashboard");
  revalidatePath("/admin/members");
}

// 지갑 충전(데모: 명시 입금 반영). 실서비스는 온체인 감지로 대체.
export async function chargeWallet(memberId: string, amount: number): Promise<void> {
  const sb = getServerClient();
  const { error } = await sb.rpc("record_deposit", { p_member: memberId, p_amount: amount });
  if (error) throw error;
  revalidatePortals();
}

// 등록회원 → 구독회원 ($120 결제). 새 역할 홈 경로 반환(자동 이동용). 잔액 부족 시 예외.
export async function subscribeMember(memberId: string, amount = 120): Promise<string> {
  const sb = getServerClient();
  const { error } = await sb.rpc("subscribe_member", { p_member: memberId, p_amount: amount, p_as_of: CYCLE_ASOF });
  if (error) throw error;
  revalidatePortals();
  return "/portal/subscriber";
}

// 구독회원 → 마케터 (연회비 $200 결제). 마케터 홈 경로 반환.
export async function upgradeToMarketer(memberId: string, amount = 200): Promise<string> {
  const sb = getServerClient();
  const { error } = await sb.rpc("upgrade_to_marketer", { p_member: memberId, p_amount: amount, p_as_of: CYCLE_ASOF });
  if (error) throw error;
  revalidatePortals();
  return "/marketer/dashboard";
}

// 등록회원 → 마케터 한 번에 (구독+연회비 합산 $320). 마케터 홈 경로 반환.
export async function subscribeAndUpgrade(memberId: string, sub = 120, annual = 200): Promise<string> {
  const sb = getServerClient();
  const { error } = await sb.rpc("subscribe_and_upgrade", {
    p_member: memberId,
    p_sub: sub,
    p_annual: annual,
    p_as_of: CYCLE_ASOF,
  });
  if (error) throw error;
  revalidatePortals();
  return "/marketer/dashboard";
}

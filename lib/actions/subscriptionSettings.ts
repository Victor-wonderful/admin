"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/session";

// 구독 자동 갱신 on/off — 세션 회원 본인만. off = 종료일에 갱신하지 않고 만료(해지 예약).
export async function setAutoRenew(on: boolean): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: "로그인이 필요합니다" };
  const sb = getServerClient();
  const { error } = await sb.from("members").update({ auto_renew: on }).eq("id", me.id);
  if (error) return { ok: false, error: error.message };
  for (const p of ["/portal/orders", "/marketer/orders", "/portal/subscriber", "/marketer/dashboard"]) revalidatePath(p);
  return { ok: true };
}

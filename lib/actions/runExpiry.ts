"use server";

import { today } from "@/lib/dates";
import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";

// 데모용 "월 만료 실행": 일부 활성 구독을 만료 처리 후 활성 플래그 재계산.
// 실제로는 월별 Cron 이 수행할 작업.
export async function runMonthlyExpiry(asOf = today()) {
  const sb = getServerClient();

  // 데모: 현재 활성 구독 중 일부(약 25%)를 만료 처리해 카운팅 변화를 시각화.
  const { data: actives, error: e1 } = await sb
    .from("subscriptions")
    .select("id")
    .eq("status", "active");
  if (e1) throw e1;

  const ids = (actives ?? []).map((r) => r.id);
  // 결정적이지 않아도 되는 데모 — 인덱스 4의 배수만 만료(약 25%).
  const toExpire = ids.filter((_, i) => i % 4 === 0);
  if (toExpire.length > 0) {
    const { error: e2 } = await sb.from("subscriptions").update({ status: "expired" }).in("id", toExpire);
    if (e2) throw e2;
  }

  const { error: e3 } = await sb.rpc("refresh_active_subscribers", { as_of: asOf });
  if (e3) throw e3;

  await audit({ category: "member", action: "expiry_run", target: `월 만료 실행(데모) · 구독 ${toExpire.length}건 만료 처리`, risk: true });
  revalidatePath("/admin");
  revalidatePath("/marketer");
  return { expired: toExpire.length };
}

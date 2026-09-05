"use server";

import { today, currentCycle } from "@/lib/dates";
import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";

export interface PayResult {
  members_paid: number;
  total_paid: number;
}

// 수당 지급 실행. scope='instant'(직추+직급, 상시) | 'share'(공유, 월 1회).
// settlements 산정액 중 미지급분(delta)만 지갑에 적립하고 수당풀에서 차감(멱등).
export async function payCommission(
  cycle = currentCycle(),
  scope: "instant" | "share" = "instant",
  asOf = today(),
): Promise<PayResult> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("pay_commission", {
    p_cycle: cycle,
    p_scope: scope,
    p_as_of: asOf,
  });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as PayResult | undefined;
  await audit({ category: "settlement", action: "commission_pay", target: `${cycle} 수당 지급 실행(${scope === "share" ? "공유" : "초대·직급"}) · ${row?.members_paid ?? 0}명 · $${Math.round(row?.total_paid ?? 0).toLocaleString()}`, targetId: cycle, risk: true });

  revalidatePath("/admin/settlements");
  revalidatePath("/admin/wallet");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin");
  revalidatePath("/marketer");

  return row ?? { members_paid: 0, total_paid: 0 };
}

"use server";

import { currentCycle } from "@/lib/dates";
import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";

export interface RevenueAllocationResult {
  revenue_total: number;
  pool_commission: number; // 60%
  pool_company: number; // 20%
  pool_equity: number; // 10%
  pool_reserve: number; // 10%
}

// 매출 1차 배분 실행. DB 함수 allocate_revenue 가 사이클 매출(구독+연회비)을
// 60/20/10/10 으로 풀에 배분하고 system_wallets 잔액을 갱신.
export async function allocateRevenue(cycle = currentCycle()): Promise<RevenueAllocationResult> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("allocate_revenue", { p_cycle: cycle });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as RevenueAllocationResult | undefined;
  await audit({ category: "finance", action: "revenue_allocate", target: `${cycle} 매출 배분 실행 · 매출 $${Math.round(row?.revenue_total ?? 0).toLocaleString()} → 수당풀 $${Math.round(row?.pool_commission ?? 0).toLocaleString()}`, targetId: cycle });

  revalidatePath("/admin/wallet");
  revalidatePath("/admin/revenue");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin");

  return (
    row ?? { revenue_total: 0, pool_commission: 0, pool_company: 0, pool_equity: 0, pool_reserve: 0 }
  );
}

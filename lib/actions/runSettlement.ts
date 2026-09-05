"use server";

import { today, currentCycle } from "@/lib/dates";
import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";

export interface SettlementRunResult {
  members_paid: number;
  level_total: number;
  rank_total: number;
  share_total: number;
  grand_total: number;
}

// 정산 엔진 실행(재산정). DB 함수 run_settlement 가 레벨·직급·공유 수당을 계산해
// settlements 테이블에 멱등 기록. asOf 는 활성 구독자 산정 기준일.
export async function runSettlement(cycle = currentCycle(), asOf = today()): Promise<SettlementRunResult> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("run_settlement", { p_cycle: cycle, p_as_of: asOf });
  if (error) throw error;

  const row = (Array.isArray(data) ? data[0] : data) as SettlementRunResult | undefined;
  await audit({ category: "settlement", action: "settlement_run", target: `${cycle} 정산 재산정 · ${row?.members_paid ?? 0}명 · $${Math.round(row?.grand_total ?? 0).toLocaleString()}`, targetId: cycle });

  revalidatePath("/admin/settlements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin");
  revalidatePath("/marketer");

  return (
    row ?? { members_paid: 0, level_total: 0, rank_total: 0, share_total: 0, grand_total: 0 }
  );
}

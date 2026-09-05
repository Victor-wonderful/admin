"use server";

import { currentCycle } from "@/lib/dates";
import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { toUid } from "@/lib/uid";

// 일괄 확정: 해당 사이클의 calculated → confirmed. 반영 건수 반환.
export async function confirmSettlements(cycle = currentCycle()): Promise<number> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("confirm_settlements", { p_cycle: cycle });
  if (error) throw error;
  await audit({ category: "settlement", action: "settlement_confirm", target: `${cycle} 수당 정산 일괄 확정 · ${(data as number) ?? 0}건`, targetId: cycle, risk: true });

  revalidatePath("/admin/settlements");
  revalidatePath("/admin");
  return (data as number) ?? 0;
}

// 개별 보류/해제 (지급완료 건은 불가). 새 상태 반환.
export async function setSettlementHold(
  cycle: string,
  memberId: string,
  hold: boolean,
): Promise<string> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("set_settlement_hold", {
    p_cycle: cycle,
    p_member: memberId,
    p_hold: hold,
  });
  if (error) throw error;
  await audit({ category: "settlement", action: hold ? "settlement_hold" : "settlement_release", target: `${cycle} · ${toUid(memberId)} 정산 ${hold ? "보류" : "보류 해제"}`, targetId: memberId });

  revalidatePath("/admin/settlements");
  return (data as string) ?? (hold ? "held" : "confirmed");
}

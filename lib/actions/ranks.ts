"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { assertCapability } from "@/lib/admin-guard";

export interface RankConfigInput {
  rank: number;
  rate_pct: number;
  min_total: number | null;
  min_direct: number | null;
  override_rate: number | null;
  requires_30pct: boolean;
}

// 직급 기준 일괄 저장. ranks 테이블을 rank 키로 업데이트(WHERE 절 → safeupdate 가드 통과).
// 엔진(evaluate_rank/run_settlement)이 이 값으로 산정하므로 저장 즉시 정산 기준이 바뀐다.
export async function updateRanks(rows: RankConfigInput[]): Promise<number> {
  await assertCapability("catalog.write", "직급 요율·기준 변경");
  const sb = getServerClient();
  let updated = 0;
  for (const r of rows) {
    const { error } = await sb
      .from("ranks")
      .update({
        rate_pct: r.rate_pct,
        min_total: r.min_total,
        min_direct: r.min_direct,
        override_rate: r.override_rate,
        requires_30pct: r.requires_30pct,
      })
      .eq("rank", r.rank);
    if (error) throw error;
    updated++;
  }
  await audit({ category: "catalog", action: "ranks_update", target: `직급 요율·기준 저장 · ${updated}개 직급 · 요율 ${rows.map((r) => `${r.rank}:${r.rate_pct}%`).join(" ")}`, risk: true });
  revalidatePath("/admin/ranks");
  revalidatePath("/admin/settlements");
  return updated;
}

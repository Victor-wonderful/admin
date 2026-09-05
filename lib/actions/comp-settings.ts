"use server";

import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";
import { checkCapability } from "@/lib/admin-guard";
import { audit } from "@/lib/audit";
import { currentCycle } from "@/lib/dates";
import { COMP_KEYS, type CompSettings } from "@/lib/queries/comp-settings";

// 수당체계 설정 저장 — 레벨 1·2대 요율 / 매출 1차 배분 비율. 저장 즉시 정산 엔진이 이 값을 읽는다.
// 배분 비율이 바뀌면 당월 배분을 다시 계산해 풀 잔액에 바로 반영한다(과거 사이클은 그대로).

export type CompSettingsResult = { ok: true } | { ok: false; error: string };

const LABEL: Record<keyof CompSettings, string> = {
  level_gen1_pct: "레벨 1대", level_gen2_pct: "레벨 2대",
  alloc_commission_pct: "수당 풀", alloc_company_pct: "회사 수익", alloc_equity_pct: "지분자 배당", alloc_reserve_pct: "예비비",
  balance_gate_pct: "공유수당 게이트",
};

export async function updateCompSettings(values: Partial<CompSettings>): Promise<CompSettingsResult> {
  const g = await checkCapability("catalog.write", "수당체계 설정 변경");
  if (!g.ok) return { ok: false, error: g.error };

  const payload: Record<string, number> = {};
  for (const k of COMP_KEYS) {
    const v = values[k];
    if (v === undefined) continue;
    if (!Number.isFinite(v) || v < 0 || v > 100) return { ok: false, error: `${LABEL[k]} 값은 0~100 사이여야 합니다` };
    payload[k] = Math.round(v * 100) / 100;
  }
  if (Object.keys(payload).length === 0) return { ok: false, error: "변경된 값이 없습니다" };
  const allocTouched = Object.keys(payload).some((k) => k.startsWith("alloc_"));
  if (allocTouched) {
    const sum = (["alloc_commission_pct", "alloc_company_pct", "alloc_equity_pct", "alloc_reserve_pct"] as const).reduce((s, k) => s + (payload[k] ?? NaN), 0);
    if (!Number.isFinite(sum) || Math.abs(sum - 100) > 0.001) return { ok: false, error: "배분 비율 4개의 합이 100% 여야 합니다" };
  }

  const sb = getServerClient();
  const { error } = await sb.rpc("update_comp_settings", { p_values: payload });
  if (error) {
    if (error.message.includes("ALLOC_SUM")) return { ok: false, error: "배분 비율 4개의 합이 100% 여야 합니다" };
    if (error.message.includes("OUT_OF_RANGE")) return { ok: false, error: "값은 0~100 사이여야 합니다" };
    return { ok: false, error: "저장 중 오류가 발생했습니다" };
  }
  if (allocTouched) {
    const { error: e2 } = await sb.rpc("allocate_revenue", { p_cycle: currentCycle() });
    if (e2) console.warn("[comp-settings] 당월 재배분 실패:", e2.message);
  }
  await audit({
    category: "catalog",
    action: "comp_settings_update",
    target: `수당체계 설정 변경 · ${Object.entries(payload).map(([k, v]) => `${LABEL[k as keyof CompSettings]} ${v}%`).join(" · ")}${allocTouched ? ` · ${currentCycle()} 재배분` : ""}`,
    risk: true,
    meta: payload,
  });
  for (const p of ["/admin/ranks", "/admin/dashboard", "/admin/revenue", "/admin/wallet", "/admin/settlements"]) revalidatePath(p);
  return { ok: true };
}

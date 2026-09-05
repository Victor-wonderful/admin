import "server-only";
import { getServerClient } from "@/lib/supabase/server";

// 보상 전역 설정(comp_settings) — 레벨 1·2대 요율, 매출 1차 배분 비율, 공유수당 게이트. 직급/공유 요율은 ranks 테이블.
export interface CompSettings {
  level_gen1_pct: number;
  level_gen2_pct: number;
  alloc_commission_pct: number;
  alloc_company_pct: number;
  alloc_equity_pct: number;
  alloc_reserve_pct: number;
  balance_gate_pct: number; // 공유수당 소실적 게이트(%)
}

export const COMP_DEFAULTS: CompSettings = {
  level_gen1_pct: 25,
  level_gen2_pct: 9,
  alloc_commission_pct: 60,
  alloc_company_pct: 20,
  alloc_equity_pct: 10,
  alloc_reserve_pct: 10,
  balance_gate_pct: 30,
};

export const COMP_KEYS = Object.keys(COMP_DEFAULTS) as Array<keyof CompSettings>;

export async function getCompSettings(): Promise<CompSettings> {
  const sb = getServerClient();
  const { data, error } = await sb.from("comp_settings").select("key, value");
  if (error) throw error;
  const out: CompSettings = { ...COMP_DEFAULTS };
  for (const r of (data ?? []) as Array<{ key: string; value: number }>) {
    if ((COMP_KEYS as string[]).includes(r.key)) out[r.key as keyof CompSettings] = Number(r.value);
  }
  return out;
}

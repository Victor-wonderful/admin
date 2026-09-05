import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import type { MarketerLeg, MajorMinor } from "@/lib/supabase/types";

// 파트너의 레그별 활성 구독자 수 (후원 트리 직속 자식 기준)
export async function getMarketerLegs(marketerId: string): Promise<MarketerLeg[]> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("get_marketer_legs", { m_id: marketerId });
  if (error) throw error;
  return (data ?? []) as MarketerLeg[];
}

// 대실적 / 기타소실적 / 총활성 / 레그수
export async function getMajorMinor(marketerId: string): Promise<MajorMinor> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("get_major_minor", { m_id: marketerId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as MajorMinor | undefined;
  return row ?? { major_leg: 0, other_minor: 0, total_active: 0, leg_count: 0 };
}

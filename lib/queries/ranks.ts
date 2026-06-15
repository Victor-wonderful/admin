import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import type { RankRow, RankInfo } from "@/lib/supabase/types";

export async function listRanks(): Promise<RankRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from("ranks").select("*").order("rank");
  if (error) throw error;
  return (data ?? []) as RankRow[];
}

export async function getMemberRank(memberId: string): Promise<RankInfo | null> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("evaluate_rank", { m_id: memberId });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as RankInfo | undefined;
  return row ?? null;
}

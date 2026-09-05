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

export interface MemberRankRow {
  member_id: string;
  rank: number; // 0 = 무직급
  label: string | null; // '3직급' 등, rank=0 이면 null
}

// 전체 파트너의 직급을 한 번에 산정(N+1 방지). 회원 리스트/정산 화면에서 사용.
export async function getMemberRanksMap(): Promise<Map<string, MemberRankRow>> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("member_ranks");
  if (error) throw error;
  const rows = (data ?? []) as MemberRankRow[];
  return new Map(rows.map((r) => [r.member_id, r]));
}

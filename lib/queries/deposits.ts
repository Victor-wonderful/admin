import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { getNetworkConfigs } from "@/lib/chain/usdt";
import type { ChainNetwork } from "@/lib/chain/explorer";
import { currentCycle, today } from "@/lib/dates";

export interface OnchainDeposit {
  id: string;
  network: ChainNetwork;
  tx_hash: string;
  from_address: string;
  to_address: string;
  amount_usd: number;
  block_time: string;
  member_id: string | null;
  status: "unmatched" | "credited" | "ignored";
  detected_at: string;
  credited_at: string | null;
  note: string | null;
}

export interface DepositScanState {
  network: ChainNetwork;
  last_block_time: string | null;
  last_block: number | null;
  last_run_at: string | null;
  last_error: string | null;
  seen_count: number;
}

export async function listOnchainDeposits(limit = 30): Promise<OnchainDeposit[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from("onchain_deposits").select("*").order("block_time", { ascending: false }).limit(limit);
  if (error) throw error;
  return ((data ?? []) as OnchainDeposit[]).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) }));
}

export async function listUnmatchedDeposits(): Promise<OnchainDeposit[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from("onchain_deposits").select("*").eq("status", "unmatched").order("block_time", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as OnchainDeposit[]).map((r) => ({ ...r, amount_usd: Number(r.amount_usd) }));
}

export async function getScanStates(): Promise<DepositScanState[]> {
  const sb = getServerClient();
  const { data } = await sb.from("deposit_scan_state").select("*");
  const rows = (data ?? []) as DepositScanState[];
  return getNetworkConfigs().map((c) => rows.find((r) => r.network === c.network) ?? { network: c.network, last_block_time: null, last_block: null, last_run_at: null, last_error: null, seen_count: 0 });
}

// 설정 상태(키·주소 존재 여부만, 값은 노출하지 않음)
export function getDepositConfigStatus(): Array<{ network: ChainNetwork; address: string | null; ready: boolean; missing: string[] }> {
  return getNetworkConfigs().map((c) => ({ network: c.network, address: c.address, ready: c.ready, missing: c.missing }));
}

// KPI — 지갑 원장의 deposit 행(테스트 입금·온체인 반영 모두 포함) 기준.
export async function getDepositSummary(): Promise<{
  todayAmount: number; todayCount: number; monthAmount: number; monthCount: number; totalAmount: number; totalCount: number; unmatchedCount: number; unmatchedAmount: number;
}> {
  const sb = getServerClient();
  const [{ data: tx }, { data: un }] = await Promise.all([
    sb.from("wallet_transactions").select("amount_usd, created_at, status").eq("tx_type", "deposit").eq("status", "completed"),
    sb.from("onchain_deposits").select("amount_usd").eq("status", "unmatched"),
  ]);
  const t = today();
  const m = currentCycle();
  const s = { todayAmount: 0, todayCount: 0, monthAmount: 0, monthCount: 0, totalAmount: 0, totalCount: 0, unmatchedCount: 0, unmatchedAmount: 0 };
  for (const r of (tx ?? []) as Array<{ amount_usd: number; created_at: string }>) {
    const a = Number(r.amount_usd);
    s.totalAmount += a; s.totalCount += 1;
    if (r.created_at.startsWith(m)) { s.monthAmount += a; s.monthCount += 1; }
    if (r.created_at.startsWith(t)) { s.todayAmount += a; s.todayCount += 1; }
  }
  for (const r of (un ?? []) as Array<{ amount_usd: number }>) { s.unmatchedCount += 1; s.unmatchedAmount += Number(r.amount_usd); }
  return s;
}

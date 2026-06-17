import "server-only";
import { getServerClient } from "@/lib/supabase/server";

export interface SystemWallet {
  kind: string;
  label: string;
  balance_usd: number;
  network: string | null;
}
export interface WalletTx {
  id: string;
  member_id: string | null;
  tx_type: string;
  amount_usd: number;
  fee_usd: number;
  network: string | null;
  tx_hash: string | null;
  status: string;
  created_at: string;
  members?: { display_name: string } | null;
}
export interface Withdrawal {
  id: string;
  member_id: string;
  amount_usd: number;
  fee_usd: number;
  to_address: string;
  network: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  tx_hash: string | null;
  members?: { display_name: string } | null;
}
export interface Settlement {
  id: string;
  cycle: string;
  member_id: string;
  level_amount: number;
  rank_amount: number;
  share_amount: number;
  total_amount: number;
  status: string;
  members?: { display_name: string } | null;
}

const NAME = "members(display_name)";

export async function getSystemWallets(): Promise<SystemWallet[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from("system_wallets").select("*");
  if (error) throw error;
  return (data ?? []) as SystemWallet[];
}

export async function listTransactions(opts?: { type?: string; limit?: number }): Promise<WalletTx[]> {
  const sb = getServerClient();
  let q = sb
    .from("wallet_transactions")
    .select(`*, ${NAME}`)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 20);
  if (opts?.type) q = q.eq("tx_type", opts.type);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as WalletTx[];
}

export async function listWithdrawals(limit = 20): Promise<Withdrawal[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("withdrawals")
    .select(`*, ${NAME}`)
    .order("requested_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Withdrawal[];
}

export async function listSettlements(cycle: string, limit = 20): Promise<Settlement[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("settlements")
    .select(`*, ${NAME}`)
    .eq("cycle", cycle)
    .order("total_amount", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as Settlement[];
}

const fmtMonth = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

// 트랜잭션/입금/출금/정산 집계 — 행 수가 제한적이라 fetch 후 JS 집계.
export async function getTransactionStats() {
  const sb = getServerClient();
  const { data, error } = await sb.from("wallet_transactions").select("tx_type, amount_usd, fee_usd, status, created_at");
  if (error) throw error;
  const rows = data ?? [];
  const month = fmtMonth(new Date("2026-06-15"));
  let monthVolume = 0,
    failed = 0,
    feeSum = 0,
    feeN = 0;
  for (const r of rows) {
    if (typeof r.created_at === "string" && r.created_at.startsWith(month)) monthVolume += Number(r.amount_usd);
    if (r.status === "failed") failed++;
    if (Number(r.fee_usd) > 0) {
      feeSum += Number(r.fee_usd);
      feeN++;
    }
  }
  return {
    total: rows.length,
    monthVolume,
    failed,
    avgFee: feeN ? feeSum / feeN : 0,
  };
}

export async function getDepositStats() {
  const sb = getServerClient();
  const { data, error } = await sb.from("wallet_transactions").select("amount_usd, status, created_at").eq("tx_type", "payment");
  if (error) throw error;
  const rows = data ?? [];
  const month = fmtMonth(new Date("2026-06-15"));
  let monthSum = 0,
    pending = 0;
  for (const r of rows) {
    if (typeof r.created_at === "string" && r.created_at.startsWith(month)) monthSum += Number(r.amount_usd);
    if (r.status !== "completed") pending++;
  }
  return { count: rows.length, monthSum, pending };
}

export async function getWithdrawalStats() {
  const sb = getServerClient();
  const { data, error } = await sb.from("withdrawals").select("amount_usd, status");
  if (error) throw error;
  const rows = data ?? [];
  const by: Record<string, number> = {};
  let monthSum = 0;
  for (const r of rows) {
    by[r.status] = (by[r.status] ?? 0) + 1;
    monthSum += Number(r.amount_usd);
  }
  return {
    pending: by["pending"] ?? 0,
    sending: by["sending"] ?? 0,
    completed: by["completed"] ?? 0,
    monthSum,
  };
}

export async function getSettlementSummary(cycle: string) {
  const sb = getServerClient();
  const { data, error } = await sb.from("settlements").select("level_amount, rank_amount, share_amount, total_amount, status").eq("cycle", cycle);
  if (error) throw error;
  const rows = data ?? [];
  let level = 0,
    rank = 0,
    share = 0,
    total = 0,
    pending = 0;
  for (const r of rows) {
    level += Number(r.level_amount);
    rank += Number(r.rank_amount);
    share += Number(r.share_amount);
    total += Number(r.total_amount);
    if (r.status !== "paid") pending += Number(r.total_amount);
  }
  return { level, rank, share, total, pending, count: rows.length };
}

// 매출 = subscriptions + annual_memberships 결제액 집계
export async function getRevenueSummary() {
  const sb = getServerClient();
  const [subs, annual] = await Promise.all([
    sb.from("subscriptions").select("amount_usd, paid_at"),
    sb.from("annual_memberships").select("amount_usd, paid_at"),
  ]);
  if (subs.error) throw subs.error;
  if (annual.error) throw annual.error;
  const all = [...(subs.data ?? []), ...(annual.data ?? [])];
  const month = fmtMonth(new Date("2026-06-15"));
  let total = 0,
    monthTotal = 0;
  for (const r of all) {
    const amt = Number(r.amount_usd);
    total += amt;
    if (typeof r.paid_at === "string" && r.paid_at.startsWith(month)) monthTotal += amt;
  }
  return {
    total,
    monthTotal,
    subCount: subs.data?.length ?? 0,
    annualCount: annual.data?.length ?? 0,
  };
}

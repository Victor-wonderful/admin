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
  let monthSum = 0,
    pendingAmount = 0;
  for (const r of rows) {
    by[r.status] = (by[r.status] ?? 0) + 1;
    monthSum += Number(r.amount_usd);
    if (r.status === "pending" || r.status === "approved") pendingAmount += Number(r.amount_usd);
  }
  return {
    pending: by["pending"] ?? 0,
    sending: by["sending"] ?? 0,
    completed: by["completed"] ?? 0,
    monthSum,
    pendingAmount,
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

// ── 마케터 통합 지갑 ───────────────────────────────────────────────
// 현재 사이클 앵커(다른 집계와 동일하게 2026-06-15 기준).
const CURRENT_CYCLE = fmtMonth(new Date("2026-06-15"));

export interface MemberWallet {
  member_id: string;
  balance_usd: number;
  deposit_address: string;
  network: string;
}

export interface LedgerEntry {
  ts: string; // ISO
  tx_type: "deposit" | "payment" | "commission" | "withdrawal";
  amount_usd: number; // 부호 있음: 입금/수당 +, 결제/출금 −
  network: string | null;
  desc: string;
  status: string;
}

export interface MemberWalletData {
  wallet: MemberWallet | null;
  monthCommission: number; // 당월 수당 적립
  monthDeposit: number; // 당월 충전
  monthPayment: number; // 당월 결제 차감
  totalDeposit: number; // 누적 충전 (잔액 구성용)
  ledger: LedgerEntry[];
}

// 회원 통합 지갑 1건. 잔액·충전 주소·네트워크.
export async function getMemberWallet(memberId: string): Promise<MemberWallet | null> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("wallets")
    .select("member_id, balance_usd, deposit_address, network")
    .eq("member_id", memberId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? { ...data, balance_usd: Number(data.balance_usd) }
    : null;
}

// 통합 원장 = wallet_transactions(입금/결제) + withdrawals(출금) + settlements(수당) 병합.
// 잔액·주소는 wallets, 수당은 정산 테이블에서 파생(시드가 commission 거래를 안 만들어서).
export async function getMemberWalletData(memberId: string): Promise<MemberWalletData> {
  const sb = getServerClient();
  const [wallet, txRes, wdRes, stRes] = await Promise.all([
    getMemberWallet(memberId),
    sb
      .from("wallet_transactions")
      .select("tx_type, amount_usd, network, status, created_at")
      .eq("member_id", memberId)
      .in("tx_type", ["deposit", "payment"]),
    sb
      .from("withdrawals")
      .select("amount_usd, fee_usd, network, status, requested_at")
      .eq("member_id", memberId),
    sb
      .from("settlements")
      .select("cycle, total_amount, status, created_at")
      .eq("member_id", memberId),
  ]);
  if (txRes.error) throw txRes.error;
  if (wdRes.error) throw wdRes.error;
  if (stRes.error) throw stRes.error;

  const ledger: LedgerEntry[] = [];
  let monthDeposit = 0,
    monthPayment = 0,
    monthCommission = 0,
    totalDeposit = 0;

  for (const r of txRes.data ?? []) {
    const amt = Number(r.amount_usd);
    const inMonth = typeof r.created_at === "string" && r.created_at.startsWith(CURRENT_CYCLE);
    if (r.tx_type === "deposit") {
      totalDeposit += amt;
      if (inMonth) monthDeposit += amt;
      ledger.push({ ts: r.created_at, tx_type: "deposit", amount_usd: amt, network: r.network, desc: "USDT 입금 (충전)", status: r.status });
    } else {
      if (inMonth) monthPayment += amt;
      ledger.push({ ts: r.created_at, tx_type: "payment", amount_usd: -amt, network: "잔액 차감", desc: "Alpha Engine 구독 결제", status: r.status });
    }
  }

  for (const r of wdRes.data ?? []) {
    const amt = Number(r.amount_usd);
    ledger.push({ ts: r.requested_at, tx_type: "withdrawal", amount_usd: -amt, network: r.network, desc: "온체인 출금 송금", status: r.status });
  }

  for (const r of stRes.data ?? []) {
    const amt = Number(r.total_amount);
    if (r.cycle === CURRENT_CYCLE) monthCommission += amt;
    ledger.push({ ts: r.created_at, tx_type: "commission", amount_usd: amt, network: "수당 풀 분배", desc: `수당 정산 (${r.cycle})`, status: r.status });
  }

  ledger.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

  return { wallet, monthCommission, monthDeposit, monthPayment, totalDeposit, ledger };
}

// 특정 회원의 사이클 정산(수당 구성·합계) 1건.
export async function getMemberSettlement(memberId: string, cycle: string) {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("settlements")
    .select("level_amount, rank_amount, share_amount, total_amount, status")
    .eq("member_id", memberId)
    .eq("cycle", cycle)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    level: Number(data.level_amount),
    rank: Number(data.rank_amount),
    share: Number(data.share_amount),
    total: Number(data.total_amount),
    status: data.status as string,
  };
}

export interface PoolReconciliation {
  pool_allocated: number;
  computed_payout: number;
  paid_out: number;
  remaining: number;
  utilization_pct: number;
  over_pool: boolean;
}

// 수당풀(매출 60%) 대비 산정·지급액 정합 (풀↔엔진).
export async function getPoolReconciliation(cycle: string): Promise<PoolReconciliation> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("pool_reconciliation", { p_cycle: cycle });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as PoolReconciliation | undefined;
  return row ?? { pool_allocated: 0, computed_payout: 0, paid_out: 0, remaining: 0, utilization_pct: 0, over_pool: false };
}

export interface VisibleSettlement {
  member_id: string;
  level_amount: number;
  rank_amount: number;
  share_amount: number;
  total_amount: number;
  status: string;
  relation: "self" | "placement" | "referral";
}

// 마케터 시점 수당 조회: 본인 + 하위(후원/직추)만. 상위(업라인) 수당은 절대 노출 안 됨.
export async function getVisibleSettlements(viewerId: string, cycle: string): Promise<VisibleSettlement[]> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("visible_settlements", { p_viewer: viewerId, p_cycle: cycle });
  if (error) throw error;
  return (data ?? []) as VisibleSettlement[];
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
  const month = fmtMonth(new Date("2026-06-15"));
  const inMonth = (p: unknown) => typeof p === "string" && p.startsWith(month);

  let total = 0, monthTotal = 0;
  let monthSub = 0, monthAnnual = 0, monthSubCount = 0, monthAnnualCount = 0;
  for (const r of subs.data ?? []) {
    const amt = Number(r.amount_usd);
    total += amt;
    if (inMonth(r.paid_at)) { monthTotal += amt; monthSub += amt; monthSubCount++; }
  }
  for (const r of annual.data ?? []) {
    const amt = Number(r.amount_usd);
    total += amt;
    if (inMonth(r.paid_at)) { monthTotal += amt; monthAnnual += amt; monthAnnualCount++; }
  }
  return {
    total,
    monthTotal,
    monthSub,
    monthAnnual,
    monthSubCount,
    monthAnnualCount,
    subCount: subs.data?.length ?? 0,
    annualCount: annual.data?.length ?? 0,
  };
}

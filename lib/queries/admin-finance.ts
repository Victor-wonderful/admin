import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { currentCycle, today, toSeoulDate } from "@/lib/dates";
import { toUid } from "@/lib/uid";

// 관리자 재무 화면(구독·주문 / 트랜잭션 / 지갑잔액 / 매출현황) 실데이터 조회.
// 결제는 전부 회원 지갑 잔액 차감(수탁 원장)이라 "결제 네트워크"는 없다. 온체인 네트워크는 입금·출금에만 있다.

const maskEmail = (e: string | null) => {
  if (!e) return "—";
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}•••@${d ?? ""}`;
};
const prevCycle = (c: string) => {
  const [y, m] = c.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// ───────────────────────── 구독·주문 ─────────────────────────
export type OrderItemType = "subscription" | "membership" | "product";
export interface OrderRow {
  id: string;
  member_id: string;
  uid: string;
  email: string; // 마스킹
  item: string;
  itemType: OrderItemType;
  amount: number;
  status: "active" | "expired" | "completed" | "pending" | "failed" | "refunded";
  paid_at: string; // ISO
  date: string; // 서울 YYYY-MM-DD
  period: string | null;
}
export interface OrderStats {
  todayAmount: number; todayCount: number;
  monthAmount: number; monthCount: number; prevMonthAmount: number;
  totalAmount: number;
  activeSubs: number;
  renewSoon: { sub: number; membership: number };
  counts: Record<"all" | OrderItemType, number>;
}

export async function listOrders(limit = 500): Promise<{ rows: OrderRow[]; stats: OrderStats }> {
  const sb = getServerClient();
  const t = today();
  const cyc = currentCycle();
  const [subs, anns, purs, members] = await Promise.all([
    sb.from("subscriptions").select("id, member_id, amount_usd, period_start, period_end, paid_at, status").order("paid_at", { ascending: false }),
    sb.from("annual_memberships").select("id, member_id, amount_usd, period_start, period_end, paid_at").order("paid_at", { ascending: false }),
    sb.from("product_purchases").select("id, member_id, amount_usd, product_name, period_start, period_end, paid_at, status").order("paid_at", { ascending: false }),
    sb.from("members").select("id, email"),
  ]);
  const email = new Map(((members.data ?? []) as Array<{ id: string; email: string | null }>).map((m) => [m.id, m.email]));
  const rows: OrderRow[] = [];
  for (const s of (subs.data ?? []) as Array<{ id: string; member_id: string; amount_usd: number; period_start: string; period_end: string; paid_at: string; status: string }>) {
    const active = s.status === "active" && s.period_start <= t && t <= s.period_end;
    rows.push({ id: s.id, member_id: s.member_id, uid: toUid(s.member_id), email: maskEmail(email.get(s.member_id) ?? null), item: "포르투나 구독", itemType: "subscription", amount: Number(s.amount_usd), status: active ? "active" : "expired", paid_at: s.paid_at, date: toSeoulDate(s.paid_at), period: `${s.period_start} ~ ${s.period_end}` });
  }
  for (const a of (anns.data ?? []) as Array<{ id: string; member_id: string; amount_usd: number; period_start: string; period_end: string; paid_at: string }>) {
    const active = a.period_start <= t && t <= a.period_end;
    rows.push({ id: a.id, member_id: a.member_id, uid: toUid(a.member_id), email: maskEmail(email.get(a.member_id) ?? null), item: "파트너 멤버십", itemType: "membership", amount: Number(a.amount_usd), status: active ? "active" : "expired", paid_at: a.paid_at, date: toSeoulDate(a.paid_at), period: `${a.period_start} ~ ${a.period_end}` });
  }
  for (const p of (purs.data ?? []) as Array<{ id: string; member_id: string; amount_usd: number; product_name: string; period_start: string | null; period_end: string | null; paid_at: string; status: string }>) {
    const st = p.status === "completed" ? "completed" : p.status === "refunded" ? "refunded" : p.status === "failed" ? "failed" : "pending";
    rows.push({ id: p.id, member_id: p.member_id, uid: toUid(p.member_id), email: maskEmail(email.get(p.member_id) ?? null), item: p.product_name, itemType: "product", amount: Number(p.amount_usd), status: st, paid_at: p.paid_at, date: toSeoulDate(p.paid_at), period: p.period_start && p.period_end ? `${p.period_start} ~ ${p.period_end}` : null });
  }
  rows.sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1));

  const stats: OrderStats = { todayAmount: 0, todayCount: 0, monthAmount: 0, monthCount: 0, prevMonthAmount: 0, totalAmount: 0, activeSubs: 0, renewSoon: { sub: 0, membership: 0 }, counts: { all: rows.length, subscription: 0, membership: 0, product: 0 } };
  const pc = prevCycle(cyc);
  for (const r of rows) {
    stats.counts[r.itemType] += 1;
    if (r.status === "refunded" || r.status === "failed") continue;
    stats.totalAmount += r.amount;
    const c = r.date.slice(0, 7);
    if (r.date === t) { stats.todayAmount += r.amount; stats.todayCount += 1; }
    if (c === cyc) { stats.monthAmount += r.amount; stats.monthCount += 1; }
    if (c === pc) stats.prevMonthAmount += r.amount;
  }
  // 활성 구독 = 회원 단위(중복 제거), 갱신 임박 = 7일 내 종료 구독 / 30일 내 종료 멤버십
  const soon = (end: string, days: number) => { const d = (Date.parse(end + "T00:00:00Z") - Date.parse(t + "T00:00:00Z")) / 86400000; return d >= 0 && d <= days; };
  const activeMembers = new Set<string>();
  for (const s of (subs.data ?? []) as Array<{ member_id: string; period_start: string; period_end: string; status: string }>) {
    if (s.status === "active" && s.period_start <= t && t <= s.period_end) { activeMembers.add(s.member_id); if (soon(s.period_end, 7)) stats.renewSoon.sub += 1; }
  }
  for (const a of (anns.data ?? []) as Array<{ period_start: string; period_end: string }>) if (a.period_start <= t && t <= a.period_end && soon(a.period_end, 30)) stats.renewSoon.membership += 1;
  stats.activeSubs = activeMembers.size;
  return { rows: rows.slice(0, limit), stats };
}

// ───────────────────────── 트랜잭션 ─────────────────────────
export interface AdminTx {
  id: string;
  member_id: string | null;
  uid: string;
  tx_type: "deposit" | "payment" | "withdrawal" | "commission";
  amount_usd: number; // 부호 없음
  fee_usd: number;
  network: string | null; // 입금/출금: 체인, 결제: 결제 종류 라벨, 리워드: 라벨
  tx_hash: string | null;
  status: string;
  created_at: string;
}
export interface TxStats {
  todayCount: number; todayDeposit: number; todayWithdrawal: number;
  monthVolume: number; monthCount: number;
  totalVolume: number; totalCount: number;
  avgFee: number;
  problem: number; // 실패·대기
  counts: Record<"all" | AdminTx["tx_type"] | "problem", number>;
}
export async function listAdminTransactions(limit = 500): Promise<{ rows: AdminTx[]; stats: TxStats }> {
  const sb = getServerClient();
  const { data, error } = await sb.from("wallet_transactions").select("id, member_id, tx_type, amount_usd, fee_usd, network, tx_hash, status, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = ((data ?? []) as Array<{ id: string; member_id: string | null; tx_type: AdminTx["tx_type"]; amount_usd: number; fee_usd: number | null; network: string | null; tx_hash: string | null; status: string; created_at: string }>).map((r) => ({
    id: r.id, member_id: r.member_id, uid: toUid(r.member_id), tx_type: r.tx_type, amount_usd: Number(r.amount_usd), fee_usd: Number(r.fee_usd ?? 0), network: r.network, tx_hash: r.tx_hash, status: r.status, created_at: r.created_at,
  }));
  const t = today(); const cyc = currentCycle();
  const stats: TxStats = { todayCount: 0, todayDeposit: 0, todayWithdrawal: 0, monthVolume: 0, monthCount: 0, totalVolume: 0, totalCount: rows.length, avgFee: 0, problem: 0, counts: { all: rows.length, deposit: 0, payment: 0, withdrawal: 0, commission: 0, problem: 0 } };
  let feeSum = 0, feeN = 0;
  for (const r of rows) {
    stats.counts[r.tx_type] += 1;
    const isProblem = r.status === "failed" || r.status === "pending" || r.status === "sending";
    if (isProblem) { stats.problem += 1; stats.counts.problem += 1; }
    const d = toSeoulDate(r.created_at);
    if (r.status !== "failed") {
      stats.totalVolume += r.amount_usd;
      if (d.slice(0, 7) === cyc) { stats.monthVolume += r.amount_usd; stats.monthCount += 1; }
      if (d === t) { stats.todayCount += 1; if (r.tx_type === "deposit") stats.todayDeposit += 1; if (r.tx_type === "withdrawal") stats.todayWithdrawal += 1; }
    }
    if (r.tx_type === "withdrawal" && r.fee_usd > 0) { feeSum += r.fee_usd; feeN += 1; }
  }
  stats.avgFee = feeN ? feeSum / feeN : 0;
  return { rows: rows.slice(0, limit), stats };
}

// ───────────────────────── 지갑잔액 ─────────────────────────
export interface WalletOverview {
  custody: number; // 원장 기준 회사 보유 추정 = 누적 입금(완료) − 누적 출금(완료)
  memberLiability: number; // 회원 지갑 잔액 합계(부채)
  memberCount: number;
  monthDeposit: number; monthWithdrawal: number;
  byNetwork: Array<{ network: string; deposit: number; withdrawal: number }>;
  daily: Array<{ date: string; deposit: number; withdrawal: number }>; // 최근 14일
  pendingWithdrawal: number; // 홀드 중(pending/approved/sending)
}
export async function getWalletOverview(): Promise<WalletOverview> {
  const sb = getServerClient();
  const [tx, wallets, wds] = await Promise.all([
    sb.from("wallet_transactions").select("tx_type, amount_usd, fee_usd, network, status, created_at").in("tx_type", ["deposit", "withdrawal"]),
    sb.from("wallets").select("balance_usd"),
    sb.from("withdrawals").select("amount_usd, fee_usd, status"),
  ]);
  const cyc = currentCycle();
  const o: WalletOverview = { custody: 0, memberLiability: 0, memberCount: 0, monthDeposit: 0, monthWithdrawal: 0, byNetwork: [], daily: [], pendingWithdrawal: 0 };
  const net = new Map<string, { deposit: number; withdrawal: number }>();
  const days: string[] = []; const end = Date.parse(today() + "T00:00:00Z");
  for (let i = 13; i >= 0; i--) days.push(new Date(end - i * 86400000).toISOString().slice(0, 10));
  const daily = new Map(days.map((d) => [d, { date: d, deposit: 0, withdrawal: 0 }]));
  for (const r of (tx.data ?? []) as Array<{ tx_type: string; amount_usd: number; fee_usd: number | null; network: string | null; status: string; created_at: string }>) {
    if (r.status !== "completed") continue;
    const amt = Number(r.amount_usd); const d = toSeoulDate(r.created_at);
    const key = (r.network ?? "—").toUpperCase() === "BSC" ? "BEP20" : (r.network ?? "—");
    const n = net.get(key) ?? { deposit: 0, withdrawal: 0 };
    if (r.tx_type === "deposit") { o.custody += amt; n.deposit += amt; if (d.slice(0, 7) === cyc) o.monthDeposit += amt; const dd = daily.get(d); if (dd) dd.deposit += amt; }
    else { const out = amt + Number(r.fee_usd ?? 0); o.custody -= out; n.withdrawal += out; if (d.slice(0, 7) === cyc) o.monthWithdrawal += out; const dd = daily.get(d); if (dd) dd.withdrawal += out; }
    net.set(key, n);
  }
  for (const w of (wallets.data ?? []) as Array<{ balance_usd: number }>) { o.memberLiability += Number(w.balance_usd); o.memberCount += 1; }
  for (const w of (wds.data ?? []) as Array<{ amount_usd: number; fee_usd: number; status: string }>) if (["pending", "approved", "sending"].includes(w.status)) o.pendingWithdrawal += Number(w.amount_usd) + Number(w.fee_usd);
  o.byNetwork = [...net.entries()].map(([network, v]) => ({ network, ...v })).sort((a, b) => b.deposit - a.deposit);
  o.daily = days.map((d) => daily.get(d)!);
  return o;
}

// ───────────────────────── 매출현황 ─────────────────────────
export interface RevenueExtras {
  todayAmount: number; todayCount: number;
  prevMonthTotal: number;
  monthProduct: number; monthProductCount: number;
  trend: Array<{ cycle: string; sub: number; membership: number; product: number }>; // 최근 12사이클(오래된 순)
  renewals: number; expiredNoRenew: number; renewRate: number | null; churnRate: number | null;
}
export async function getRevenueExtras(): Promise<RevenueExtras> {
  const sb = getServerClient();
  const [subs, anns, purs] = await Promise.all([
    sb.from("subscriptions").select("member_id, amount_usd, paid_at, period_start, period_end, status").order("paid_at", { ascending: true }),
    sb.from("annual_memberships").select("amount_usd, paid_at"),
    sb.from("product_purchases").select("amount_usd, paid_at, status"),
  ]);
  const t = today(); const cyc = currentCycle(); const pc = prevCycle(cyc);
  const cycles: string[] = []; { let c = cyc; for (let i = 0; i < 12; i++) { cycles.unshift(c); c = prevCycle(c); } }
  const trend = new Map(cycles.map((c) => [c, { cycle: c, sub: 0, membership: 0, product: 0 }]));
  const x: RevenueExtras = { todayAmount: 0, todayCount: 0, prevMonthTotal: 0, monthProduct: 0, monthProductCount: 0, trend: [], renewals: 0, expiredNoRenew: 0, renewRate: null, churnRate: null };
  const add = (iso: string, amt: number, k: "sub" | "membership" | "product") => {
    const d = toSeoulDate(iso); const c = d.slice(0, 7);
    if (d === t) { x.todayAmount += amt; x.todayCount += 1; }
    if (c === pc) x.prevMonthTotal += amt;
    const tr = trend.get(c); if (tr) tr[k] += amt;
  };
  const firstPaid = new Map<string, string>();
  for (const s of (subs.data ?? []) as Array<{ member_id: string; amount_usd: number; paid_at: string; period_end: string; status: string }>) {
    add(s.paid_at, Number(s.amount_usd), "sub");
    const c = toSeoulDate(s.paid_at).slice(0, 7);
    if (!firstPaid.has(s.member_id)) firstPaid.set(s.member_id, s.paid_at);
    else if (c === cyc) x.renewals += 1; // 이전 결제가 있는 회원의 이번 달 결제 = 갱신
  }
  // 이번 달에 종료됐는데 그 뒤 결제가 없는 회원 = 이탈
  const latestEnd = new Map<string, { end: string; status: string }>();
  for (const s of (subs.data ?? []) as Array<{ member_id: string; period_end: string; status: string }>) latestEnd.set(s.member_id, { end: s.period_end, status: s.status });
  let expiringThisMonth = 0;
  for (const [, v] of latestEnd) {
    if (v.end.slice(0, 7) === cyc && v.end < t) { expiringThisMonth += 1; x.expiredNoRenew += 1; }
  }
  const base = x.renewals + expiringThisMonth;
  x.renewRate = base > 0 ? (x.renewals / base) * 100 : null;
  x.churnRate = base > 0 ? (x.expiredNoRenew / base) * 100 : null;
  for (const a of (anns.data ?? []) as Array<{ amount_usd: number; paid_at: string }>) add(a.paid_at, Number(a.amount_usd), "membership");
  for (const p of (purs.data ?? []) as Array<{ amount_usd: number; paid_at: string; status: string }>) {
    if (p.status === "refunded" || p.status === "failed") continue;
    add(p.paid_at, Number(p.amount_usd), "product");
    if (toSeoulDate(p.paid_at).slice(0, 7) === cyc) { x.monthProduct += Number(p.amount_usd); x.monthProductCount += 1; }
  }
  x.trend = cycles.map((c) => trend.get(c)!);
  return x;
}

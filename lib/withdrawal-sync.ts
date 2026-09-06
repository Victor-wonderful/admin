import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { fetchBscUsdtOutgoing, fetchTronUsdtOutgoing, getNetworkConfigs, type ChainTransfer } from "@/lib/chain/usdt";
import type { ChainNetwork } from "@/lib/chain/explorer";
import { audit } from "@/lib/audit";

// 출금 자동 완료(2026-09-06 Victor 결정): 관리자가 '송금 시작' 후 지갑 앱에서 보내면, 크론이 회사 주소에서 나간 USDT 전송을 읽어
// '송금 중' 출금 건과 (네트워크, 받는 주소, 금액) 이 일치하는 것을 찾아 tx_hash 를 채우고 '완료'로 바꾼다. 수동 입력도 그대로 가능.
// 규칙: 같은 tx_hash 는 한 번만 사용 · 금액은 소수 6자리까지 정확히 일치 · 후보가 여럿이면 먼저 신청한 건부터.
// 조회 범위: Tron = 가장 오래된 '송금 중' 신청 시각 - 1시간부터 · BSC = 노드가 주는 최근 구간(≈1시간).

export type WithdrawalSyncResult = { network: ChainNetwork; skipped: string | null; error: string | null; sending: number; fetched: number; completed: number };

type SendingRow = { id: string; member_id: string; amount_usd: number; to_address: string; network: string; requested_at: string };

const sameAddress = (network: ChainNetwork, a: string, b: string) => (network === "BEP20" ? a.toLowerCase() === b.toLowerCase() : a === b);
const sameAmount = (a: number, b: number) => Math.abs(a - b) < 0.000001;

export async function syncWithdrawalsFromChain(): Promise<WithdrawalSyncResult[]> {
  const sb = getServerClient();
  const results: WithdrawalSyncResult[] = [];

  for (const cfg of getNetworkConfigs()) {
    const r: WithdrawalSyncResult = { network: cfg.network, skipped: null, error: null, sending: 0, fetched: 0, completed: 0 };
    results.push(r);
    if (!cfg.ready) { r.skipped = `미설정: ${cfg.missing.join(", ")}`; continue; }

    const { data: rows, error: qErr } = await sb
      .from("withdrawals")
      .select("id, member_id, amount_usd, to_address, network, requested_at")
      .eq("status", "sending")
      .eq("network", cfg.network)
      .order("requested_at", { ascending: true });
    if (qErr) { r.error = qErr.message; continue; }
    const sending = (rows ?? []) as SendingRow[];
    r.sending = sending.length;
    if (sending.length === 0) { r.skipped = "송금 중 건 없음"; continue; }

    let transfers: ChainTransfer[] = [];
    try {
      if (cfg.network === "TRC20") {
        const oldest = Math.min(...sending.map((w) => new Date(w.requested_at).getTime()));
        transfers = await fetchTronUsdtOutgoing(cfg.address!, cfg.apiKey!, oldest - 60 * 60 * 1000);
      } else {
        transfers = await fetchBscUsdtOutgoing(cfg.address!, cfg.apiKey!, 0);
      }
    } catch (e) {
      r.error = e instanceof Error ? e.message : String(e);
      console.warn(`[withdrawal-sync] ${cfg.network} 조회 실패:`, r.error);
      continue;
    }
    r.fetched = transfers.length;
    console.info(`[withdrawal-sync] ${cfg.network} 송금 중 ${sending.length}건 · 체인 나간 전송 ${transfers.length}건` + (transfers[0] ? ` · 최근 ${transfers[transfers.length - 1].amount} USDT → ${transfers[transfers.length - 1].to.slice(0, 8)}…` : ""));
    if (transfers.length === 0) continue;

    // 이미 다른 출금에 쓰인 해시는 제외
    const { data: used } = await sb.from("withdrawals").select("tx_hash").in("tx_hash", transfers.map((t) => t.txHash));
    const usedHashes = new Set(((used ?? []) as Array<{ tx_hash: string | null }>).map((u) => u.tx_hash).filter((h): h is string => !!h));

    const done = new Set<string>();
    for (const t of transfers) {
      if (usedHashes.has(t.txHash)) continue;
      const w = sending.find((x) => !done.has(x.id) && sameAddress(cfg.network, x.to_address, t.to) && sameAmount(Number(x.amount_usd), t.amount));
      if (!w) { console.info(`[withdrawal-sync] ${cfg.network} 불일치: tx ${t.txHash.slice(0, 10)}… ${t.amount} USDT → ${t.to} (송금 중 건과 주소·금액 불일치)`); continue; }
      const { error } = await sb.rpc("transition_withdrawal", { p_id: w.id, p_to: "completed", p_tx_hash: t.txHash });
      if (error) { r.error = error.message; console.warn(`[withdrawal-sync] ${cfg.network} 완료 처리 실패:`, error.message); continue; }
      done.add(w.id);
      r.completed += 1;
      console.info(`[withdrawal-sync] ${cfg.network} 출금 자동 완료 · $${Number(w.amount_usd)} → ${w.to_address} · tx ${t.txHash.slice(0, 12)}…`);
      await audit({ category: "finance", action: "withdrawal_complete", target: `출금 $${Number(w.amount_usd).toLocaleString()} ${cfg.network} · 체인에서 송금 확인(자동) · tx ${t.txHash.slice(0, 10)}…`, targetId: w.id, actor: null });
    }
  }
  return results;
}

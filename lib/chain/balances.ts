import "server-only";

import type { ChainNetwork } from "@/lib/chain/explorer";
import { getNetworkConfigs, USDT_CONTRACT } from "@/lib/chain/usdt";
import { parseRpcUrls } from "@/lib/chain/bsc-rpc";

// 회사 입금 주소의 실제 체인 USDT 잔액. 대시보드 "어드민 지갑 잔액"·출금 화면 "출금 가능 잔액"에 쓴다.
// system_wallets.operating 은 원장상 숫자일 뿐 체인과 자동 동기화되지 않으므로, 설정된 네트워크가 있으면 체인 값을 우선한다.
// 60초 인메모리 캐시(서버리스 인스턴스별). 조회 실패는 null 로 두고 화면에서 "조회 실패"로 표시.

export type OnchainBalance = { network: ChainNetwork; address: string | null; usdt: number | null; error: string | null };

const TTL_MS = 60 * 1000;
let cache: { at: number; data: OnchainBalance[] } | null = null;

async function tronUsdt(address: string, apiKey: string): Promise<number> {
  const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, {
    headers: { "TRON-PRO-API-KEY": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) throw new Error(`TronGrid HTTP ${res.status}`);
  const json = (await res.json()) as { data?: Array<{ trc20?: Array<Record<string, string>> }> };
  const acct = json.data?.[0];
  if (!acct) return 0; // 아직 활성화되지 않은 계정(거래 없음)
  for (const entry of acct.trc20 ?? []) {
    const raw = entry[USDT_CONTRACT.TRC20];
    if (raw != null) return Number(raw) / 1e6;
  }
  return 0;
}

async function bscUsdt(address: string, rpcUrls: string[]): Promise<number> {
  const data = "0x70a08231" + address.toLowerCase().replace(/^0x/, "").padStart(64, "0"); // balanceOf(address)
  let lastErr = "";
  for (const url of rpcUrls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: USDT_CONTRACT.BEP20, data }, "latest"] }),
        cache: "no-store",
        signal: AbortSignal.timeout(6_000),
      });
      const json = (await res.json()) as { result?: string; error?: { message?: string } };
      if (json.error || !json.result) { lastErr = json.error?.message ?? "empty"; continue; }
      return Number(BigInt(json.result)) / 1e18;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`BSC RPC balanceOf 실패: ${lastErr}`);
}

export async function getCompanyOnchainBalances(): Promise<OnchainBalance[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
  const out: OnchainBalance[] = [];
  for (const cfg of getNetworkConfigs()) {
    const row: OnchainBalance = { network: cfg.network, address: cfg.address, usdt: null, error: null };
    out.push(row);
    if (!cfg.ready) { row.error = "미설정"; continue; }
    try {
      row.usdt = cfg.network === "TRC20" ? await tronUsdt(cfg.address!, cfg.apiKey!) : await bscUsdt(cfg.address!, parseRpcUrls(cfg.apiKey));
    } catch (e) {
      row.error = e instanceof Error ? e.message : String(e);
      console.warn(`[onchain-balance] ${cfg.network} 조회 실패:`, row.error);
    }
  }
  cache = { at: Date.now(), data: out };
  return out;
}

/** 설정된 네트워크의 체인 잔액 합. 설정된 네트워크가 하나도 없으면 null(→ 원장 값으로 폴백). */
export function sumOnchain(rows: OnchainBalance[]): number | null {
  const ready = rows.filter((r) => r.usdt != null);
  if (ready.length === 0) return null;
  return ready.reduce((a, r) => a + (r.usdt ?? 0), 0);
}

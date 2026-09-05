import "server-only";

import type { ChainNetwork } from "@/lib/chain/explorer";

// 회사 입금 주소로 들어온 USDT 전송 조회 — Tron(TronGrid) / BSC(BscScan, Etherscan V2 API).
// 키·주소는 환경변수로만 관리한다(Victor 가 .env.local 에 직접 기입):
//   TRONGRID_API_KEY, BSCSCAN_API_KEY, COMPANY_DEPOSIT_ADDRESS_TRC20, COMPANY_DEPOSIT_ADDRESS_BEP20
// 어느 하나라도 없으면 해당 네트워크는 "미설정"으로 건너뛴다(오류 아님).

export const USDT_CONTRACT: Record<ChainNetwork, string> = {
  TRC20: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", // Tether USD (Tron), 6 decimals
  BEP20: "0x55d398326f99059fF775485246999027B3197955", // Binance-Peg USDT (BSC), 18 decimals
};
const USDT_DECIMALS: Record<ChainNetwork, number> = { TRC20: 6, BEP20: 18 };

export type ChainTransfer = {
  network: ChainNetwork;
  txHash: string;
  from: string;
  to: string;
  amount: number; // USDT
  blockTime: Date;
  blockNumber: number | null;
};

export type NetworkConfig = { network: ChainNetwork; address: string | null; apiKey: string | null; ready: boolean; missing: string[] };

export function getNetworkConfigs(): NetworkConfig[] {
  const mk = (network: ChainNetwork, addrKey: string, keyKey: string): NetworkConfig => {
    const address = process.env[addrKey]?.trim() || null;
    const apiKey = process.env[keyKey]?.trim() || null;
    const missing = [!address ? addrKey : null, !apiKey ? keyKey : null].filter((x): x is string => !!x);
    return { network, address, apiKey, ready: missing.length === 0, missing };
  };
  return [mk("TRC20", "COMPANY_DEPOSIT_ADDRESS_TRC20", "TRONGRID_API_KEY"), mk("BEP20", "COMPANY_DEPOSIT_ADDRESS_BEP20", "BSCSCAN_API_KEY")];
}

// 정수 문자열(최소 단위) → USDT 수량. 부동소수 오차를 피하려고 문자열로 자른다.
function fromUnits(raw: string, decimals: number): number {
  const s = raw.replace(/^0+/, "") || "0";
  const int = s.length > decimals ? s.slice(0, s.length - decimals) : "0";
  const frac = s.length > decimals ? s.slice(s.length - decimals) : s.padStart(decimals, "0");
  return Number(`${int}.${frac.slice(0, 6)}`); // 소수 6자리까지(원장 numeric(18,6))
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url.split("?")[0]}`);
  return res.json();
}

// Tron: 계정으로 들어온 TRC20 USDT 전송(성공 건만). sinceMs 이후, 시간 오름차순.
export async function fetchTronUsdtDeposits(address: string, apiKey: string, sinceMs: number, limit = 200): Promise<ChainTransfer[]> {
  const q = new URLSearchParams({
    only_to: "true",
    only_confirmed: "true",
    contract_address: USDT_CONTRACT.TRC20,
    min_timestamp: String(Math.max(0, sinceMs)),
    order_by: "block_timestamp,asc",
    limit: String(limit),
  });
  const json = (await getJson(`https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?${q}`, { "TRON-PRO-API-KEY": apiKey })) as {
    success?: boolean;
    data?: Array<{ transaction_id: string; from: string; to: string; value: string; block_timestamp: number; type?: string; token_info?: { address?: string } }>;
    error?: string;
  };
  if (json.success === false) throw new Error(json.error ?? "TronGrid 오류");
  return (json.data ?? [])
    .filter((t) => t.type === "Transfer" && (t.token_info?.address ?? USDT_CONTRACT.TRC20) === USDT_CONTRACT.TRC20)
    .map((t) => ({
      network: "TRC20" as const,
      txHash: t.transaction_id,
      from: t.from,
      to: t.to,
      amount: fromUnits(t.value, USDT_DECIMALS.TRC20),
      blockTime: new Date(t.block_timestamp),
      blockNumber: null,
    }))
    .filter((t) => t.amount > 0);
}

// BSC: Etherscan V2(chainid=56) tokentx — BscScan 단독 엔드포인트가 V2 로 통합됐다. 키는 Etherscan 계정 키.
export async function fetchBscUsdtDeposits(address: string, apiKey: string, startBlock: number, limit = 200): Promise<ChainTransfer[]> {
  const q = new URLSearchParams({
    chainid: "56",
    module: "account",
    action: "tokentx",
    contractaddress: USDT_CONTRACT.BEP20,
    address,
    startblock: String(Math.max(0, startBlock)),
    endblock: "99999999",
    page: "1",
    offset: String(limit),
    sort: "asc",
    apikey: apiKey,
  });
  const json = (await getJson(`https://api.etherscan.io/v2/api?${q}`)) as {
    status: string;
    message: string;
    result: Array<{ hash: string; from: string; to: string; value: string; timeStamp: string; blockNumber: string; contractAddress: string }> | string;
  };
  if (typeof json.result === "string") {
    if (/no transactions found/i.test(json.message ?? "") || /no transactions/i.test(json.result)) return [];
    throw new Error(`BscScan 오류: ${json.result}`);
  }
  const me = address.toLowerCase();
  return json.result
    .filter((t) => t.to.toLowerCase() === me && t.contractAddress.toLowerCase() === USDT_CONTRACT.BEP20.toLowerCase())
    .map((t) => ({
      network: "BEP20" as const,
      txHash: t.hash,
      from: t.from,
      to: t.to,
      amount: fromUnits(t.value, USDT_DECIMALS.BEP20),
      blockTime: new Date(Number(t.timeStamp) * 1000),
      blockNumber: Number(t.blockNumber),
    }))
    .filter((t) => t.amount > 0);
}

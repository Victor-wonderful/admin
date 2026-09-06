import "server-only";

import type { ChainNetwork } from "@/lib/chain/explorer";
import { fetchBscUsdtTransfers, parseRpcUrls } from "@/lib/chain/bsc-rpc";

// 회사 입금 주소로 들어온 USDT 전송 조회 — Tron(TronGrid API) / BSC(공개 JSON-RPC, lib/chain/bsc-rpc.ts).
// 키·주소는 환경변수로만 관리한다(운영은 Vercel, 로컬은 .env.local):
//   TRONGRID_API_KEY + COMPANY_DEPOSIT_ADDRESS_TRC20 / COMPANY_DEPOSIT_ADDRESS_BEP20 (+ 선택 BSC_RPC_URLS 콤마 구분)
// BSC 는 API 키가 필요 없다(Etherscan V2 무료 플랜이 BSC 를 지원하지 않아 2026-09 RPC 로 전환).
// 필수값이 없으면 해당 네트워크는 "미설정"으로 건너뛴다(오류 아님).

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
  const trAddr = process.env.COMPANY_DEPOSIT_ADDRESS_TRC20?.trim() || null;
  const trKey = process.env.TRONGRID_API_KEY?.trim() || null;
  const trMissing = [!trAddr ? "COMPANY_DEPOSIT_ADDRESS_TRC20" : null, !trKey ? "TRONGRID_API_KEY" : null].filter((x): x is string => !!x);
  const bscAddr = process.env.COMPANY_DEPOSIT_ADDRESS_BEP20?.trim() || null;
  const bscMissing = !bscAddr ? ["COMPANY_DEPOSIT_ADDRESS_BEP20"] : [];
  return [
    { network: "TRC20", address: trAddr, apiKey: trKey, ready: trMissing.length === 0, missing: trMissing },
    // BEP20: apiKey 자리에 RPC 주소 목록(콤마 구분)을 담는다. 키 불필요.
    { network: "BEP20", address: bscAddr, apiKey: parseRpcUrls(process.env.BSC_RPC_URLS).join(","), ready: bscMissing.length === 0, missing: bscMissing },
  ];
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
  return fetchTronUsdtTransfers(address, apiKey, sinceMs, "in", limit);
}

// Tron: 계정에서 나간 TRC20 USDT 전송(출금 자동 완료 확인용).
export async function fetchTronUsdtOutgoing(address: string, apiKey: string, sinceMs: number, limit = 200): Promise<ChainTransfer[]> {
  return fetchTronUsdtTransfers(address, apiKey, sinceMs, "out", limit);
}

async function fetchTronUsdtTransfers(address: string, apiKey: string, sinceMs: number, direction: "in" | "out", limit: number): Promise<ChainTransfer[]> {
  const q = new URLSearchParams({
    [direction === "in" ? "only_to" : "only_from"]: "true",
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

// BSC: 공개 RPC 에서 USDT Transfer 로그를 읽는다(startBlock<=0 이면 첫 실행 → 최근 구간만).
// scannedTo 는 이번에 읽은 마지막 확정 블록 — 전송이 0건이어도 커서를 여기까지 전진시킨다.
export async function fetchBscUsdtDeposits(
  address: string,
  rpcUrls: string,
  startBlock: number,
): Promise<{ transfers: ChainTransfer[]; scannedTo: number; skippedBlocks: number; fromBlock: number; latest: number }> {
  const r = await fetchBscUsdtTransfers(address, parseRpcUrls(rpcUrls), startBlock);
  const transfers = r.transfers
    .map((t) => ({
      network: "BEP20" as const,
      txHash: t.txHash,
      from: t.from,
      to: t.to,
      amount: fromUnits(t.amountUnits, USDT_DECIMALS.BEP20),
      blockTime: t.blockTime,
      blockNumber: t.blockNumber,
    }))
    .filter((t) => t.amount > 0);
  return { transfers, scannedTo: r.scannedTo, skippedBlocks: r.skippedBlocks, fromBlock: r.fromBlock, latest: r.latest };
}

// BSC: 회사 주소에서 나간 USDT 전송(출금 자동 완료 확인용). 노드 보관 범위(≈1시간) 안만 조회.
export async function fetchBscUsdtOutgoing(address: string, rpcUrls: string, startBlock: number): Promise<ChainTransfer[]> {
  const r = await fetchBscUsdtTransfers(address, parseRpcUrls(rpcUrls), startBlock, "out");
  return r.transfers
    .map((t) => ({ network: "BEP20" as const, txHash: t.txHash, from: t.from, to: t.to, amount: fromUnits(t.amountUnits, USDT_DECIMALS.BEP20), blockTime: t.blockTime, blockNumber: t.blockNumber }))
    .filter((t) => t.amount > 0);
}

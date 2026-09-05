// 체인 탐색기 링크·tx_hash 형식 검사 — 서버/클라이언트 공용(순수 함수).
// 회사가 지원하는 네트워크는 Tron(TRC20)·BSC(BEP20) 둘뿐(2026-09-04 결정).

export type ChainNetwork = "TRC20" | "BEP20";

export const NETWORK_LABEL: Record<ChainNetwork, string> = { TRC20: "Tron (TRC20)", BEP20: "BSC (BEP20)" };

// 구 데이터의 "BSC" 표기를 BEP20 으로 정규화. 지원하지 않는 값은 null.
export function normalizeNetwork(n: string | null | undefined): ChainNetwork | null {
  const v = (n ?? "").trim().toUpperCase();
  if (v === "TRC20" || v === "TRON") return "TRC20";
  if (v === "BEP20" || v === "BSC") return "BEP20";
  return null;
}

// 트랜잭션 해시 형식: Tron = 64 hex(0x 없음), BSC = 0x + 64 hex
export function isValidTxHash(network: string | null | undefined, hash: string): boolean {
  const h = hash.trim();
  const net = normalizeNetwork(network);
  if (net === "TRC20") return /^[0-9a-fA-F]{64}$/.test(h);
  if (net === "BEP20") return /^0x[0-9a-fA-F]{64}$/.test(h);
  return h.length >= 32;
}

export function txExplorerUrl(network: string | null | undefined, hash: string | null | undefined): string | null {
  if (!hash) return null;
  const net = normalizeNetwork(network);
  if (net === "TRC20") return `https://tronscan.org/#/transaction/${hash}`;
  if (net === "BEP20") return `https://bscscan.com/tx/${hash}`;
  return null;
}

export function addressExplorerUrl(network: string | null | undefined, address: string | null | undefined): string | null {
  if (!address) return null;
  const net = normalizeNetwork(network);
  if (net === "TRC20") return `https://tronscan.org/#/address/${address}`;
  if (net === "BEP20") return `https://bscscan.com/address/${address}`;
  return null;
}

export function shortHash(h: string): string {
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-6)}` : h;
}

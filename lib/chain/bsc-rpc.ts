// BSC(BNB Smart Chain) USDT 입금 조회 — 공개 JSON-RPC 노드에서 Transfer 로그를 직접 읽는다.
// 배경: Etherscan V2 무료 플랜은 BSC 를 지원하지 않아(2026-09 확인) API 키 방식 대신 RPC 로 전환.
// 노드 제약(PublicNode 기준): eth_getLogs 는 최근 약 1만 블록(≈75분)까지만, 한 번에 5천 블록 안팎.
// 그래서 "마지막으로 본 블록" 커서를 저장해 두고 매번 그 뒤만 읽는다. 크론이 1시간 넘게 멈추면
// 그 사이 구간은 노드가 안 주므로 건너뛰고 경고를 남긴다(그 입금은 관리자 수동 처리).
// 이 파일은 순수 fetch 만 쓴다(server-only 없음) → 스크립트로 단독 테스트 가능.

export const BSC_USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"; // Binance-Peg USDT, 18 decimals
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"; // Transfer(address,address,uint256)

export const BSC_DEFAULT_RPC_URLS = ["https://bsc-rpc.publicnode.com", "https://bsc.drpc.org"];
const CONFIRMATIONS = 15; // 이 블록 수만큼 지난 것만 확정으로 본다
const CHUNK_BLOCKS = 4000; // eth_getLogs 한 번의 범위
const MAX_CHUNKS_PER_RUN = 3; // 한 실행에서 최대 3구간(≈12,000 블록, 노드 한계 안)
export const BSC_INITIAL_LOOKBACK_BLOCKS = 4000; // 커서가 없을 때(첫 실행) 최근 4천 블록(≈30분)만
const MAX_HISTORY_BLOCKS = 9000; // 노드가 서비스하는 과거 깊이(초과분은 건너뜀)

export type BscTransfer = { txHash: string; from: string; to: string; amountUnits: string; blockNumber: number; blockTime: Date };
export type BscScanResult = { transfers: BscTransfer[]; fromBlock: number; scannedTo: number; latest: number; skippedBlocks: number };

type RpcLog = { transactionHash: string; topics: string[]; data: string; blockNumber: string; removed?: boolean };

async function rpcCall(urls: string[], method: string, params: unknown[]): Promise<unknown> {
  let lastErr = "";
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) { lastErr = `HTTP ${res.status} (${url})`; continue; }
      const json = (await res.json()) as { result?: unknown; error?: { message?: string } };
      if (json.error) { lastErr = `${json.error.message ?? "rpc error"} (${url})`; continue; }
      return json.result;
    } catch (e) {
      lastErr = `${e instanceof Error ? e.message : String(e)} (${url})`;
    }
  }
  throw new Error(`BSC RPC ${method} 실패: ${lastErr}`);
}

const hex = (n: number) => "0x" + n.toString(16);
const padAddress = (a: string) => "0x" + a.toLowerCase().replace(/^0x/, "").padStart(64, "0");
const topicToAddress = (t: string) => "0x" + t.slice(-40);

export function parseRpcUrls(raw: string | undefined | null): string[] {
  const list = (raw ?? "").split(",").map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
  return list.length > 0 ? list : BSC_DEFAULT_RPC_URLS;
}

/** 회사 주소로 들어온 USDT 전송을 [startBlock, 확정 최신 블록] 범위에서 읽는다. startBlock<=0 이면 첫 실행. */
export async function fetchBscUsdtTransfers(address: string, rpcUrls: string[], startBlock: number): Promise<BscScanResult> {
  const latest = parseInt(String(await rpcCall(rpcUrls, "eth_blockNumber", [])), 16);
  if (!Number.isFinite(latest) || latest <= 0) throw new Error("BSC RPC eth_blockNumber 응답 이상");
  const safe = latest - CONFIRMATIONS;

  let from = startBlock > 0 ? startBlock : safe - BSC_INITIAL_LOOKBACK_BLOCKS;
  let skippedBlocks = 0;
  if (safe - from > MAX_HISTORY_BLOCKS) {
    skippedBlocks = safe - MAX_HISTORY_BLOCKS - from;
    from = safe - MAX_HISTORY_BLOCKS;
  }
  if (from > safe) return { transfers: [], fromBlock: from, scannedTo: startBlock > 0 ? startBlock : safe, latest, skippedBlocks };

  const me = padAddress(address);
  const logs: RpcLog[] = [];
  let cursor = from;
  let scannedTo = from - 1;
  for (let i = 0; i < MAX_CHUNKS_PER_RUN && cursor <= safe; i++) {
    const to = Math.min(cursor + CHUNK_BLOCKS - 1, safe);
    const part = (await rpcCall(rpcUrls, "eth_getLogs", [
      { address: BSC_USDT_CONTRACT, topics: [TRANSFER_TOPIC, null, me], fromBlock: hex(cursor), toBlock: hex(to) },
    ])) as RpcLog[];
    logs.push(...(part ?? []));
    scannedTo = to;
    cursor = to + 1;
  }

  // 블록 시각: 로그가 있는 블록만 조회(보통 0~2개)
  const blockTimes = new Map<number, Date>();
  for (const bn of new Set(logs.map((l) => parseInt(l.blockNumber, 16)))) {
    const b = (await rpcCall(rpcUrls, "eth_getBlockByNumber", [hex(bn), false])) as { timestamp: string } | null;
    blockTimes.set(bn, b?.timestamp ? new Date(parseInt(b.timestamp, 16) * 1000) : new Date());
  }

  const transfers: BscTransfer[] = logs
    .filter((l) => !l.removed && l.topics?.length === 3)
    .map((l) => {
      const bn = parseInt(l.blockNumber, 16);
      return {
        txHash: l.transactionHash,
        from: topicToAddress(l.topics[1]),
        to: topicToAddress(l.topics[2]),
        amountUnits: BigInt(l.data).toString(),
        blockNumber: bn,
        blockTime: blockTimes.get(bn) ?? new Date(),
      };
    })
    .filter((t) => t.to.toLowerCase() === address.toLowerCase() && t.amountUnits !== "0")
    .sort((a, b) => a.blockNumber - b.blockNumber);

  return { transfers, fromBlock: from, scannedTo, latest, skippedBlocks };
}

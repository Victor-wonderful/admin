import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { fetchBscUsdtDeposits, fetchTronUsdtDeposits, getNetworkConfigs, type ChainTransfer } from "@/lib/chain/usdt";
import { lastRpcServedBy } from "@/lib/chain/bsc-rpc";
import type { ChainNetwork } from "@/lib/chain/explorer";

// 입금 스캔 한 바퀴 — 네트워크별로: 커서 이후 전송 조회 → 원장 등록(멱등) → 보낸 주소로 회원 자동 매칭 → 매칭된 건 잔액 반영 → 커서 전진.
// 크론(/api/cron/deposits)과 관리자 "지금 스캔" 버튼이 같은 함수를 부른다.
// 키·주소가 없는 네트워크는 skipped 로 보고하고 넘어간다(개발 환경에서 오류 없이 동작).

export type NetworkScanResult = {
  network: ChainNetwork;
  skipped: string | null; // 미설정 사유
  error: string | null;
  fetched: number;
  inserted: number;
  credited: number;
  unmatched: number;
};

const OVERLAP_MS = 5 * 60 * 1000; // 커서를 5분 겹쳐 조회(체인 인덱서 지연 대비). 중복은 tx_hash unique 로 흡수.
const INITIAL_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000; // 커서 없을 때 최근 7일(Tron)
const BSC_OVERLAP_BLOCKS = 2000; // BSC 커서를 2,000블록(≈15분) 겹쳐 다시 읽는다(노드 색인 지연 대비, 중복은 tx_hash unique)

export async function scanDeposits(): Promise<NetworkScanResult[]> {
  const sb = getServerClient();
  const results: NetworkScanResult[] = [];

  for (const cfg of getNetworkConfigs()) {
    const r: NetworkScanResult = { network: cfg.network, skipped: null, error: null, fetched: 0, inserted: 0, credited: 0, unmatched: 0 };
    results.push(r);
    if (!cfg.ready) {
      r.skipped = `미설정: ${cfg.missing.join(", ")}`;
      continue;
    }

    const { data: st } = await sb.from("deposit_scan_state").select("last_block_time, last_block").eq("network", cfg.network).maybeSingle();
    const state = (st ?? null) as { last_block_time: string | null; last_block: number | null } | null;

    let transfers: ChainTransfer[] = [];
    let bscScannedTo: number | null = null; // BEP20: 전송 0건이어도 커서를 여기까지 전진
    try {
      if (cfg.network === "TRC20") {
        const since = state?.last_block_time ? new Date(state.last_block_time).getTime() - OVERLAP_MS : Date.now() - INITIAL_LOOKBACK_MS;
        transfers = await fetchTronUsdtDeposits(cfg.address!, cfg.apiKey!, since);
      } else {
        const start = state?.last_block ? Math.max(0, Number(state.last_block) - BSC_OVERLAP_BLOCKS) : 0;
        const res = await fetchBscUsdtDeposits(cfg.address!, cfg.apiKey!, start);
        transfers = res.transfers;
        bscScannedTo = res.scannedTo;
        console.info(`[deposit-scan] BEP20 범위 커서=${state?.last_block ?? "없음"} 시작=${start} 조회=${res.fromBlock}~${res.scannedTo} 최신=${res.latest} 노드=${lastRpcServedBy()}`);
        if (res.skippedBlocks > 0) console.warn(`[deposit-scan] BEP20 노드 보관 범위를 넘어 ${res.skippedBlocks} 블록 건너뜀(크론 장기 중단) — 그 구간 입금은 수동 처리`);
      }
    } catch (e) {
      r.error = e instanceof Error ? e.message : String(e);
      console.warn(`[deposit-scan] ${cfg.network} 조회 실패:`, r.error);
      await sb.from("deposit_scan_state").upsert({ network: cfg.network, last_run_at: new Date().toISOString(), last_error: r.error });
      continue;
    }
    r.fetched = transfers.length;

    let maxTime = state?.last_block_time ? new Date(state.last_block_time) : null;
    let maxBlock = state?.last_block ? Number(state.last_block) : null;

    for (const t of transfers) {
      const { data: id, error } = await sb.rpc("upsert_onchain_deposit", {
        p_network: t.network,
        p_tx_hash: t.txHash,
        p_from: t.from,
        p_to: t.to,
        p_amount: t.amount,
        p_block_time: t.blockTime.toISOString(),
      });
      if (error) {
        r.error = error.message;
        break;
      }
      const { data: row } = await sb.from("onchain_deposits").select("status, member_id, credited_at").eq("id", id as string).single();
      const d = row as { status: string; member_id: string | null; credited_at: string | null } | null;
      if (d && d.status === "unmatched" && !d.credited_at) {
        // 방금 등록됐거나 아직 미처리인 건. 자동 매칭된 회원이 있으면 바로 반영.
        if (d.member_id) {
          const { error: cErr } = await sb.rpc("credit_onchain_deposit", { p_id: id, p_member: null });
          if (cErr) r.error = cErr.message;
          else r.credited += 1;
        } else {
          r.unmatched += 1;
        }
      }
      r.inserted += 1;
      if (!maxTime || t.blockTime > maxTime) maxTime = t.blockTime;
      if (t.blockNumber != null && (maxBlock == null || t.blockNumber > maxBlock)) maxBlock = t.blockNumber;
    }

    if (bscScannedTo != null && (maxBlock == null || bscScannedTo > maxBlock)) maxBlock = bscScannedTo;

    await sb.from("deposit_scan_state").upsert({
      network: cfg.network,
      last_block_time: maxTime ? maxTime.toISOString() : null,
      last_block: maxBlock,
      last_run_at: new Date().toISOString(),
      last_error: r.error,
      seen_count: r.fetched,
    });
    console.info(`[deposit-scan] ${cfg.network} 조회 ${r.fetched}건 · 신규 ${r.inserted} · 반영 ${r.credited} · 미확인 ${r.unmatched}`);
  }

  return results;
}

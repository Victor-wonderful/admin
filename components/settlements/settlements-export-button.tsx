"use client";

import { DownloadIcon } from "lucide-react";

import { downloadCsv } from "@/lib/csv";

// 마케터별 정산 CSV 내보내기 — 화면에 표시된 행(필터 적용 후)을 그대로 내려받는다.
export type SettlementCsvRow = { uid: string; name: string; rank: string; level: number; rankAmt: number; share: number; total: number; status: string };

export function SettlementsExportButton({ cycle, rows }: { cycle: string; rows: SettlementCsvRow[] }) {
  const exportCsv = () =>
    downloadCsv(
      `settlements-${cycle}.csv`,
      ["사이클", "회원 UID", "이름", "직급", "직접추천(USDT)", "직급(USDT)", "공유(USDT)", "합계(USDT)", "상태"],
      rows.map((r) => [cycle, r.uid, r.name, r.rank, r.level, r.rankAmt, r.share, r.total, r.status]),
    );
  return (
    <button type="button" onClick={exportCsv} disabled={rows.length === 0} className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border disabled:opacity-50">
      <DownloadIcon className="size-4" /> 내보내기
    </button>
  );
}

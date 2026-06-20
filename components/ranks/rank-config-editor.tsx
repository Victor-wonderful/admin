"use client";

import * as React from "react";
import { SaveIcon, RotateCcwIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { updateRanks, type RankConfigInput } from "@/lib/actions/ranks";
import type { RankRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const COLS = "grid-cols-[80px_96px_120px_110px_96px_92px]";

function rankBadge(n: number): string {
  if (n <= 2) return "bg-n-100 text-n-500";
  if (n <= 4) return "bg-green-50 text-green-700";
  if (n <= 6) return "bg-info-soft text-info";
  if (n === 7) return "bg-warning-soft text-warning";
  if (n === 8) return "bg-crypto-soft text-crypto";
  return "bg-negative-soft text-negative";
}

// 숫자 입력(빈값 허용 → null). null 은 '—' placeholder.
function NumCell({
  value,
  onChange,
  unit,
  w = "w-12",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  unit: string;
  w?: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-card px-2 py-1.5 ring-1 ring-border-strong">
      <input
        value={value ?? ""}
        placeholder="—"
        inputMode="decimal"
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9.]/g, "");
          onChange(t === "" ? null : Number(t));
        }}
        className={cn("bg-transparent text-right text-sm font-bold tabular-nums text-text-primary outline-none placeholder:text-text-tertiary", w)}
      />
      <span className="text-[11px] text-text-tertiary">{unit}</span>
    </span>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn("flex h-6 w-11 items-center rounded-full px-0.5 transition-colors", on ? "bg-crypto" : "bg-n-300")}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
    </button>
  );
}

export function RankConfigEditor({ initial }: { initial: RankRow[] }) {
  const base = React.useMemo(() => initial.map((r) => ({ ...r })), [initial]);
  const [rows, setRows] = React.useState<RankRow[]>(base);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const dirty = JSON.stringify(rows) !== JSON.stringify(base);

  const patch = (rank: number, k: keyof RankRow, v: number | null | boolean) =>
    setRows((rs) => rs.map((r) => (r.rank === rank ? { ...r, [k]: v } : r)));

  const reset = () => {
    setRows(base.map((r) => ({ ...r })));
    setErr(null);
    setSaved(false);
  };

  const save = () =>
    start(async () => {
      setErr(null);
      try {
        const payload: RankConfigInput[] = rows.map((r) => ({
          rank: r.rank,
          rate_pct: Number(r.rate_pct) || 0,
          min_total: r.min_total,
          min_direct: r.min_direct,
          override_rate: r.override_rate,
          requires_30pct: r.requires_30pct,
        }));
        await updateRanks(payload);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "저장 실패");
      }
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px]">
          <span className={cn("size-2 rounded-full", dirty ? "bg-warning" : "bg-green-500")} />
          <span className="font-semibold text-text-primary">{dirty ? "미저장 변경 있음" : "저장됨"}</span>
          <span className="text-text-tertiary">직급 기준을 바꾸면 다음 정산부터 이 값으로 산정됩니다</span>
        </div>
        <div className="flex items-center gap-2">
          {saved ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-positive"><CheckIcon className="size-3.5" /> 저장 완료</span> : null}
          <button
            type="button"
            onClick={reset}
            disabled={!dirty || pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-50"
          >
            <RotateCcwIcon className="size-3.5" /> 되돌리기
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
            변경사항 저장
          </button>
        </div>
      </div>

      {err ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div> : null}

      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
            <span>직급</span>
            <span className="text-right">직급요율</span>
            <span className="text-right">총 구독회원</span>
            <span className="text-right">직추 대체</span>
            <span className="text-right">공유요율</span>
            <span className="text-right">30% 게이트</span>
          </div>
          {rows.map((r) => (
            <div key={r.rank} className={cn("grid items-center gap-3 border-b py-2.5 last:border-0", COLS)}>
              <span className={cn("inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[12px] font-bold", rankBadge(r.rank))}>{r.rank}직급</span>
              <span className="flex justify-end"><NumCell value={r.rate_pct} unit="%" w="w-10" onChange={(v) => patch(r.rank, "rate_pct", v ?? 0)} /></span>
              <span className="flex justify-end"><NumCell value={r.min_total} unit="명" w="w-14" onChange={(v) => patch(r.rank, "min_total", v)} /></span>
              <span className="flex justify-end"><NumCell value={r.min_direct} unit="명" w="w-10" onChange={(v) => patch(r.rank, "min_direct", v)} /></span>
              <span className="flex justify-end"><NumCell value={r.override_rate} unit="%" w="w-10" onChange={(v) => patch(r.rank, "override_rate", v)} /></span>
              <span className="flex justify-end"><Toggle on={r.requires_30pct} onClick={() => patch(r.rank, "requires_30pct", !r.requires_30pct)} /></span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-text-tertiary">
        총 구독회원 = 후원 산하 활성 구독자(추천=후원 산하 배치). 직추 대체 = 1~3직급은 직접추천 인원으로 대체 인정.
        공유요율 = 그 직급의 공유수당(override) %. <b>30% 게이트 ON</b> 직급(5직급↑)은 소실적이 전체의 30% 이상일 때만 공유수당 수령(직급·직급수당은 무관).
        빈칸(—)은 미적용.
      </p>
    </div>
  );
}

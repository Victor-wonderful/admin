"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, RotateCcwIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { updateCompSettings } from "@/lib/actions/comp-settings";
import type { CompSettings } from "@/lib/queries/comp-settings";
import { cn } from "@/lib/utils";

// 레벨(직접추천) 수당 요율 편집 — 1대·2대. 정산 엔진(run_settlement·실시간 지급)이 comp_settings 를 바로 읽는다.
// 3대 이상은 엔진 규칙상 지급 차단(변경 불가). 0% 로 두면 그 대는 지급하지 않는 것과 같다.

const ROWS = [
  { key: "level_gen1_pct" as const, n: 1, name: "레벨 1 · 직접 초대" },
  { key: "level_gen2_pct" as const, n: 2, name: "레벨 2 · 초대의 초대" },
];

export function LevelRateEditor({ initial, readOnly = false }: { initial: CompSettings; readOnly?: boolean }) {
  const router = useRouter();
  const base = React.useMemo(() => ROWS.map((r) => initial[r.key]), [initial]);
  const [raw, setRaw] = React.useState<string[]>(() => base.map(String));
  const vals = raw.map((r) => Math.min(100, Math.max(0, Number(r) || 0)));
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const dirty = vals.some((v, i) => v !== base[i]);

  const set = (i: number, text: string) => {
    const t = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 6);
    setRaw((rs) => rs.map((v, j) => (j === i ? t : v)));
    setSaved(false);
    setErr(null);
  };
  const reset = () => { setRaw(base.map(String)); setErr(null); setSaved(false); };
  const save = () => {
    if (!dirty) return setErr("변경된 값이 없습니다. 숫자를 바꾼 뒤 저장하세요.");
    start(async () => {
      setErr(null);
      const r = await updateCompSettings({ level_gen1_pct: vals[0], level_gen2_pct: vals[1] });
      if (!r.ok) return setErr(r.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
      <div className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
        <span>레벨</span><span /><span className="text-right">지급 요율</span><span className="text-right">지급 여부</span>
      </div>
      {ROWS.map((r, i) => (
        <div key={r.key} className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 border-b py-3">
          <span className="grid size-7 place-items-center rounded-md bg-green-50 text-xs font-bold text-green-700">{r.n}</span>
          <span className="text-sm font-semibold text-text-primary">{r.name}</span>
          <label className="inline-flex items-center gap-1 rounded-md bg-card px-2.5 py-1.5 ring-1 ring-border-strong focus-within:ring-2 focus-within:ring-green-500">
            <input value={raw[i]} inputMode="decimal" onChange={(e) => set(i, e.target.value)} onFocus={(e) => e.currentTarget.select()} className="w-10 bg-transparent text-right text-sm font-bold tabular-nums text-text-primary outline-none" />
            <span className="text-[11px] text-text-tertiary">%</span>
          </label>
          <span className="flex justify-end">
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", vals[i] > 0 ? "bg-green-50 text-green-700" : "bg-n-100 text-n-500")}>{vals[i] > 0 ? "지급" : "0% · 미지급"}</span>
          </span>
        </div>
      ))}
      <div className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 py-3">
        <span className="grid size-7 place-items-center rounded-md bg-n-100 text-xs font-bold text-n-400">3+</span>
        <span className="text-sm font-semibold text-text-tertiary">레벨 3 이상</span>
        <span className="text-[13px] font-medium text-text-tertiary">지급 차단</span>
        <span className="flex justify-end"><span className="rounded-full bg-n-100 px-2.5 py-1 text-[11px] font-semibold text-n-500">차단 · 엔진 규칙</span></span>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
        <div className="flex items-center gap-2 text-[13px]">
          <span className={cn("size-2 rounded-full", readOnly ? "bg-n-400" : dirty ? "bg-warning" : "bg-green-500")} />
          <span className="font-semibold text-text-primary">{readOnly ? "조회 전용" : dirty ? "미저장 변경 있음" : "저장됨"}</span>
          <span className="text-text-tertiary">{readOnly ? "현재 역할은 요율을 변경할 수 없습니다" : "저장 즉시 이후 결제의 실시간 리워드와 다음 정산에 적용됩니다"}</span>
        </div>
        <div className={cn("flex items-center gap-2", readOnly && "hidden")}>
          {saved ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-positive"><CheckIcon className="size-3.5" /> 저장 완료</span> : null}
          <button type="button" onClick={reset} disabled={!dirty || pending} className="inline-flex items-center gap-1.5 rounded-md bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-50"><RotateCcwIcon className="size-3.5" /> 되돌리기</button>
          <button type="button" onClick={save} disabled={pending} className={cn("inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50", dirty ? "bg-brand" : "bg-n-400 hover:bg-n-500")} title={!dirty ? "숫자를 바꾸면 저장할 수 있습니다" : undefined}>
            {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />} 요율 저장
          </button>
        </div>
      </div>
      {err ? <div className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div> : null}
    </fieldset>
  );
}

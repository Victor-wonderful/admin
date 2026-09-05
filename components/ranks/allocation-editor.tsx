"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, RotateCcwIcon, Loader2Icon, CheckIcon, ArrowDownIcon } from "lucide-react";

import { updateCompSettings } from "@/lib/actions/comp-settings";
import type { CompSettings } from "@/lib/queries/comp-settings";
import { cn } from "@/lib/utils";

// 매출 1차 배분 비율 편집 — 수당 풀 / 회사 수익 / 지분자 배당 / 예비비. 합계 100% 일 때만 저장.
// 저장 즉시 allocate_revenue 가 이 비율을 읽고, 당월 배분이 다시 계산된다.

type AllocKey = "alloc_commission_pct" | "alloc_company_pct" | "alloc_equity_pct" | "alloc_reserve_pct";
const NO_CHANGE_MSG = "변경된 값이 없습니다. 숫자를 바꾼 뒤 저장하세요.";
const ITEMS: { key: AllocKey; label: string; color: string; dot: string; desc: string }[] = [
  { key: "alloc_commission_pct", label: "수당 풀", color: "bg-green-500", dot: "bg-green-500", desc: "네트워크 수당 재원 · 레벨·직급·공유" },
  { key: "alloc_company_pct", label: "회사 수익", color: "bg-info", dot: "bg-info", desc: "회사 운영 이익" },
  { key: "alloc_equity_pct", label: "지분자 배당", color: "bg-crypto", dot: "bg-crypto", desc: "지분 보유자 분배" },
  { key: "alloc_reserve_pct", label: "예비비", color: "bg-n-400", dot: "bg-n-400", desc: "리스크 적립 · 미지급 대비" },
];

export function AllocationEditor({ initial, readOnly = false }: { initial: CompSettings; readOnly?: boolean }) {
  const router = useRouter();
  const base = React.useMemo(() => ITEMS.map((i) => initial[i.key]), [initial]);
  // 입력은 문자열로 보관(소수점·빈칸 입력 중 상태 허용), 숫자는 파생.
  const [raw, setRaw] = React.useState<string[]>(() => base.map(String));
  const vals = raw.map((r) => Math.min(100, Math.max(0, Number(r) || 0)));
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const sum = Math.round(vals.reduce((s, v) => s + v, 0) * 100) / 100;
  const sumOk = Math.abs(sum - 100) < 0.001;
  const dirty = vals.some((v, i) => v !== base[i]);

  const set = (i: number, text: string) => {
    const t = text.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 6);
    setRaw((rs) => rs.map((v, j) => (j === i ? t : v)));
    setSaved(false);
    setErr(null);
  };
  const reset = () => { setRaw(base.map(String)); setErr(null); setSaved(false); };
  const save = () => {
    if (!dirty) return setErr(NO_CHANGE_MSG);
    if (!sumOk) return setErr(`배분 비율 합계가 ${sum}% 입니다. 4개 합이 100% 가 되어야 저장됩니다.`);
    start(async () => {
      setErr(null);
      const payload = Object.fromEntries(ITEMS.map((it, i) => [it.key, vals[i]])) as Partial<CompSettings>;
      const r = await updateCompSettings(payload);
      if (!r.ok) return setErr(r.error);
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0">
      <div className="my-3.5 flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary">
        <ArrowDownIcon className="size-3" /> 1차 배분 — 입금액을 먼저 4개로 나눔 · 합계 100%
      </div>

      <div className="mb-4 flex h-9 overflow-hidden rounded-lg bg-n-100">
        {ITEMS.map((a, i) => (
          <div key={a.key} className={cn("flex items-center justify-center text-[12px] font-semibold text-white transition-[width]", a.color)} style={{ width: `${Math.max(0, Math.min(100, vals[i]))}%` }}>
            {vals[i] >= 18 ? `${a.label} ${vals[i]}%` : vals[i] >= 7 ? `${vals[i]}%` : ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ITEMS.map((a, i) => (
          <div key={a.key} className="rounded-lg p-4 ring-1 ring-border">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary"><span className={cn("size-2.5 rounded-full", a.dot)} /> {a.label}</div>
            <label className="mt-2.5 inline-flex items-center gap-1 rounded-md bg-card px-2.5 py-1.5 ring-1 ring-border-strong focus-within:ring-2 focus-within:ring-green-500">
              <input value={raw[i]} inputMode="decimal" onChange={(e) => set(i, e.target.value)} onFocus={(e) => e.currentTarget.select()} className="w-14 bg-transparent text-right text-[22px] leading-none font-bold tabular-nums text-text-primary outline-none disabled:text-text-secondary" />
              <span className="text-sm font-medium text-text-tertiary">%</span>
            </label>
            <div className="mt-2.5 text-[11px] text-text-tertiary">{a.desc}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5">
        <div className="flex items-center gap-2 text-[13px]">
          <span className={cn("size-2 rounded-full", readOnly ? "bg-n-400" : !sumOk ? "bg-negative" : dirty ? "bg-warning" : "bg-green-500")} />
          <span className="font-semibold text-text-primary">{readOnly ? "조회 전용" : !sumOk ? `합계 ${sum}% · 100% 가 되어야 저장됩니다` : dirty ? "미저장 변경 있음" : "저장됨"}</span>
          <span className="text-text-tertiary">{readOnly ? "현재 역할은 배분 비율을 변경할 수 없습니다" : "저장하면 당월 매출이 새 비율로 다시 배분됩니다(과거 월은 그대로)"}</span>
        </div>
        <div className={cn("flex items-center gap-2", readOnly && "hidden")}>
          {saved ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-positive"><CheckIcon className="size-3.5" /> 저장 완료</span> : null}
          <button type="button" onClick={reset} disabled={!dirty || pending} className="inline-flex items-center gap-1.5 rounded-md bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong disabled:opacity-50"><RotateCcwIcon className="size-3.5" /> 되돌리기</button>
          <button type="button" onClick={save} disabled={pending} className={cn("inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-50", dirty && sumOk ? "bg-brand" : "bg-n-400 hover:bg-n-500")} title={!dirty ? "숫자를 바꾸면 저장할 수 있습니다" : !sumOk ? "합계가 100% 여야 합니다" : undefined}>
            {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />} 배분 비율 저장
          </button>
        </div>
      </div>
      {err ? <div className="mt-3 rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{err}</div> : null}
    </fieldset>
  );
}

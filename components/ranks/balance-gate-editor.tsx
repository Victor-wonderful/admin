"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { updateCompSettings } from "@/lib/actions/comp-settings";
import { cn } from "@/lib/utils";

// 공유수당 소실적 게이트(%) — 기타 라인 활성 비중이 이 값 이상일 때만 공유(override) 수당 지급. 엔진(evaluate/run_settlement)이 comp_settings 를 읽는다.
export function BalanceGateEditor({ initial, readOnly = false }: { initial: number; readOnly?: boolean }) {
  const router = useRouter();
  const [val, setVal] = React.useState<number>(initial);
  const [pending, start] = React.useTransition();
  const [saved, setSaved] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const dirty = val !== initial;

  const save = () =>
    start(async () => {
      setErr(null);
      const r = await updateCompSettings({ balance_gate_pct: val });
      if (!r.ok) return setErr(r.error);
      setSaved(true);
      router.refresh();
    });

  return (
    <fieldset disabled={readOnly} className="m-0 mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border-0 bg-surface-muted px-4 py-3 ring-1 ring-border">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text-primary">공유수당 균형 게이트</div>
        <div className="text-[11px] text-text-tertiary">기타 라인(소실적) 활성 비중이 이 값 이상이어야 공유수당 지급 · 조직도의 &lsquo;30% 균형&rsquo; 항목이 이 기준</div>
      </div>
      <div className="flex items-center gap-2">
        <label className="inline-flex items-center gap-1 rounded-md bg-card px-2.5 py-1.5 ring-1 ring-border-strong focus-within:ring-2 focus-within:ring-green-500">
          <input value={val} inputMode="decimal" onChange={(e) => { const t = e.target.value.replace(/[^0-9.]/g, ""); setVal(t === "" ? 0 : Math.min(100, Number(t))); setSaved(false); }} className="w-10 bg-transparent text-right text-sm font-bold tabular-nums text-text-primary outline-none" />
          <span className="text-[11px] text-text-tertiary">%</span>
        </label>
        {saved ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-positive"><CheckIcon className="size-3.5" /> 저장</span> : null}
        <button type="button" onClick={save} disabled={!dirty || pending} className={cn("inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50", readOnly && "hidden")}>
          {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />} 저장
        </button>
        {err ? <span className="text-[11px] font-medium text-negative">{err}</span> : null}
      </div>
    </fieldset>
  );
}

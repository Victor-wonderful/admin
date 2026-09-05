import {
  ArrowDownToLineIcon,
  LayersIcon,
  InfoIcon,
  PlusIcon,
  CornerDownRightIcon,
  ArrowDownIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { RankToggle } from "@/components/ranks/rank-toggle";
import { RankConfigEditor } from "@/components/ranks/rank-config-editor";
import { listRanks } from "@/lib/queries/ranks";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 수당체계·직급 — Pencil 디자인(cfaJF) 1:1. 정책 설정 폼.

// 1차 배분
const ALLOCATION = [
  { label: "수당 풀", pct: 60, color: "bg-green-500", dot: "bg-green-500", desc: "네트워크 수당 재원 · 레벨·직급·공유" },
  { label: "회사 수익", pct: 20, color: "bg-info", dot: "bg-info", desc: "회사 운영 이익" },
  { label: "지분자 배당", pct: 10, color: "bg-crypto", dot: "bg-crypto", desc: "지분 보유자 분배" },
  { label: "예비비", pct: 10, color: "bg-n-400", dot: "bg-n-400", desc: "리스크 적립 · 미지급 대비" },
];

// 수당 풀 2차 세분
const POOL = [
  { label: "레벨 수당", pct: 45, color: "bg-green-500", dot: "bg-green-500", hint: "요율 1대 25% · 2대 9%" },
  { label: "직급 수당", pct: 38, color: "bg-crypto", dot: "bg-crypto", hint: "직급요율 5~53% 차액" },
  { label: "공유수당", pct: 17, color: "bg-info", dot: "bg-info", hint: "직급별 차등 누적배분" },
];

const LEVELS = [
  { n: 1, name: "레벨 1", rate: "25", on: true, muted: false },
  { n: 2, name: "레벨 2", rate: "9", on: true, muted: false },
  { n: 3, name: "레벨 3 이상", rate: null, on: false, muted: true },
];

// 값 입력 박스 (편집 가능 · uncontrolled)
function NumBox({ value, unit = "%", w = "w-8" }: { value: string; unit?: string; w?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-card px-2.5 py-1.5 ring-1 ring-border-strong">
      <input defaultValue={value} className={cn("bg-transparent text-right text-sm font-bold tabular-nums text-text-primary outline-none", w)} />
      <span className="text-[11px] text-text-tertiary">{unit}</span>
    </span>
  );
}

export default async function AdminRanksPage() {
  const ranks = await listRanks();

  return (
    <>
      <Topbar title="수당체계·직급" sub="직급 9단계 · 직급요율 5~53% · 자격 기준 · 수당 3종" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 매출 배분 구조 ── */}
        <Panel
          title="매출 배분 구조"
          sub="매출 입금 시 먼저 4개로 1차 배분 → 수당 풀(60%)은 다시 레벨·직급·공유로 2차 세분"
          action={<Pill tone="green" dot>합계 100%</Pill>}
        >
          <div className="flex items-center justify-between gap-4 rounded-lg bg-green-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-green-500 text-white"><ArrowDownToLineIcon className="size-[18px]" /></span>
              <div>
                <div className="text-[13px] font-bold text-green-700">매출 입금</div>
                <div className="text-[11px] text-green-700/70">구독료·연회비·상품대금 등 회사 지갑 유입 (USDT)</div>
              </div>
            </div>
            <span className="text-2xl font-bold tabular-nums text-green-700">100%</span>
          </div>

          <div className="my-3.5 flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary">
            <ArrowDownIcon className="size-3" /> 1차 배분 — 입금액을 먼저 크게 4개로 나눔
          </div>

          <div className="mb-4 flex h-9 overflow-hidden rounded-lg">
            {ALLOCATION.map((a) => (
              <div key={a.label} className={cn("flex items-center justify-center text-[12px] font-semibold text-white", a.color)} style={{ width: `${a.pct}%` }}>
                {a.pct >= 20 ? `${a.label} ${a.pct}%` : `${a.pct}%`}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {ALLOCATION.map((a) => (
              <div key={a.label} className="rounded-lg p-4 ring-1 ring-border">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                  <span className={cn("size-2.5 rounded-full", a.dot)} /> {a.label}
                </div>
                <div className="mt-2.5 flex items-end gap-1">
                  <span className="text-[26px] leading-none font-bold tabular-nums text-text-primary">{a.pct}</span>
                  <span className="pb-0.5 text-sm font-medium text-text-tertiary">%</span>
                </div>
                <div className="mt-2.5 text-[11px] text-text-tertiary">{a.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-lg bg-surface-muted px-4 py-3 text-[12px] text-text-secondary">
            <CornerDownRightIcon className="size-4 shrink-0 text-text-tertiary" />
            2차 세분 — 수당 풀 60%는 아래 레벨 수당 · 직급수당 · 공유수당으로 다시 나뉨
          </div>
        </Panel>

        {/* ── 수당 풀 설정 ── */}
        <Panel
          title="수당 풀 설정"
          sub="수당 풀(매출 60%)을 레벨·직급·공유 수당에 배분 · 각 수당 세부 요율은 아래에서 설정"
          action={<Pill tone="green" dot>합계 100%</Pill>}
        >
          <div className="flex items-center justify-between gap-4 rounded-lg bg-green-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-green-500 text-white"><LayersIcon className="size-[18px]" /></span>
              <div>
                <div className="text-[13px] font-bold text-green-700">수당 풀</div>
                <div className="text-[11px] text-green-700/70">전체 매출의 60% · 레벨·직급·공유 수당의 지급 재원</div>
              </div>
            </div>
            <span className="text-2xl font-bold tabular-nums text-green-700">100%</span>
          </div>

          <div className="my-3.5 flex items-center justify-center gap-1.5 text-[11px] text-text-tertiary">
            <ArrowDownIcon className="size-3" /> 풀 배분 비율 설정 — 풀을 3종에 나눔
          </div>

          <div className="mb-4 flex h-9 overflow-hidden rounded-lg">
            {POOL.map((p) => (
              <div key={p.label} className={cn("flex items-center justify-center text-[12px] font-semibold text-white", p.color)} style={{ width: `${p.pct}%` }}>
                {p.label} {p.pct}%
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {POOL.map((p) => (
              <div key={p.label} className="rounded-lg p-4 ring-1 ring-border">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                  <span className={cn("size-2.5 rounded-full", p.dot)} /> {p.label}
                </div>
                <div className="mt-2.5 flex items-end justify-between">
                  <div className="flex items-end gap-1">
                    <span className="text-[26px] leading-none font-bold tabular-nums text-text-primary">{p.pct}</span>
                    <span className="pb-0.5 text-sm font-medium text-text-tertiary">%</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-text-tertiary">{p.hint}</div>
                    <div className="text-[11px] font-medium text-text-secondary">세부 설정 ↓</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-info-soft px-4 py-3 text-[12px] leading-relaxed text-info">
            <InfoIcon className="mt-0.5 size-4 shrink-0" />
            위 비율은 &lsquo;수당 풀을 3종에 나누는 배분(예산) 설정&rsquo;입니다. 각 수당의 실제 지급 요율(레벨 1대 25%·2대 9%, 직급 차액차단, 공유 차등배분)은 아래 세부 섹션에서 따로 설정합니다 — 배분 비율과 지급 요율은 별개입니다.
          </div>
        </Panel>

        {/* ── 레벨 수당 ── */}
        <Panel
          title={<span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-md bg-green-50 text-green-700"><LayersIcon className="size-4" /></span>레벨 수당</span>}
          sub="추천 세대별 요율 · 레벨 1·2대 지급, 3 이상 차단"
        >
          <div className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
            <span>레벨</span><span /><span className="text-right">지급 요율</span><span className="text-right">지급 여부</span>
          </div>
          {LEVELS.map((l) => (
            <div key={l.n} className="grid grid-cols-[40px_1fr_auto_auto] items-center gap-3 border-b py-3.5 last:border-0">
              <span className={cn("grid size-7 place-items-center rounded-md text-xs font-bold", l.muted ? "bg-n-100 text-n-400" : "bg-green-50 text-green-700")}>{l.n}</span>
              <span className={cn("text-sm font-semibold", l.muted ? "text-text-tertiary" : "text-text-primary")}>{l.name}</span>
              <span className="flex justify-end">{l.rate ? <NumBox value={l.rate} /> : <span className="text-[13px] font-medium text-text-tertiary">지급 차단</span>}</span>
              <span className="flex justify-end"><RankToggle defaultOn={l.on} /></span>
            </div>
          ))}
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong py-2.5 text-[13px] font-medium text-text-secondary">
            <PlusIcon className="size-4" /> 레벨 추가
          </button>
        </Panel>

        {/* ── 직급 자격 기준 · 공유수당 (실DB 편집) ── */}
        <Panel
          title="직급 자격 기준 · 공유수당 (관리자 설정)"
          sub="직급=순수 카운트(30% 무관) · 30% 게이트는 공유수당에만 · 저장 즉시 정산 기준 반영"
          action={<Pill tone="crypto">단일 소스</Pill>}
        >
          <RankConfigEditor initial={ranks} />
        </Panel>
      </div>
    </>
  );
}

import {
  SaveIcon,
  RotateCcwIcon,
  ArrowDownToLineIcon,
  LayersIcon,
  InfoIcon,
  PlusIcon,
  Trash2Icon,
  ChevronDownIcon,
  CornerDownRightIcon,
  ArrowDownIcon,
  AwardIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { RankToggle } from "@/components/ranks/rank-toggle";
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

const RANKS = [
  { n: 1, rate: "5", total: null, alt: "2", gate: false },
  { n: 2, rate: "12", total: "300", alt: "50", gate: false },
  { n: 3, rate: "22", total: "600", alt: "100", gate: false },
  { n: 4, rate: "30", total: "1,500", alt: null, gate: false },
  { n: 5, rate: "36", total: "3,000", alt: null, gate: true },
  { n: 6, rate: "41", total: "7,000", alt: null, gate: true },
  { n: 7, rate: "45", total: "20,000", alt: null, gate: true },
  { n: 8, rate: "48", total: "40,000", alt: null, gate: true },
  { n: 9, rate: "53", total: "80,000", alt: null, gate: true },
];

const SHARE = [
  { n: 3, rate: "4", note: null },
  { n: 4, rate: "3", note: null },
  { n: 5, rate: "2.5", note: "전체 구독유저수 30%는 기타소실적 유지" },
  { n: 6, rate: "1.5", note: null },
  { n: 7, rate: "1", note: null },
  { n: 8, rate: "1", note: null },
  { n: 9, rate: "1", note: null },
];

// 직급 배지 색상 (티어)
function rankBadge(n: number): string {
  if (n <= 2) return "bg-n-100 text-n-500";
  if (n <= 4) return "bg-green-50 text-green-700";
  if (n <= 6) return "bg-info-soft text-info";
  if (n === 7) return "bg-warning-soft text-warning";
  if (n === 8) return "bg-crypto-soft text-crypto";
  return "bg-negative-soft text-negative";
}
function rankDot(n: number): string {
  if (n <= 2) return "bg-n-400";
  if (n <= 4) return "bg-green-500";
  if (n <= 6) return "bg-info";
  if (n === 7) return "bg-warning";
  if (n === 8) return "bg-crypto";
  return "bg-negative";
}

// 값 입력 박스 (편집 가능 · uncontrolled)
function NumBox({ value, unit = "%", w = "w-8" }: { value: string; unit?: string; w?: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-card px-2.5 py-1.5 ring-1 ring-border-strong">
      <input defaultValue={value} className={cn("bg-transparent text-right text-sm font-bold tabular-nums text-text-primary outline-none", w)} />
      <span className="text-[11px] text-text-tertiary">{unit}</span>
    </span>
  );
}

const Dash = () => <span className="text-text-tertiary">—</span>;

const RANK_COLS = "grid-cols-[88px_1fr_140px_120px_92px_40px]";

export default function AdminRanksPage() {
  return (
    <>
      <Topbar title="수당체계·직급" sub="직급 9등급 · 직급요율 5~53% · 자격 기준 · 수당 3종" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 미저장 변경 툴바 ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="size-2 rounded-full bg-warning" />
            <span className="font-semibold text-text-primary">미저장 변경 2건</span>
            <span className="text-text-tertiary">레벨 수당 · 직급 수당 · 공유수당 풀을 설정합니다</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-md bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
              <RotateCcwIcon className="size-3.5" /> 기본값 복원
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">
              <SaveIcon className="size-3.5" /> 변경사항 저장
            </button>
          </div>
        </div>

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

        {/* ── 직급 수당 ── */}
        <Panel
          title="직급 수당"
          sub="직급별 요율 · 자격 기준 · 1~3직급 레벨 1 대체 · 5직급↑ 30% 균형"
          action={<button className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong"><PlusIcon className="size-3.5" /> 직급 추가</button>}
        >
          <div className="mb-4 flex items-start gap-2.5 rounded-lg bg-green-50 px-4 py-3 text-[12px] leading-relaxed text-green-700">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-green-500 text-white"><AwardIcon className="size-3" /></span>
            <span>
              <b className="font-bold">차액(차등) 지급 — 차액차단</b><br />
              각 직급은 (본인 요율 − 직하위 직급 요율)의 차액만 수령하고 나머지는 하위 직급으로 내려갑니다. 예: 내가 9직급(53%)이고 직하위가 8직급(48%)이면 → 나는 차액 5%만 수령, 48%는 하위로. 산하에 동급자 이상이 생기면 그 레그는 차단.
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[680px]">
              <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", RANK_COLS)}>
                <span>직급</span>
                <span className="text-right">직급요율</span>
                <span className="text-right">후원 전체 활성</span>
                <span className="text-right">레벨 1 대체</span>
                <span className="text-right">30% 균형</span>
                <span />
              </div>
              {RANKS.map((r) => (
                <div key={r.n} className={cn("grid items-center gap-3 border-b py-2.5 last:border-0", RANK_COLS)}>
                  <span className={cn("inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[12px] font-bold", rankBadge(r.n))}>{r.n}직급</span>
                  <span className="flex justify-end"><NumBox value={r.rate} /></span>
                  <span className="flex justify-end">{r.total ? <NumBox value={r.total} unit="명" w="w-12" /> : <Dash />}</span>
                  <span className="flex justify-end">{r.alt ? <NumBox value={r.alt} unit="명" w="w-8" /> : <Dash />}</span>
                  <span className="flex justify-end"><RankToggle defaultOn={r.gate} /></span>
                  <span className="flex justify-end"><button className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><Trash2Icon className="size-3.5" /></button></span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
            카운팅 = 후원계보 전체 활성 구독자(is_active_subscriber). 1~3직급은 레벨 1(직접추천) 인원으로 대체 인정 · 첫 직접추천은 대실적 후원계보로 자동 지정 · 5직급 이상은 전체 구독유저수 기준 + 기타소실적 30% 이상 유지(대실적 올빵 방지) · 직급수당은 산하 동급자 이상 시 차액차단.
          </p>
        </Panel>

        {/* ── 공유수당 ── */}
        <Panel
          title="공유수당"
          sub="수당 풀에서 받는 공유수당 · 대상 직급별 차등 누적배분 (중복수령)"
          action={<Pill tone="crypto">중복 누적배분</Pill>}
        >
          <div className="grid grid-cols-[180px_1fr_40px] items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
            <span>대상직급</span><span>배분요율설명</span><span />
          </div>
          {SHARE.map((s) => (
            <div key={s.n} className="grid grid-cols-[180px_1fr_40px] items-center gap-3 border-b py-3 last:border-0">
              <button className="inline-flex w-fit items-center gap-2 rounded-md bg-card px-3 py-1.5 text-[13px] font-semibold ring-1 ring-border-strong">
                <span className={cn("size-2 rounded-full", rankDot(s.n))} />
                {s.n}직급
                <ChevronDownIcon className="size-3.5 text-text-tertiary" />
              </button>
              <span className="flex items-center gap-2.5">
                <NumBox value={s.rate} />
                <span className="h-px flex-1 bg-border" />
                {s.note ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-info-soft px-2.5 py-1 text-[11px] font-medium text-info">
                    <InfoIcon className="size-3" /> {s.note}
                  </span>
                ) : null}
              </span>
              <span className="flex justify-end"><button className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><Trash2Icon className="size-3.5" /></button></span>
            </div>
          ))}
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong py-2.5 text-[13px] font-medium text-text-secondary">
            <PlusIcon className="size-4" /> 공유 대상 직급 추가
          </button>
          <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
            공유수당 = 수당 풀에서 배정된 공유수당 몫을 위 직급별 배분요율(%)로 중복(누적) 분배. 상위 직급은 하위 직급 배분도 함께 수령(중복수령). 5직급 이상은 기타소실적 30% 유지 조건 충족 시에만 분배 대상.
          </p>
        </Panel>
      </div>
    </>
  );
}

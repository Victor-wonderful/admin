import { CopyIcon, ExternalLinkIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 지갑잔액 — Pencil 디자인(a9vh0) 1:1. 운영 지갑 · 배분 풀 · 네트워크별 보유.
const TOTAL = "$128,400";

const FLOW = [
  { k: "당월 유입 (입금)", v: "+$184,260", c: "text-positive" },
  { k: "당월 유출 (출금)", v: "−$52,910", c: "text-text-primary" },
  { k: "당월 순증", v: "+$131,350", c: "text-positive" },
];

const POOLS = [
  { name: "수당 풀", value: "$77,040", pct: 60, color: "bg-green-500", desc: "레벨·직급·공유 지급 재원" },
  { name: "회사 수익", value: "$25,680", pct: 20, color: "bg-info", desc: "운영·개발" },
  { name: "지분자 배당", value: "$12,840", pct: 10, color: "bg-crypto", desc: "투자자 분배" },
  { name: "예비비", value: "$12,840", pct: 10, color: "bg-n-400", desc: "리스크 대비" },
];

const NETS = [
  { name: "TRC20", sub: "Tron", value: "$66,770", pct: 52, color: "bg-green-500" },
  { name: "ERC20", sub: "Ethereum", value: "$33,380", pct: 26, color: "bg-info" },
  { name: "Polygon", sub: "Polygon", value: "$19,260", pct: 15, color: "bg-crypto" },
  { name: "BSC", sub: "BNB Chain", value: "$8,990", pct: 7, color: "bg-warning" },
];

// 운영 지갑 총 잔액 · 최근 14일 (USDT)
const TREND = [138, 134, 143, 149, 145, 156, 152, 160, 165, 161, 174, 178, 188, 196];
const TREND_MAX = Math.max(...TREND);

export default function AdminWalletPage() {
  return (
    <>
      <Topbar title="지갑잔액" sub="운영 지갑 · 배분 풀 · 네트워크별 보유 · USDT" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 총 잔액 + 당월 자금 흐름 ── */}
        <div className="grid gap-[18px] lg:grid-cols-[1fr_360px]">
          <div
            className="relative flex flex-col justify-between overflow-hidden rounded-xl p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]"
            style={{ background: "linear-gradient(135deg,#3fbf6f 0%,#1f9d55 55%,#147a40 100%)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[13px] font-semibold text-white/80">총 잔액 (운영 지갑)</div>
                <div className="mt-1.5 text-[42px] leading-none font-bold tabular-nums">
                  {TOTAL} <span className="text-base font-semibold text-white/75">USDT</span>
                </div>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium text-white">
                <ExternalLinkIcon className="size-3.5" /> 온체인 보기
              </button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium">
                TXkQ9m…8fA2 <CopyIcon className="size-3" />
              </span>
              <span className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium">Polygon · USDT</span>
              <span className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold">당월 순증 +$131,350</span>
            </div>
          </div>

          <Panel title="당월 자금 흐름" sub="2026년 6월">
            <div>
              {FLOW.map((f, i) => (
                <div key={f.k} className={cn("flex items-center justify-between py-3.5", i < FLOW.length - 1 && "border-b")}>
                  <span className="text-[13px] text-text-secondary">{f.k}</span>
                  <span className={cn("text-base font-bold tabular-nums", f.c)}>{f.v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── 배분 풀 잔액 ── */}
        <Panel
          title="배분 풀 잔액"
          sub="매출 배분 구조에 따른 풀별 보유"
          action={<Pill tone="green">합계 {TOTAL}</Pill>}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {POOLS.map((p) => (
              <div key={p.name} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                    <span className={cn("size-2.5 rounded-full", p.color)} /> {p.name}
                  </span>
                  <span className="text-xs font-bold text-text-tertiary">{p.pct}%</span>
                </div>
                <div className="mt-2 text-xl font-bold tabular-nums text-text-primary">{p.value}</div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-n-100">
                  <div className={cn("h-full rounded-full", p.color)} style={{ width: `${p.pct}%` }} />
                </div>
                <div className="mt-2 text-[11px] text-text-tertiary">{p.desc}</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* ── 네트워크별 보유 ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {NETS.map((n) => (
            <Panel key={n.name}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                  <span className={cn("size-2.5 rounded-full", n.color)} /> {n.name}
                </span>
                <span className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary ring-1 ring-border">{n.pct}%</span>
              </div>
              <div className="mt-2 text-[22px] font-bold tabular-nums text-text-primary">{n.value}</div>
              <div className="mt-1 text-[11px] text-text-tertiary">{n.sub}</div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-n-100">
                <div className={cn("h-full rounded-full", n.color)} style={{ width: `${n.pct}%` }} />
              </div>
            </Panel>
          ))}
        </div>

        {/* ── 잔액 추이 ── */}
        <Panel
          title="잔액 추이"
          sub="운영 지갑 총 잔액 · 최근 14일 (USDT)"
          action={<Pill tone="green" dot>현재 {TOTAL}</Pill>}
        >
          <div className="flex h-40 items-end gap-2">
            {TREND.map((h, i) => {
              const last = i === TREND.length - 1;
              return (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <div className={cn("rounded-t", last ? "bg-green-600" : "bg-green-300")} style={{ height: `${(h / TREND_MAX) * 100}%` }} />
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  WalletIcon,
  TrendingUpIcon,
  ArrowDownToLineIcon,
  ShoppingCartIcon,
  PlusIcon,
  CircleArrowUpIcon,
  HashIcon,
  CopyIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const KPIS = [
  { icon: WalletIcon, tone: "green" as const, label: "사용 가능 잔액", value: "$42,300" },
  { icon: TrendingUpIcon, tone: "green" as const, label: "당월 수당 적립", value: "+$14,200" },
  { icon: ArrowDownToLineIcon, tone: "info" as const, label: "당월 충전", value: "+$500" },
  { icon: ShoppingCartIcon, tone: "warning" as const, label: "당월 결제 차감", value: "−$320" },
];

const ACCRUAL = [44, 58, 52, 70, 64, 82, 76, 60, 90, 84, 102, 96, 118, 140];

const COMPOSITION = [
  { label: "수당 적립분", value: "$41,800" },
  { label: "충전분", value: "$500" },
];

const TABS = ["전체", "충전", "수당", "결제", "출금"];

const LEDGER = [
  { date: "06-16 14:32", type: "수당", tone: "green" as const, desc: "직급 차액 수당", amount: "+$1,120", net: "TRC20" },
  { date: "06-15 09:10", type: "충전", tone: "info" as const, desc: "USDT 입금", amount: "+$500", net: "TRC20" },
  { date: "06-12 21:40", type: "결제", tone: "warning" as const, desc: "Alpha Engine 구독", amount: "−$120", net: "잔액 차감" },
  { date: "06-10 11:02", type: "출금", tone: "neutral" as const, desc: "온체인 송금", amount: "−$5,000", net: "TRC20" },
];

export default function MarketerWalletPage() {
  return (
    <>
      <Topbar title="내 지갑" sub="충전 · 수당 · 결제 · 출금 통합 지갑" uid="AG·8F3A21" />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-[13px] font-semibold text-white/80">내 지갑 잔액</div>
            <div className="mt-1 text-[42px] leading-none font-bold tabular-nums">
              $42,300 <span className="text-base font-semibold text-white/80">USDT</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium">
              <HashIcon className="size-3" /> 출금 주소 · TXkQ9m…8fA2 <CopyIcon className="size-3" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div className="flex gap-2.5">
              <button className="inline-flex items-center gap-2 rounded-[10px] bg-white/15 px-6 py-3 text-[15px] font-bold text-white">
                <PlusIcon className="size-[18px]" /> 충전
              </button>
              <button className="inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-[15px] font-bold text-green-700">
                <CircleArrowUpIcon className="size-[18px]" /> 출금 신청
              </button>
            </div>
            <span className="text-xs font-medium text-white/80">당월 수당 +$14,200 · 당월 충전 +$500</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPIS.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_388px]">
          <Panel title="수당 적립 추이" sub="최근 14일 적립 수당 (USDT)" action={<Pill tone="green" dot>당월 +$14,200</Pill>}>
            <div className="flex h-44 items-end gap-1.5">
              {ACCRUAL.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end">
                  <div className={cn("rounded-t", i === ACCRUAL.length - 1 ? "bg-green-600" : "bg-green-300")} style={{ height: `${h * 0.7}%` }} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="충전 & 잔액 구성" sub="USDT 입금으로 잔액 충전">
            <div className="space-y-3.5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-secondary">충전 입금 주소</span>
                  <Pill tone="green" dot>USDT · TRC20</Pill>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                  <HashIcon className="size-3 text-text-tertiary" />
                  <span className="flex-1 text-xs font-medium text-text-primary">TRdep8…k29Q</span>
                  <CopyIcon className="size-3 text-text-tertiary" />
                </div>
              </div>
              <div className="space-y-3 border-t pt-3.5">
                <div className="text-xs font-semibold text-text-secondary">잔액 구성</div>
                {COMPOSITION.map((c) => (
                  <div key={c.label} className="flex items-center justify-between text-[13px]">
                    <span className="text-text-secondary">{c.label}</span>
                    <span className="font-bold text-text-primary">{c.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-2.5 text-[13px]">
                  <span className="font-semibold text-text-primary">사용 가능 잔액</span>
                  <span className="font-bold text-green-700">$42,300</span>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <Panel
          title="입출금·수당 내역"
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>
                  {t}
                </span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>일시</span><span>유형</span><span>내역</span><span>네트워크</span><span className="text-right">금액</span>
            </div>
            {LEDGER.map((r, i) => (
              <div key={i} className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{r.date}</span>
                <span><Pill tone={r.tone}>{r.type}</Pill></span>
                <span className="text-text-secondary">{r.desc}</span>
                <span className="text-xs text-text-tertiary">{r.net}</span>
                <span className={cn("text-right font-bold tabular-nums", r.amount.startsWith("+") ? "text-green-700" : "text-text-primary")}>{r.amount}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

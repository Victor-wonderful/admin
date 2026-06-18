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
import { getMemberWalletData, type LedgerEntry } from "@/lib/queries/finance";
import { ROOT_MARKETER_ID } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 수당 적립 추이는 일별 이력 데이터가 없어 정적(예시).
const ACCRUAL = [44, 58, 52, 70, 64, 82, 76, 60, 90, 84, 102, 96, 118, 140];

const TABS = ["전체", "충전", "수당", "결제", "출금"];

// USD 표기(정수 달러).
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const signed = (n: number) => (n >= 0 ? `+${usd(n)}` : `−${usd(Math.abs(n))}`);

const LEDGER_META: Record<LedgerEntry["tx_type"], { label: string; tone: "green" | "info" | "warning" | "neutral" }> = {
  commission: { label: "수당", tone: "green" },
  deposit: { label: "충전", tone: "info" },
  payment: { label: "결제", tone: "warning" },
  withdrawal: { label: "출금", tone: "neutral" },
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
};

export default async function MarketerWalletPage() {
  const { wallet, monthCommission, monthDeposit, monthPayment, totalDeposit, ledger } =
    await getMemberWalletData(ROOT_MARKETER_ID);

  const balance = wallet?.balance_usd ?? 0;
  const address = wallet?.deposit_address ?? "—";
  const network = wallet?.network ?? "TRC20";
  // 잔액 구성: 충전분 = 누적 충전(잔액 한도), 수당적립분 = 나머지.
  const chargedPart = Math.min(totalDeposit, balance);
  const accruedPart = Math.max(balance - chargedPart, 0);

  const kpis = [
    { icon: WalletIcon, tone: "green" as const, label: "사용 가능 잔액", value: usd(balance) },
    { icon: TrendingUpIcon, tone: "green" as const, label: "당월 수당 적립", value: signed(monthCommission) },
    { icon: ArrowDownToLineIcon, tone: "info" as const, label: "당월 충전", value: signed(monthDeposit) },
    { icon: ShoppingCartIcon, tone: "warning" as const, label: "당월 결제 차감", value: signed(-monthPayment) },
  ];

  return (
    <>
      <Topbar title="내 지갑" sub="충전 · 수당 · 결제 · 출금 통합 지갑" uid="AG·8F3A21" />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-[13px] font-semibold text-white/80">내 지갑 잔액</div>
            <div className="mt-1 text-[42px] leading-none font-bold tabular-nums">
              {usd(balance)} <span className="text-base font-semibold text-white/80">USDT</span>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium">
              <HashIcon className="size-3" /> 출금 주소 · {address} <CopyIcon className="size-3" />
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
            <span className="text-xs font-medium text-white/80">당월 수당 {signed(monthCommission)} · 당월 충전 {signed(monthDeposit)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_388px]">
          <Panel title="수당 적립 추이" sub="최근 14일 적립 수당 (예시)" action={<Pill tone="green" dot>당월 {signed(monthCommission)}</Pill>}>
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
                  <Pill tone="green" dot>USDT · {network}</Pill>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                  <HashIcon className="size-3 text-text-tertiary" />
                  <span className="flex-1 text-xs font-medium text-text-primary">{address}</span>
                  <CopyIcon className="size-3 text-text-tertiary" />
                </div>
              </div>
              <div className="space-y-3 border-t pt-3.5">
                <div className="text-xs font-semibold text-text-secondary">잔액 구성</div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-secondary">수당 적립분</span>
                  <span className="font-bold text-text-primary">{usd(accruedPart)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-secondary">충전분</span>
                  <span className="font-bold text-text-primary">{usd(chargedPart)}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2.5 text-[13px]">
                  <span className="font-semibold text-text-primary">사용 가능 잔액</span>
                  <span className="font-bold text-green-700">{usd(balance)}</span>
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
            {ledger.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">거래 내역이 없습니다.</div>
            ) : (
              ledger.map((r, i) => {
                const meta = LEDGER_META[r.tx_type];
                return (
                  <div key={i} className="grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                    <span className="text-text-tertiary tabular-nums">{fmtDate(r.ts)}</span>
                    <span><Pill tone={meta.tone}>{meta.label}</Pill></span>
                    <span className="text-text-secondary">{r.desc}</span>
                    <span className="text-xs text-text-tertiary">{r.network ?? "—"}</span>
                    <span className={cn("text-right font-bold tabular-nums", r.amount_usd >= 0 ? "text-green-700" : "text-text-primary")}>{signed(r.amount_usd)}</span>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  WalletIcon,
  TrendingUpIcon,
  ArrowDownToLineIcon,
  ShoppingCartIcon,
  HashIcon,
  PlusIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { WithdrawalRequestModal } from "@/components/withdrawals/withdrawal-request-modal";
import { DepositButton } from "@/components/wallet/deposit-button";
import { LedgerTable } from "@/components/wallet/ledger-table";
import { RewardTrendChart } from "@/components/wallet/reward-trend-chart";
import { getDepositNetworks } from "@/lib/deposit-config";
import { getMemberWalletData, listMemberSettlementCycles } from "@/lib/queries/finance";
import { currentCycle } from "@/lib/dates";
import { getMember } from "@/lib/queries/members";
import type { MemberRole } from "@/lib/supabase/types";
import { toUid } from "@/lib/uid";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
// -0 방지: 0 이면 항상 "+$0".
const signed = (n: number) => (n === 0 || n > 0 ? `+${usd(Math.abs(n))}` : `−${usd(Math.abs(n))}`);

// 내 지갑 — 파트너/구독회원/등록회원 공용. 리워드 관련 요소는 파트너에게만.
// 입금: 회사 입금 주소(Tron/BSC) 안내. 출금: 회원이 프로필에 등록한 본인 지갑 주소로.
export async function WalletView({ memberId, role }: { memberId: string; role: MemberRole }) {
  const isMarketer = role === "marketer";
  const [{ wallet, monthCommission, monthDeposit, monthPayment, totalDeposit, ledger }, member, cycles] = await Promise.all([
    getMemberWalletData(memberId),
    getMember(memberId),
    isMarketer ? listMemberSettlementCycles(memberId, 6) : Promise.resolve([]),
  ]);
  const networks = getDepositNetworks();
  const profileHref = isMarketer ? "/marketer/profile" : "/portal/profile";

  const balance = wallet?.balance_usd ?? 0;
  const payoutTrc20 = member?.payout_address_trc20 ?? null;
  const payoutBep20 = member?.payout_address_bep20 ?? null;
  const payout = payoutTrc20 ? { address: payoutTrc20, network: "TRC20" } : payoutBep20 ? { address: payoutBep20, network: "BEP20" } : null;

  const chargedPart = Math.min(totalDeposit, balance);
  const accruedPart = Math.max(balance - chargedPart, 0);
  const visibleLedger = isMarketer ? ledger : ledger.filter((r) => r.tx_type !== "commission");

  const kpis = isMarketer
    ? [
        { icon: WalletIcon, tone: "green" as const, label: "사용 가능 잔액", value: usd(balance) },
        { icon: TrendingUpIcon, tone: "green" as const, label: "당월 리워드 적립", value: signed(monthCommission) },
        { icon: ArrowDownToLineIcon, tone: "info" as const, label: "당월 입금", value: signed(monthDeposit) },
        { icon: ShoppingCartIcon, tone: "warning" as const, label: "당월 결제 차감", value: signed(-monthPayment) },
      ]
    : [
        { icon: WalletIcon, tone: "green" as const, label: "사용 가능 잔액", value: usd(balance) },
        { icon: ArrowDownToLineIcon, tone: "info" as const, label: "당월 입금", value: signed(monthDeposit) },
        { icon: ShoppingCartIcon, tone: "warning" as const, label: "당월 결제 차감", value: signed(-monthPayment) },
        { icon: TrendingUpIcon, tone: "info" as const, label: "누적 입금", value: usd(totalDeposit) },
      ];

  return (
    <>
      <Topbar
        title="내 지갑"
        sub={isMarketer ? "입금 · 리워드 · 결제 · 출금 통합 지갑" : "입금 · 결제 · 출금 지갑"}
        uid={toUid(memberId)}
      />

      <div className="flex-1 space-y-4 overflow-auto p-4 lg:p-7">
        <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-5 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)] lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-white/80">내 지갑 잔액</div>
            <div className="mt-1 text-[34px] leading-none font-bold tabular-nums lg:text-[42px]">
              {usd(balance)} <span className="text-base font-semibold text-white/80">USDT</span>
            </div>
            {payout ? (
              <div className="mt-3 flex max-w-full items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium lg:inline-flex">
                <HashIcon className="size-3 shrink-0" />
                <span className="shrink-0">출금 주소 · {payout.network} ·</span>
                <span className="truncate font-mono">{payout.address}</span>
              </div>
            ) : (
              <Link href={profileHref} className="mt-3 flex items-start gap-2 rounded-md bg-white/15 px-3 py-2 text-xs font-medium hover:bg-white/25 lg:inline-flex lg:items-center lg:py-1.5">
                <TriangleAlertIcon className="mt-0.5 size-3 shrink-0 lg:mt-0" /> 출금 주소 미등록 · 프로필에서 내 지갑 주소를 등록하세요
              </Link>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2.5 lg:w-auto lg:items-end">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <DepositButton
                memberId={memberId}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-5 text-sm font-bold whitespace-nowrap text-green-700 sm:h-auto sm:py-3"
              >
                <PlusIcon className="size-4" /> USDT 입금하기
              </DepositButton>
              <WithdrawalRequestModal
                memberId={memberId}
                balance={balance}
                defaultAddress={payout?.address ?? ""}
                defaultNetwork={payout?.network ?? "TRC20"}
              />
            </div>
            <span className="text-xs font-medium text-white/80 lg:text-right">
              {isMarketer ? `당월 리워드 ${signed(monthCommission)} · ` : ""}당월 입금 {signed(monthDeposit)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className={cn("grid gap-4", isMarketer && "lg:grid-cols-[1fr_388px]")}>
          {isMarketer ? (
            <Panel title="리워드 적립 추이" sub="정산 사이클(월)별 리워드 · 최근 6개월 · 유형별 누적" action={<Pill tone="green" dot>당월 {signed(monthCommission)}</Pill>}>
              <RewardTrendChart points={cycles} currentCycle={currentCycle()} />
            </Panel>
          ) : null}

          <Panel title="입금 주소 & 잔액 구성" sub="회사 입금 주소로 USDT 를 보내면 확인 후 잔액에 반영">
            <div className="space-y-3.5">
              <div className="space-y-2">
                {networks.map((n) => (
                  <div key={n.code} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">{n.label}</span>
                      <Pill tone="green" dot>USDT · {n.code}</Pill>
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                      <HashIcon className="size-3 shrink-0 text-text-tertiary" />
                      <span className={cn("flex-1 truncate font-mono text-xs", n.address ? "text-text-primary" : "text-text-tertiary")}>
                        {n.address ?? "입금 주소 준비 중"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t pt-3.5">
                <div className="text-xs font-semibold text-text-secondary">잔액 구성</div>
                {isMarketer ? (
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-text-secondary">리워드 적립분</span>
                    <span className="font-bold text-text-primary">{usd(accruedPart)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-text-secondary">입금분</span>
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

        <LedgerTable ledger={visibleLedger} showCommission={isMarketer} />
      </div>
    </>
  );
}

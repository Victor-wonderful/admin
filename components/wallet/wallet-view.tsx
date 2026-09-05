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
import { getDepositNetworks } from "@/lib/deposit-config";
import { getMemberWalletData, listMemberSettlementCycles } from "@/lib/queries/finance";
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
  const cycleMax = Math.max(1, ...cycles.map((c) => c.total));
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

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-[13px] font-semibold text-white/80">내 지갑 잔액</div>
            <div className="mt-1 text-[42px] leading-none font-bold tabular-nums">
              {usd(balance)} <span className="text-base font-semibold text-white/80">USDT</span>
            </div>
            {payout ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium">
                <HashIcon className="size-3" /> 출금 주소 · {payout.network} · {payout.address}
              </div>
            ) : (
              <Link href={profileHref} className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
                <TriangleAlertIcon className="size-3" /> 출금 주소 미등록 · 프로필에서 내 지갑 주소를 등록하세요
              </Link>
            )}
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div className="flex gap-2.5">
              <DepositButton
                memberId={memberId}
                className="inline-flex items-center gap-2 rounded-[10px] bg-white px-5 py-3 text-sm font-bold whitespace-nowrap text-green-700"
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
            <span className="text-xs font-medium text-white/80">
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
            <Panel title="리워드 적립 추이" sub="정산 사이클(월)별 리워드 · 최근 6개월" action={<Pill tone="green" dot>당월 {signed(monthCommission)}</Pill>}>
              {cycles.length === 0 ? (
                <div className="grid h-44 place-items-center text-sm text-text-tertiary">정산된 리워드가 아직 없습니다.</div>
              ) : (
                <div className="flex h-44 items-end gap-3">
                  {cycles.map((c, i) => (
                    <div key={c.cycle} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${c.cycle} · ${usd(c.total)}`}>
                      <span className="text-[11px] font-semibold tabular-nums text-text-secondary">{usd(c.total)}</span>
                      <div className={cn("w-full rounded-t", i === cycles.length - 1 ? "bg-green-600" : "bg-green-300")} style={{ height: `${Math.max(4, Math.round((c.total / cycleMax) * 80))}%` }} />
                      <span className="text-[10px] tabular-nums text-text-tertiary">{c.cycle.slice(2).replace("-", "/")}</span>
                    </div>
                  ))}
                </div>
              )}
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

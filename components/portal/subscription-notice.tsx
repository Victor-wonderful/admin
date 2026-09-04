import { TriangleAlertIcon, CreditCardIcon, PlusIcon, CalendarClockIcon } from "lucide-react";

import { LifecycleButton } from "@/components/portal/lifecycle-actions";
import { DepositButton } from "@/components/wallet/deposit-button";
import { getMemberSubscriptions } from "@/lib/queries/members";
import { getMemberWallet } from "@/lib/queries/finance";
import { getPlanPrices, getMemberAnnualMembership } from "@/lib/queries/products";
import { today, daysBetween } from "@/lib/dates";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const REMIND_DAYS = 7; // 종료 7일 전부터 잔액 부족 안내

// 구독 상태 안내 배너 — 구독회원·파트너 대시보드 공용.
//  · 만료: "구독이 만료됨" + 지금 갱신 버튼
//  · 종료 임박(7일) + 잔액 부족: 자동 결제 실패 예고 + 입금 버튼
//  · 그 외: 렌더하지 않음
export async function SubscriptionNotice({ memberId, role }: { memberId: string; role?: "subscriber" | "marketer" }) {
  const [subs, wallet, plans, annual] = await Promise.all([
    getMemberSubscriptions(memberId),
    getMemberWallet(memberId),
    getPlanPrices(),
    role === "marketer" ? getMemberAnnualMembership(memberId) : Promise.resolve(null),
  ]);
  const t = today();
  const active = subs.find((s) => s.status === "active" && s.period_start <= t && t <= s.period_end);
  const latest = subs[0] ?? null;
  const price = plans.sub; // 현재 구독 상품가(관리자 카탈로그)
  const balance = wallet?.balance_usd ?? 0;

  // 파트너 멤버십(연) 만료·임박 안내 — 구독 안내와 별도로 위에 붙는다
  const membershipDays = annual ? daysBetween(t, annual.period_end.slice(0, 10)) : null;
  const membershipNotice =
    role === "marketer" && membershipDays != null && membershipDays <= 14 ? (
      <div className={`flex items-center justify-between gap-4 rounded-xl px-5 py-4 ring-1 ${membershipDays < 0 ? "bg-negative-soft ring-negative/20" : "bg-warning-soft ring-warning/20"}`}>
        <div className="flex items-start gap-3">
          <TriangleAlertIcon className={`mt-0.5 size-5 shrink-0 ${membershipDays < 0 ? "text-negative" : "text-warning"}`} />
          <div>
            <div className="text-sm font-bold text-text-primary">
              {membershipDays < 0 ? `파트너 멤버십이 만료되었습니다 (${annual!.period_end.slice(0, 10)}) · 리워드 지급 정지 중` : `파트너 멤버십 D-${membershipDays} (${annual!.period_end.slice(0, 10)} 종료)`}
            </div>
            <div className="mt-0.5 text-xs text-text-secondary">
              {membershipDays < 0 ? "만료 기간에는 초대·등급·팀 리워드가 지급되지 않습니다. 갱신하면 다시 지급됩니다. " : "종료 후에는 리워드 지급이 정지됩니다. "}
              갱신 {usd(plans.annual)} · 잔액 {usd(balance)}
              {balance < plans.annual ? ` · ${usd(plans.annual - balance)} 부족 — 먼저 입금하세요` : " · 지금 갱신하면 1년 연장"}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {balance < plans.annual ? (
            <DepositButton memberId={memberId} className="inline-flex items-center gap-1.5 rounded-md bg-card px-4 py-2 text-[13px] font-semibold text-text-primary ring-1 ring-border-strong">
              <PlusIcon className="size-4" /> USDT 입금하기
            </DepositButton>
          ) : null}
          <LifecycleButton mode="renew_partner" memberId={memberId} amount={plans.annual} className="inline-flex items-center gap-1.5 rounded-md bg-crypto px-4 py-2 text-[13px] font-bold text-white">
            <CreditCardIcon className="size-4" /> 멤버십 갱신 · {usd(plans.annual)}
          </LifecycleButton>
        </div>
      </div>
    ) : null;

  if (!active) {
    if (!latest) return membershipNotice; // 구독 이력 없음(등록회원 등)
    return (
      <>
      {membershipNotice}
      <div className="flex items-center justify-between gap-4 rounded-xl bg-negative-soft px-5 py-4 ring-1 ring-negative/20">
        <div className="flex items-start gap-3">
          <TriangleAlertIcon className="mt-0.5 size-5 shrink-0 text-negative" />
          <div>
            <div className="text-sm font-bold text-text-primary">구독이 만료되었습니다 · 마지막 종료일 {latest.period_end.slice(0, 10)}</div>
            <div className="mt-0.5 text-xs text-text-secondary">
              포르투나 앱 이용이 중단된 상태입니다. 잔액 {usd(balance)}
              {balance < price ? ` · 갱신에 ${usd(price)} 필요 (${usd(price - balance)} 부족)` : ` · 지금 갱신하면 오늘부터 30일 이용`}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {balance < price ? (
            <DepositButton memberId={memberId} className="inline-flex items-center gap-1.5 rounded-md bg-card px-4 py-2 text-[13px] font-semibold text-text-primary ring-1 ring-border-strong">
              <PlusIcon className="size-4" /> USDT 입금하기
            </DepositButton>
          ) : null}
          <LifecycleButton mode="renew" memberId={memberId} amount={price} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-bold text-white">
            <CreditCardIcon className="size-4" /> 지금 갱신 · {usd(price)}
          </LifecycleButton>
        </div>
      </div>
      </>
    );
  }

  const dday = daysBetween(t, active.period_end.slice(0, 10));
  if (dday > REMIND_DAYS || balance >= price) return membershipNotice;

  return (
    <>
    {membershipNotice}
    <div className="flex items-center justify-between gap-4 rounded-xl bg-warning-soft px-5 py-4 ring-1 ring-warning/20">
      <div className="flex items-start gap-3">
        <CalendarClockIcon className="mt-0.5 size-5 shrink-0 text-warning" />
        <div>
          <div className="text-sm font-bold text-text-primary">
            {dday === 0 ? "오늘" : `D-${dday} (${active.period_end.slice(0, 10)})`} 구독 자동 결제 예정 · 잔액이 부족합니다
          </div>
          <div className="mt-0.5 text-xs text-text-secondary">
            종료일에 {usd(price)}가 결제됩니다. 현재 잔액 {usd(balance)} → {usd(price - balance)} 부족. 입금하지 않으면 구독이 만료됩니다.
          </div>
        </div>
      </div>
      <DepositButton memberId={memberId} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-bold text-white">
        <PlusIcon className="size-4" /> USDT 입금하기
      </DepositButton>
    </div>
    </>
  );
}

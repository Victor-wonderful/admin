import {
  CpuIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  WalletIcon,
  CircleCheckIcon,
  CreditCardIcon,
  PackageIcon,
  SparklesIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DepositButton } from "@/components/wallet/deposit-button";
import { LifecycleButton } from "@/components/portal/lifecycle-actions";
import { getMemberSubscriptions, listProducts } from "@/lib/queries/members";
import { getPlanPrices, listStoreProducts, listMemberPurchases, getMemberAnnualMembership } from "@/lib/queries/products";
import { getMember } from "@/lib/queries/members";
import { SubscriptionManageModal } from "@/components/orders/subscription-manage-modal";
import { BuyProductButton } from "@/components/orders/buy-product-button";
import { getMemberWallet } from "@/lib/queries/finance";
import type { MemberRole } from "@/lib/supabase/types";
import { toUid } from "@/lib/uid";
import { today, daysBetween } from "@/lib/dates";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
// 기준일 = 실제 오늘(Asia/Seoul).
const TODAY = today();

// 구독·주문 — 파트너/구독회원/등록회원 공용. 두 번째 카드(파트너 멤버십)는 파트너에게만, 등록회원 카드1 에는 구독 시작 버튼.
export async function OrdersView({ memberId, role }: { memberId: string; role: MemberRole }) {
  const [subs, products, wallet, store, purchases, member, annual] = await Promise.all([
    getMemberSubscriptions(memberId),
    listProducts(),
    getMemberWallet(memberId),
    listStoreProducts(),
    listMemberPurchases(memberId),
    getMember(memberId),
    getMemberAnnualMembership(memberId),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const { sub: SUB_PRICE, annual: ANNUAL, subActive, partnerActive } = await getPlanPrices(); // 관리자 상품 카탈로그 가격

  const activeSub = subs.find((s) => s.status === "active" && s.period_start <= TODAY && TODAY <= s.period_end);
  const latestSub = subs[0] ?? null;
  const subState = activeSub ? "가동 중" : role === "registered" ? "미구독" : "비활성";
  const subNext = (activeSub ?? latestSub)?.period_end?.slice(0, 10) ?? "—";
  const balance = wallet?.balance_usd ?? 0;
  const subPrice = SUB_PRICE; // 다음 결제·표시가 = 현재 상품가(마지막 결제액이 아님)
  // 파트너 멤버십 상태: 종료일까지 남은 일수(음수=만료). 종료 30일 전부터 갱신 가능.
  const membershipDays = annual ? daysBetween(TODAY, annual.period_end.slice(0, 10)) : -1;
  const canRenewMembership = role === "marketer" && partnerActive && (!annual || membershipDays <= 30);

  const UPCOMING = activeSub
    ? [{ name: "포르투나 구독", sub: `월 구독 · ${subNext}`, amount: usd(subPrice), soft: "bg-green-50 text-green-700", prog: 50, bar: "bg-green-600" }]
    : [];

  const ctaClass = "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold";

  return (
    <>
      <Topbar title="구독·주문" sub="내 구독 · 결제 내역" uid={toUid(memberId)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className={cn("grid gap-4", role !== "registered" && "lg:grid-cols-2")}>
          {/* 카드 1: 포르투나 구독 (전 등급) */}
          <Panel>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-[42px] place-items-center rounded-[12px] bg-green-50 text-green-700">
                  <CpuIcon className="size-[22px]" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-text-primary">포르투나 구독</div>
                  <div className="text-xs text-text-secondary">AI 매매 판단 체크 · 진입 전 검증</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">{role !== "registered" ? <Pill tone="neutral">Basic</Pill> : null}<Pill tone={activeSub ? "green" : "neutral"} dot={!!activeSub}>{subState}</Pill></div>
            </div>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-2xl font-bold text-text-primary">{usd(subPrice)}</span>
              <span className="pb-1 text-xs font-medium text-text-tertiary">/ 월 · USDT</span>
            </div>
            <div className="mt-3">
              {[["다음 결제일", subNext], ["결제 내역", `${subs.length}건`]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                  <span className="text-text-secondary">{k}</span>
                  <span className="font-semibold text-text-primary">{v}</span>
                </div>
              ))}
            </div>
            {role === "registered" && !subActive ? (
              <div className={cn(ctaClass, "bg-surface-muted text-text-tertiary")}>구독 판매 준비 중</div>
            ) : role === "registered" ? (
              <LifecycleButton mode="subscribe" memberId={memberId} amount={SUB_PRICE} className={cn(ctaClass, "w-full bg-brand text-white")}>
                <CreditCardIcon className="size-4" /> 구독 시작 · {usd(SUB_PRICE)}/월
              </LifecycleButton>
            ) : (
              <SubscriptionManageModal
                active={!!activeSub}
                periodStart={activeSub?.period_start.slice(0, 10) ?? latestSub?.period_start.slice(0, 10) ?? null}
                periodEnd={activeSub?.period_end.slice(0, 10) ?? latestSub?.period_end.slice(0, 10) ?? null}
                price={SUB_PRICE}
                autoRenew={member?.auto_renew ?? true}
                className={cn(ctaClass, "font-medium text-text-secondary ring-1 ring-border-strong")}
              />
            )}
          </Panel>

          {/* 카드 2: 파트너 멤버십 — 파트너에게만. 등록·구독회원 화면에는 파트너 관련 요소를 노출하지 않는다. */}
          {role === "marketer" ? (
            <Panel>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-[42px] place-items-center rounded-[12px] bg-crypto-soft text-crypto">
                    <BadgeCheckIcon className="size-[22px]" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">파트너 멤버십</div>
                    <div className="text-xs text-text-secondary">초대 리워드 자격</div>
                  </div>
                </div>
                <Pill tone={membershipDays < 0 ? "negative" : "green"} dot={membershipDays >= 0}>{membershipDays < 0 ? "만료" : "유효"}</Pill>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-2xl font-bold text-text-primary">{usd(ANNUAL)}</span>
                <span className="pb-1 text-xs font-medium text-text-tertiary">/ 년 · USDT</span>
              </div>
              <div className="mt-3">
                {[
                  ["유효기간", annual ? `${annual.period_start.slice(0, 10)} ~ ${annual.period_end.slice(0, 10)}` : "—"],
                  ["상태", !annual ? "정보 없음" : membershipDays < 0 ? `만료 (${-membershipDays}일 경과)` : membershipDays <= 30 ? `D-${membershipDays} · 갱신 가능` : `유효 · D-${membershipDays}`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                    <span className="text-text-secondary">{k}</span>
                    <span className="font-semibold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
              {canRenewMembership ? (
                <LifecycleButton mode="renew_partner" memberId={memberId} amount={ANNUAL} className={cn(ctaClass, "w-full bg-crypto text-white")}>
                  <SparklesIcon className="size-4" /> {membershipDays < 0 ? "멤버십 갱신" : "미리 갱신"} · {usd(ANNUAL)}/년
                </LifecycleButton>
              ) : (
                <div className="mt-3 rounded-md bg-surface-muted px-3 py-2.5 text-[12px] text-text-secondary ring-1 ring-border">종료 30일 전부터 이 카드에서 갱신할 수 있습니다 · 만료 전 알림 제공</div>
              )}
            </Panel>
          ) : role === "subscriber" && partnerActive ? (
            <div id="partner" className="scroll-mt-4">
            <Panel className="ring-1 ring-crypto/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-[42px] place-items-center rounded-[12px] bg-crypto-soft text-crypto">
                    <SparklesIcon className="size-[22px]" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">포르투나 파트너 멤버십</div>
                    <div className="text-xs text-text-secondary">Basic 이용 + 초대 리워드 · 파트너 대시보드</div>
                  </div>
                </div>
                <Pill tone="crypto">Pro</Pill>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-2xl font-bold text-text-primary">{usd(ANNUAL)}</span>
                <span className="pb-1 text-xs font-medium text-text-tertiary">/ 년 · Basic 구독에 추가</span>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  "초대한 친구가 구독하면 매달 25% 리워드 (2단계 9%)",
                  "파트너 전용 대시보드 · 초대 링크 · 리워드 정산 내역",
                  "팀 성과에 따른 파트너 등급 보너스",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[13px] text-text-secondary">
                    <CircleCheckIcon className="size-4 shrink-0 text-crypto" /> {b}
                  </li>
                ))}
              </ul>
              <LifecycleButton mode="upgrade" memberId={memberId} amount={ANNUAL} className={cn(ctaClass, "w-full bg-crypto text-white")}>
                <SparklesIcon className="size-4" /> 파트너 멤버십 시작 · {usd(ANNUAL)}/년
              </LifecycleButton>
              <p className="mt-2 text-center text-[11px] text-text-tertiary">초대 코드로 가입한 구독자에게 열려 있는 프로그램입니다 · 잔액에서 결제</p>
            </Panel>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_412px]">
          <Panel title="다음 결제 예정" sub="예정된 자동 결제 일정" action={<Pill tone="warning"><CalendarClockIcon className="size-3" /> {UPCOMING.length}건 예정</Pill>}>
            <div>
              {UPCOMING.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-tertiary">예정된 결제가 없습니다.</div>
              ) : UPCOMING.map((u, i) => (
                <div key={u.name} className={cn("space-y-2.5 py-3.5", i < UPCOMING.length - 1 && "border-b")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-10 place-items-center rounded-[12px]", u.soft)}>
                      <CalendarClockIcon className="size-[19px]" />
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text-primary">{u.name}</div>
                      <div className="text-xs text-text-secondary">{u.sub}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-text-primary">{u.amount}</div>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", u.bar)} style={{ width: `${u.prog}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="결제 잔액" sub="내 지갑 USDT 잔액에서 차감">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                <div>
                  <div className="text-xs text-text-secondary">내 지갑 잔액 (결제 가능)</div>
                  <div className="text-2xl font-bold text-text-primary">{usd(balance)}</div>
                </div>
                <span className="grid size-[42px] place-items-center rounded-[12px] bg-green-50 text-green-700">
                  <WalletIcon className="size-5" />
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                <CircleCheckIcon className="size-4" /> {activeSub ? `다음 결제 ${usd(subPrice)} · 내 지갑 잔액에서 차감` : `구독료 ${usd(SUB_PRICE)} · 내 지갑 잔액에서 차감`}
              </div>
              <DepositButton memberId={memberId} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-[13px] font-bold text-white">
                <WalletIcon className="size-4" /> USDT 입금하기
              </DepositButton>
            </div>
          </Panel>
        </div>

        {/* 상품 스토어 — 관리자 카탈로그(판매 중, 구독·멤버십 제외). 정산 연결은 다음 단계. */}
        {store.length > 0 || purchases.length > 0 ? (
          <div id="store" className="scroll-mt-4 space-y-4">
            {store.length > 0 ? (
              <Panel title="상품" sub="내 지갑 잔액으로 결제 · 구매 즉시 이용 안내">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {store.map((p) => (
                    <div key={p.id} className="flex flex-col rounded-lg bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
                      <div className="flex items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-info-soft text-info"><PackageIcon className="size-[19px]" /></span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-text-primary">{p.name}</div>
                          <div className="text-[11px] text-text-tertiary">{p.billing === "monthly" ? "30일 이용" : p.billing === "yearly" ? "1년 이용" : "일회성"}</div>
                        </div>
                      </div>
                      {p.description ? <p className="mt-2 text-xs leading-relaxed text-text-secondary">{p.description}</p> : null}
                      <div className="mt-3 flex items-end gap-1">
                        <span className="text-xl font-bold text-text-primary">{usd(Number(p.price_usd))}</span>
                        <span className="pb-0.5 text-xs text-text-tertiary">USDT</span>
                      </div>
                      <div className="mt-3">
                        <BuyProductButton productId={p.id} name={p.name} price={Number(p.price_usd)} className="w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
            {purchases.length > 0 ? (
              <Panel title="상품 구매 내역" sub={`건`}>
                <div>
                  <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                    <span>구매일</span><span>상품</span><span>이용 기간</span><span className="text-right">금액</span>
                  </div>
                  {purchases.map((r) => (
                    <div key={r.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                      <span className="text-text-tertiary tabular-nums">{r.paid_at.slice(0, 10)}</span>
                      <span className="font-medium text-text-primary">{r.product_name}</span>
                      <span className="text-xs text-text-secondary tabular-nums">{r.period_start ? ` ~ ` : "일회성"}</span>
                      <span className="text-right font-semibold tabular-nums text-text-primary">{usd(Number(r.amount_usd))}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}
          </div>
        ) : null}

        <div id="history" className="scroll-mt-4">
        <Panel title="결제 내역" sub={`건`}>
          <div>
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>결제일</span><span>항목</span><span>금액</span><span className="text-right">상태</span>
            </div>
            {subs.slice(0, 10).map((s) => (
              <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{s.paid_at.slice(0, 10)}</span>
                <span className="font-medium text-text-primary">{(s.product_id && productName.get(s.product_id)) || "포르투나 구독"}</span>
                <span className="font-semibold tabular-nums text-text-primary">${Number(s.amount_usd).toFixed(0)}</span>
                <span className="justify-self-end">
                  <Pill tone={s.status === "active" ? "green" : "neutral"}>{s.status === "active" ? "완료" : "만료"}</Pill>
                </span>
              </div>
            ))}
            {subs.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">결제 내역이 없습니다.</div>
            ) : null}
          </div>
        </Panel>
        </div>
      </div>
    </>
  );
}

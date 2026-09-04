import {
  CpuIcon,
  BadgeCheckIcon,
  Settings2Icon,
  CalendarClockIcon,
  WalletIcon,
  HashIcon,
  CopyIcon,
  CircleCheckIcon,
  ArrowUpRightIcon,
  CreditCardIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DepositModal } from "@/components/wallet/deposit-modal";
import { LifecycleButton, ChargeButton } from "@/components/portal/lifecycle-actions";
import { getMemberSubscriptions, listProducts } from "@/lib/queries/members";
import { getMemberWallet } from "@/lib/queries/finance";
import type { MemberRole } from "@/lib/supabase/types";
import { toUid } from "@/lib/uid";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const SUB_PRICE = 120;
const ANNUAL = 200;
// 데모 기준일(정산 사이클과 동일).
const TODAY = "2026-06-15";

// 구독·주문 — 마케터/구독회원/등록회원 공용. 등급별로 두 번째 카드(연회비/승급/구독 시작)가 달라진다.
export async function OrdersView({ memberId, role }: { memberId: string; role: MemberRole }) {
  const [subs, products, wallet] = await Promise.all([
    getMemberSubscriptions(memberId),
    listProducts(),
    getMemberWallet(memberId),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  const activeSub = subs.find((s) => s.status === "active" && s.period_start <= TODAY && TODAY <= s.period_end);
  const latestSub = subs[0] ?? null;
  const subState = activeSub ? "가동 중" : role === "registered" ? "미구독" : "비활성";
  const subNext = (activeSub ?? latestSub)?.period_end?.slice(0, 10) ?? "—";
  const balance = wallet?.balance_usd ?? 0;
  const subPrice = activeSub ? Number(activeSub.amount_usd) : SUB_PRICE;
  const address = wallet?.deposit_address ?? "—";

  const UPCOMING = activeSub
    ? [{ name: "Alpha Engine 구독", sub: `월 구독 · ${subNext}`, amount: usd(subPrice), soft: "bg-green-50 text-green-700", prog: 50, bar: "bg-green-600" }]
    : [];

  const ctaClass = "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-bold";

  return (
    <>
      <Topbar title="구독·주문" sub="내 구독 · 결제 내역" uid={toUid(memberId)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid gap-4 lg:grid-cols-2">
          {/* 카드 1: Alpha Engine 구독 (전 등급) */}
          <Panel>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-[42px] place-items-center rounded-[12px] bg-green-50 text-green-700">
                  <CpuIcon className="size-[22px]" />
                </span>
                <div>
                  <div className="text-[15px] font-semibold text-text-primary">Alpha Engine 구독</div>
                  <div className="text-xs text-text-secondary">AI 크립토 자동매매 엔진</div>
                </div>
              </div>
              <Pill tone={activeSub ? "green" : "neutral"} dot={!!activeSub}>{subState}</Pill>
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
            {role === "registered" ? (
              <LifecycleButton mode="subscribe" memberId={memberId} amount={SUB_PRICE} className={cn(ctaClass, "w-full bg-brand text-white")}>
                <CreditCardIcon className="size-4" /> 구독 시작 · {usd(SUB_PRICE)}/월
              </LifecycleButton>
            ) : (
              <button className={cn(ctaClass, "font-medium text-text-secondary ring-1 ring-border-strong")}>
                <Settings2Icon className="size-4" /> 구독 관리
              </button>
            )}
          </Panel>

          {/* 카드 2: 등급별 — 마케터: 연회비 / 구독회원: 마케터 승급 / 등록회원: 한번에 마케터 */}
          {role === "marketer" ? (
            <Panel>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-[42px] place-items-center rounded-[12px] bg-crypto-soft text-crypto">
                    <BadgeCheckIcon className="size-[22px]" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">마케터 연회비</div>
                    <div className="text-xs text-text-secondary">추천 수당 자격</div>
                  </div>
                </div>
                <Pill tone="green" dot>유효</Pill>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-2xl font-bold text-text-primary">{usd(ANNUAL)}</span>
                <span className="pb-1 text-xs font-medium text-text-tertiary">/ 년 · USDT</span>
              </div>
              <div className="mt-3">
                {[["수당 자격", "활성"], ["갱신", "연 1회"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                    <span className="text-text-secondary">{k}</span>
                    <span className="font-semibold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
              <button className={cn(ctaClass, "font-medium text-text-secondary ring-1 ring-border-strong")}>
                <Settings2Icon className="size-4" /> 갱신 관리
              </button>
            </Panel>
          ) : (
            <Panel>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid size-[42px] place-items-center rounded-[12px] bg-crypto-soft text-crypto">
                    <BadgeCheckIcon className="size-[22px]" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">
                      {role === "subscriber" ? "마케터 승급" : "한번에 마케터로 시작"}
                    </div>
                    <div className="text-xs text-text-secondary">연회비 결제 → 추천 수당 자격 · 계보도·레퍼럴 해제</div>
                  </div>
                </div>
                <Pill tone="crypto">승급</Pill>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-2xl font-bold text-text-primary">{usd(role === "subscriber" ? ANNUAL : SUB_PRICE + ANNUAL)}</span>
                <span className="pb-1 text-xs font-medium text-text-tertiary">
                  {role === "subscriber" ? "/ 년 · USDT" : "· 구독 $120 + 연회비 $200"}
                </span>
              </div>
              <div className="mt-3">
                {[["추천 코드", "승급 시 발급"], ["수당 3종", "직추 · 직급 · 공유"]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                    <span className="text-text-secondary">{k}</span>
                    <span className="font-semibold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
              <LifecycleButton
                mode={role === "subscriber" ? "upgrade" : "subscribe_upgrade"}
                memberId={memberId}
                amount={role === "subscriber" ? ANNUAL : SUB_PRICE + ANNUAL}
                className={cn(ctaClass, "w-full bg-crypto text-white")}
              >
                <ArrowUpRightIcon className="size-4" /> {role === "subscriber" ? `마케터 승급 · ${usd(ANNUAL)}` : `마케터로 바로 시작 · ${usd(SUB_PRICE + ANNUAL)}`}
              </LifecycleButton>
            </Panel>
          )}
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
              <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                <HashIcon className="size-3 text-text-tertiary" />
                <span className="flex-1 truncate text-xs font-medium text-text-primary">{address}</span>
                <CopyIcon className="size-3 text-text-tertiary" />
              </div>
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                <CircleCheckIcon className="size-4" /> {activeSub ? `다음 결제 ${usd(subPrice)} · 내 지갑 잔액에서 차감` : `구독료 ${usd(SUB_PRICE)} · 내 지갑 잔액에서 차감`}
              </div>
              {role === "marketer" ? (
                <DepositModal address={wallet?.deposit_address ?? ""} network={wallet?.network ?? "TRC20"} />
              ) : (
                <ChargeButton memberId={memberId} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-2.5 text-[13px] font-bold text-white">
                  <WalletIcon className="size-4" /> USDT 충전하기
                </ChargeButton>
              )}
            </div>
          </Panel>
        </div>

        <Panel title="결제 내역" sub={`${subs.length}건`}>
          <div>
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>결제일</span><span>항목</span><span>금액</span><span className="text-right">상태</span>
            </div>
            {subs.slice(0, 10).map((s) => (
              <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{s.paid_at.slice(0, 10)}</span>
                <span className="font-medium text-text-primary">{(s.product_id && productName.get(s.product_id)) || "Alpha Engine 구독"}</span>
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
    </>
  );
}

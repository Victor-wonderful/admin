import Link from "next/link";
import {
  CircleCheckIcon,
  CalendarClockIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  Settings2Icon,
  PlusIcon,
  ReceiptIcon,
  UserRoundIcon,
  ExternalLinkIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import type { MemberRow } from "@/lib/supabase/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DataList } from "@/components/ui/data-list";
import { DepositButton } from "@/components/wallet/deposit-button";
import { LifecycleButton } from "@/components/portal/lifecycle-actions";
import { FortunaFeatureTiles } from "@/components/portal/fortuna-feature-tiles";
import { SubscriptionNotice } from "@/components/portal/subscription-notice";
import { getMemberSubscriptions, listProducts } from "@/lib/queries/members";
import { getPlanPrices } from "@/lib/queries/products";
import { getMemberWallet } from "@/lib/queries/finance";
import { FORTUNA_APP_URL } from "@/lib/constants";
import { toUid } from "@/lib/uid";
import { today, toSeoulDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
// 기준일 = 실제 오늘(Asia/Seoul).
const TODAY = today();

const TILE = "flex items-center gap-3 rounded-lg bg-card p-4 text-left ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)] transition-colors hover:ring-green-500";

// subscriber 홈 본문 — 페이지(세션 가드)와 분리해 두면 재사용·검증이 쉽다.
export async function SubscriberHome({ member }: { member: MemberRow }) {
  const ME = member.id;
  const [wallet, subs, products] = await Promise.all([getMemberWallet(ME), getMemberSubscriptions(ME), listProducts()]);
  const productName = new Map(products.map((p) => [p.id, p.name]));
  const { sub: SUB_PRICE, partnerActive } = await getPlanPrices(); // 관리자 상품 카탈로그 가격

  const uid = toUid(ME);
  const balance = wallet?.balance_usd ?? 0;
  const activeSub = subs.find((s) => s.status === "active" && s.period_start <= TODAY && TODAY <= s.period_end);
  const nextDate = (activeSub ?? subs[0])?.period_end?.slice(0, 10) ?? "—";
  const dday = activeSub ? Math.max(0, Math.round((new Date(activeSub.period_end).getTime() - new Date(TODAY).getTime()) / 86400000)) : null;
  const paidTotal = subs.reduce((s, r) => s + Number(r.amount_usd), 0);

  const KPIS = [
    { icon: CircleCheckIcon, tone: "green" as const, label: "구독 상태", value: activeSub ? "활성" : "만료" },
    { icon: CalendarClockIcon, tone: "warning" as const, label: "다음 결제", value: dday != null ? `D-${dday}` : "—" },
    { icon: CreditCardIcon, tone: "info" as const, label: "누적 결제", value: usd(paidTotal) },
    { icon: CalendarDaysIcon, tone: "crypto" as const, label: "결제 건수", value: `${subs.length}건` },
  ];

  // 빠른 작업 — 전부 실제 페이지/동작으로 연결
  const ACTIONS = [
    { icon: Settings2Icon, tone: "bg-green-50 text-green-700", title: "구독 관리", sub: "갱신 · 해지 · 다음 결제", href: "/portal/orders" },
    { icon: ReceiptIcon, tone: "bg-crypto-soft text-crypto", title: "결제 내역", sub: `${subs.length}건`, href: "/portal/orders#history" },
    { icon: UserRoundIcon, tone: "bg-warning-soft text-warning", title: "프로필·설정", sub: "닉네임 · 비밀번호 · 지갑 주소", href: "/portal/profile" },
  ];

  return (
    <>
      <Topbar title="대시보드" sub="구독 관리 · 결제 · 지갑" uid={uid} />

      <div className="flex-1 space-y-4 overflow-auto p-4 lg:p-7">
        {/* 만료 / 잔액 부족 안내 */}
        <SubscriptionNotice memberId={ME} />

        {/* 히어로: 앱 바로가기 + 구독 관리 */}
        <div className="flex flex-col gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-5 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)] lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div className="min-w-0 space-y-2.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <span className="size-2 rounded-full bg-white" /> {activeSub ? "매매 판단 체크 이용 중" : "구독 만료"}
            </span>
            <h2 className="text-[20px] font-bold lg:text-[23px]">포르투나 매매 판단 체크 {activeSub ? "이용 중" : "정지"}</h2>
            <p className="text-sm text-white/80">
              {activeSub
                ? `이용 기간 ${activeSub.period_start.slice(0, 10)} ~ ${nextDate} · 종료일에 잔액에서 ${usd(SUB_PRICE)} 자동 결제 · 잔액 ${usd(balance)}`
                : `구독이 만료되었습니다 · 마지막 종료일 ${nextDate} · 잔액 ${usd(balance)} (갱신에 ${usd(SUB_PRICE)} 필요)`}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 lg:w-auto lg:items-end">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              {activeSub ? (
                <a
                  href={FORTUNA_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-6 text-sm font-bold whitespace-nowrap text-green-700 sm:h-auto sm:py-3 sm:text-[15px]"
                >
                  <ExternalLinkIcon className="size-4" /> 포르투나 앱 열기
                </a>
              ) : (
                <LifecycleButton
                  mode="renew"
                  memberId={ME}
                  amount={SUB_PRICE}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white px-6 text-sm font-bold whitespace-nowrap text-green-700 sm:h-auto sm:py-3 sm:text-[15px]"
                >
                  <CreditCardIcon className="size-4" /> 구독 갱신 · {usd(SUB_PRICE)}/월
                </LifecycleButton>
              )}
              <Link href="/portal/orders" className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-white/15 px-5 text-sm font-bold whitespace-nowrap text-white ring-1 ring-white/25 sm:h-auto sm:py-3 sm:text-[15px]">
                <Settings2Icon className="size-4" /> 구독 관리
              </Link>
            </div>
            <span className="text-xs font-medium text-white/80 lg:text-right">USDT 잔액 {usd(balance)} · 앱은 새 탭에서 열림</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPIS.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        {/* 빠른 작업 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href={ACTIONS[0].href} className={TILE}>
            <span className={cn("grid size-9 place-items-center rounded-[10px]", ACTIONS[0].tone)}><Settings2Icon className="size-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-text-primary">{ACTIONS[0].title}</span>
              <span className="block text-xs text-text-secondary">{ACTIONS[0].sub}</span>
            </span>
            <ChevronRightIcon className="size-4 text-text-tertiary" />
          </Link>
          <DepositButton memberId={ME} className={TILE}>
            <span className="grid size-9 place-items-center rounded-[10px] bg-info-soft text-info"><PlusIcon className="size-[18px]" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-text-primary">지갑 입금</span>
              <span className="block text-xs text-text-secondary">회사 주소로 USDT 송금</span>
            </span>
            <ChevronRightIcon className="size-4 text-text-tertiary" />
          </DepositButton>
          {ACTIONS.slice(1).map((a) => (
            <Link key={a.title} href={a.href} className={TILE}>
              <span className={cn("grid size-9 place-items-center rounded-[10px]", a.tone)}><a.icon className="size-[18px]" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-text-primary">{a.title}</span>
                <span className="block text-xs text-text-secondary">{a.sub}</span>
              </span>
              <ChevronRightIcon className="size-4 text-text-tertiary" />
            </Link>
          ))}
        </div>

        {/* 최근 결제 (실데이터) */}
        <Panel
          title="최근 결제"
          sub={`구독 결제 ${subs.length}건 · 내 지갑 잔액에서 차감`}
          action={
            <Link href="/portal/orders#history" className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline">
              전체 보기 <ChevronRightIcon className="size-3.5" />
            </Link>
          }
        >
          <DataList
            columns={[
              { key: "paid", label: "결제일", mobile: "meta", cell: (r) => <span className="text-text-tertiary tabular-nums">{toSeoulDate(r.paid_at)}</span> },
              { key: "item", label: "항목", width: "1fr", mobile: "title", cell: (r) => <span className="font-medium text-text-primary">{(r.product_id && productName.get(r.product_id)) || "포르투나 구독"}</span> },
              { key: "period", label: "이용 기간", mobile: "row", cell: (r) => <span className="text-xs text-text-secondary tabular-nums">{r.period_start.slice(0, 10)} ~ {r.period_end.slice(0, 10)}</span> },
              { key: "amount", label: "금액", mobile: "value", cell: (r) => <span className="font-semibold tabular-nums text-text-primary">${Number(r.amount_usd).toFixed(0)}</span> },
              { key: "status", label: "상태", align: "right", mobile: "meta", cell: (r) => <Pill tone={r.status === "active" ? "green" : "neutral"}>{r.status === "active" ? "이용 중" : "만료"}</Pill> },
            ]}
            rows={subs.slice(0, 5)}
            rowKey={(r) => r.id}
            empty="결제 내역이 없습니다."
          />
        </Panel>

        {/* Fortuna 앱 기능 바로가기 */}
        <FortunaFeatureTiles title="포르투나 앱에서 이용하기" sub="구독 중 이용할 수 있는 핵심 기능 · 누르면 앱이 새 탭으로 열립니다" />

        {/* 파트너 프로그램 — 절제된 한 줄 안내. 멤버십 판매 중(카탈로그)일 때만: 링크 대상 카드가 없으면 노출하지 않는다 */}
        {partnerActive ? (
        <Link href="/portal/orders#partner" className="flex items-center justify-between gap-3 rounded-lg bg-card px-4 py-3 text-[13px] ring-1 ring-border transition-colors hover:ring-crypto">
          <span className="flex items-center gap-2 text-text-secondary">
            <SparklesIcon className="size-4 text-crypto" />
            <span><b className="font-semibold text-text-primary">파트너 프로그램 알아보기</b> · 초대한 친구가 구독하면 매달 리워드 · 파트너 대시보드</span>
          </span>
          <ChevronRightIcon className="size-4 text-text-tertiary" />
        </Link>
        ) : null}
      </div>
    </>
  );
}

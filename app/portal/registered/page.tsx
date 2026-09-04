import {
  SparklesIcon,
  ExternalLinkIcon,
  CheckIcon,
  WalletIcon,
  CreditCardIcon,
  CpuIcon,
  HashIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { LifecycleButton } from "@/components/portal/lifecycle-actions";
import { DepositButton } from "@/components/wallet/deposit-button";
import { FortunaFeatureTiles } from "@/components/portal/fortuna-feature-tiles";
import { getDepositNetworks } from "@/lib/deposit-config";
import { getPlanPrices } from "@/lib/queries/products";
import { getMemberWallet } from "@/lib/queries/finance";
import { requireMember } from "@/lib/session";
import { FORTUNA_APP_URL } from "@/lib/constants";
import { toUid } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const BENEFITS = [
  "AI 리서치 · 진입·손절·목표 시나리오 생성",
  "후보 레이더 · 거래 가능/차단 판정",
  "자금 규율 점검 · 포지션 사이징",
  "거래 일지 · AI 복기 · 성과 분석",
];


export default async function RegisteredDashboardPage() {
  const me = await requireMember("registered"); // 로그인 + 역할 가드
  const ME = me.id;
  const wallet = await getMemberWallet(ME);
  const { sub: SUB_PRICE, subActive } = await getPlanPrices(); // 관리자 상품 카탈로그(bot_sub) 가격

  const uid = toUid(ME);
  const balance = wallet?.balance_usd ?? 0;
  const networks = getDepositNetworks();
  const subscribed = false; // requireMember("registered") 통과 = 아직 등록회원
  const canSubscribe = balance >= SUB_PRICE;

  // 시작 단계 상태(실데이터): 가입 done → 입금(balance>0) → 구독(role!=registered) → 이용
  const steps = [
    { label: "회원가입", sub: "추천 코드 가입", icon: CheckIcon, state: "done" as const },
    { label: "지갑 입금", sub: balance > 0 ? `${usd(balance)} 보유` : "USDT 입금", icon: WalletIcon, state: balance > 0 ? "done" : "active" },
    { label: "구독 결제", sub: `포르투나 ${usd(SUB_PRICE)}`, icon: CreditCardIcon, state: subscribed ? "done" : canSubscribe ? "active" : "pending" },
    { label: "판단 체크 시작", sub: "포르투나 앱 이용", icon: CpuIcon, state: subscribed ? "active" : "pending" },
  ] as const;
  const doneCount = steps.filter((s) => s.state === "done").length;

  return (
    <>
      <Topbar title="대시보드" sub="환영합니다 · 구독을 시작해 보세요" uid={uid} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        {/* 온보딩 히어로 */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <SparklesIcon className="size-3" /> 등록회원
            </span>
            <h2 className="text-[23px] font-bold">포르투나 플랫폼을 체험해 보세요</h2>
            <p className="max-w-xl text-sm text-white/80">
              구독 전에도 Fortuna 앱에 들어가 AI 매매 판단 기능을 직접 경험할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <a
              href={FORTUNA_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-[15px] font-bold whitespace-nowrap text-green-700"
            >
              <ExternalLinkIcon className="size-[17px]" /> 플랫폼 체험하기
            </a>
            <span className="text-xs font-medium text-white/80">Fortuna 앱 · 새 탭에서 열림</span>
          </div>
        </div>

        {/* 시작 단계 스테퍼 */}
        <Panel
          title="시작 단계"
          sub={subscribed ? "구독 완료 · 매매 판단 체크 이용 중" : "매매 판단 체크 이용까지 단계를 완료하세요"}
          action={<Pill tone="green">{doneCount} / 4 완료</Pill>}
        >
          <div className="flex items-start">
            {steps.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-start">
                <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <div className={cn(
                    "grid size-8 place-items-center rounded-full",
                    s.state === "pending" ? "bg-n-100 text-n-400" : "bg-brand text-white",
                    s.state === "active" && "ring-4 ring-green-100",
                  )}>
                    <s.icon className="size-4" />
                  </div>
                  <div className={cn("text-[13px] font-semibold", s.state === "pending" ? "text-text-tertiary" : "text-text-primary")}>{s.label}</div>
                  <div className={cn("text-[11px]", s.state === "active" ? "text-green-700" : "text-text-tertiary")}>{s.sub}</div>
                </div>
                {i < steps.length - 1 ? (
                  <div className="mt-4 h-0.5 flex-1 rounded-full bg-n-200">
                    <div className={cn("h-full rounded-full", s.state === "done" ? "bg-brand" : "")} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        {/* 구독 플랜 + 지갑 입금 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_392px]">
          <Panel>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-[13px] bg-green-50 text-green-700">
                <CpuIcon className="size-6" />
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-text-primary">포르투나 구독</div>
                <div className="text-xs text-text-secondary">월 구독 · 자동 갱신 · 언제든 해지</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-text-primary">{usd(SUB_PRICE)}</span>
                <span className="text-xs font-semibold text-text-tertiary"> /월</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                  <span className="grid size-5 place-items-center rounded-full bg-green-50 text-green-700"><CheckIcon className="size-3" /></span>
                  {b}
                </li>
              ))}
            </ul>
            {subActive ? (
              <LifecycleButton
                mode="subscribe"
                memberId={ME}
                amount={SUB_PRICE}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-bold text-white"
              >
                <CreditCardIcon className="size-4" /> 구독하기 · {usd(SUB_PRICE)}/월
              </LifecycleButton>
            ) : (
              <div className="mt-4 rounded-md bg-surface-muted py-3 text-center text-sm font-semibold text-text-tertiary">구독 판매 준비 중</div>
            )}
            {!canSubscribe && !subscribed ? (
              <p className="mt-2 text-center text-[11px] font-medium text-warning">잔액 부족 — 먼저 입금하세요 (필요 {usd(SUB_PRICE)})</p>
            ) : null}
          </Panel>

          <Panel title="지갑 입금" sub="구독 결제를 위해 회사 입금 주소로 USDT 를 보내세요">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                <div>
                  <div className="text-xs text-text-secondary">예치 잔액</div>
                  <div className="text-lg font-bold text-text-primary">{usd(balance)} USDT</div>
                </div>
                <span className="grid size-9 place-items-center rounded-[10px] bg-green-50 text-green-700"><WalletIcon className="size-[18px]" /></span>
              </div>
              <div className="space-y-2">
                {networks.map((n) => (
                  <div key={n.code} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary">{n.label} 입금 주소</span>
                      <Pill tone="green" dot>USDT · {n.code}</Pill>
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                      <HashIcon className="size-3 shrink-0 text-text-tertiary" />
                      <span className={cn("flex-1 truncate font-mono text-xs", n.address ? "text-text-primary" : "text-text-tertiary")}>{n.address ?? "입금 주소 준비 중"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <DepositButton
                memberId={ME}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-bold text-green-700 ring-[1.5px] ring-brand"
              >
                <WalletIcon className="size-4" /> USDT 입금하기
              </DepositButton>
            </div>
          </Panel>
        </div>

        <FortunaFeatureTiles title="포르투나 앱에서 체험하기" sub="구독 전에도 둘러볼 수 있는 핵심 기능 · 누르면 앱이 새 탭으로 열립니다" />
      </div>
    </>
  );
}

import {
  SparklesIcon,
  RocketIcon,
  CheckIcon,
  WalletIcon,
  CreditCardIcon,
  CpuIcon,
  PlusIcon,
  HashIcon,
  CopyIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
} from "lucide-react";

import { MemberShell } from "@/components/shell/member-shell";
import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "회원가입", sub: "추천 코드 가입", state: "done" as const, icon: CheckIcon },
  { label: "지갑 충전", sub: "USDT 입금", state: "active" as const, icon: WalletIcon },
  { label: "구독 결제", sub: "Alpha Engine $120", state: "pending" as const, icon: CreditCardIcon },
  { label: "엔진 가동", sub: "자동매매 시작", state: "pending" as const, icon: CpuIcon },
];

const BENEFITS = [
  "AI 전략 기반 24/7 자동매매",
  "실시간 시장 대응 · 무인 운용",
  "누적 수익·거래 리포트 제공",
  "마케터 승급 시 추천 수당 자격",
];

const TILES = [
  { icon: CpuIcon, tone: "bg-green-50 text-green-700", title: "AI 자동매매", sub: "24/7 무인 운용" },
  { icon: ShieldCheckIcon, tone: "bg-info-soft text-info", title: "투명 정산", sub: "USDT 온체인" },
  { icon: TrendingUpIcon, tone: "bg-crypto-soft text-crypto", title: "마케터 승급", sub: "추천 수당 자격" },
];

export default function RegisteredDashboardPage() {
  return (
    <MemberShell role="registered" uid="AG·5E18F2" gradeSub="구독 시작 전 · 엔진 미가동">
      <Topbar title="대시보드" sub="환영합니다 · 구독을 시작해 보세요" uid="AG·5E18F2" />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        {/* 온보딩 히어로 */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <SparklesIcon className="size-3" /> 등록회원
            </span>
            <h2 className="text-[23px] font-bold">구독을 시작하고 Alpha Engine을 가동하세요</h2>
            <p className="max-w-xl text-sm text-white/80">
              지갑에 USDT를 충전하고 구독을 결제하면 즉시 자동매매가 시작됩니다.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button className="inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-[15px] font-bold text-green-700">
              <RocketIcon className="size-[17px]" /> 구독 시작하기
            </button>
            <span className="text-xs font-medium text-white/80">Alpha Engine · $120 / 월</span>
          </div>
        </div>

        {/* 시작 단계 스테퍼 */}
        <Panel
          title="시작 단계"
          sub="엔진 가동까지 2단계 남았어요"
          action={<Pill tone="green">1 / 4 완료</Pill>}
        >
          <div className="flex items-start">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-start">
                <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                  <div
                    className={cn(
                      "grid size-8 place-items-center rounded-full",
                      s.state === "pending"
                        ? "bg-n-100 text-n-400"
                        : "bg-brand text-white",
                      s.state === "active" && "ring-4 ring-green-100",
                    )}
                  >
                    <s.icon className="size-4" />
                  </div>
                  <div
                    className={cn(
                      "text-[13px] font-semibold",
                      s.state === "pending" ? "text-text-tertiary" : "text-text-primary",
                    )}
                  >
                    {s.label}
                  </div>
                  <div className={cn("text-[11px]", s.state === "active" ? "text-green-700" : "text-text-tertiary")}>
                    {s.sub}
                  </div>
                </div>
                {i < STEPS.length - 1 ? (
                  <div className="mt-4 h-0.5 flex-1 rounded-full bg-n-200">
                    <div className={cn("h-full rounded-full", i < 1 ? "bg-brand" : "")} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        {/* 구독 플랜 + 지갑 충전 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <Panel>
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-[13px] bg-green-50 text-green-700">
                <CpuIcon className="size-6" />
              </div>
              <div className="flex-1">
                <div className="text-base font-bold text-text-primary">Alpha Engine 구독</div>
                <div className="text-xs text-text-secondary">월 구독 · 자동 갱신 · 언제든 해지</div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-text-primary">$120</span>
                <span className="text-xs font-semibold text-text-tertiary"> /월</span>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-[13px] text-text-secondary">
                  <span className="grid size-5 place-items-center rounded-full bg-green-50 text-green-700">
                    <CheckIcon className="size-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-sm font-bold text-white">
              <CreditCardIcon className="size-4" /> 구독하기 · $120/월
            </button>
          </Panel>

          <Panel title="지갑 충전" sub="구독 결제를 위해 USDT를 충전하세요">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                <div>
                  <div className="text-xs text-text-secondary">예치 잔액</div>
                  <div className="text-lg font-bold text-text-primary">$0.00 USDT</div>
                </div>
                <span className="grid size-9 place-items-center rounded-[10px] bg-green-50 text-green-700">
                  <WalletIcon className="size-[18px]" />
                </span>
              </div>
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
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-md py-3 text-sm font-bold text-green-700 ring-[1.5px] ring-brand">
                <PlusIcon className="size-4" /> USDT 충전하기
              </button>
            </div>
          </Panel>
        </div>

        {/* 혜택 */}
        <div className="grid gap-4 sm:grid-cols-3">
          {TILES.map((t) => (
            <div
              key={t.title}
              className="flex items-center gap-3 rounded-lg bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]"
            >
              <span className={cn("grid size-10 place-items-center rounded-[11px]", t.tone)}>
                <t.icon className="size-[19px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-text-primary">{t.title}</div>
                <div className="text-xs text-text-secondary">{t.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MemberShell>
  );
}

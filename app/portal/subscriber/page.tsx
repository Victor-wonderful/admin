import {
  CircleCheckIcon,
  CalendarClockIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  Settings2Icon,
  BadgeCheckIcon,
  ArrowUpRightIcon,
  CheckIcon,
  PlusIcon,
  ReceiptIcon,
  UserRoundIcon,
} from "lucide-react";

import { MemberShell } from "@/components/shell/member-shell";
import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const KPIS = [
  { icon: CircleCheckIcon, tone: "green" as const, label: "구독 상태", value: "활성" },
  { icon: CalendarClockIcon, tone: "warning" as const, label: "다음 결제", value: "D-26" },
  { icon: CreditCardIcon, tone: "info" as const, label: "누적 결제", value: "$1,200" },
  { icon: CalendarDaysIcon, tone: "crypto" as const, label: "구독 기간", value: "10개월" },
];

const METRICS = [
  { k: "가동률", v: "99.8%", c: "text-green-700" },
  { k: "누적 거래", v: "1,284건", c: "text-text-primary" },
  { k: "최근 동기화", v: "2분 전", c: "text-text-primary" },
];

const BARS = [52, 60, 48, 68, 72, 58, 80, 64, 76, 70, 88, 82, 96, 104];

const UPGRADE = [
  "전용 추천 코드 발급",
  "직추·직급·공유 수당 3종",
  "계보도·레퍼럴 기능 잠금 해제",
];

const ACTIONS = [
  { icon: Settings2Icon, tone: "bg-green-50 text-green-700", title: "구독 관리", sub: "갱신·해지" },
  { icon: PlusIcon, tone: "bg-info-soft text-info", title: "지갑 충전", sub: "USDT 입금" },
  { icon: ReceiptIcon, tone: "bg-crypto-soft text-crypto", title: "결제 내역", sub: "영수증 확인" },
  { icon: UserRoundIcon, tone: "bg-warning-soft text-warning", title: "프로필", sub: "계정·보안" },
];

export default function SubscriberDashboardPage() {
  return (
    <MemberShell role="subscriber" uid="AG·C9A410" gradeSub="엔진 가동중 · 다음 결제 D-26">
      <Topbar title="대시보드" sub="엔진 가동 현황 · 구독 관리" uid="AG·C9A410" />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        {/* 엔진 가동 히어로 */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div className="space-y-2.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <span className="size-2 rounded-full bg-white" /> 엔진 가동 중
            </span>
            <h2 className="text-[23px] font-bold">Alpha Engine 가동 중</h2>
            <p className="text-sm text-white/80">
              구독 10개월차 · 다음 결제 2026-07-12 · 자동매매 정상 작동
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <button className="inline-flex items-center gap-2 rounded-[10px] bg-white px-6 py-3 text-[15px] font-bold text-green-700">
              <Settings2Icon className="size-4" /> 구독 관리
            </button>
            <span className="text-xs font-medium text-white/80">엔진 가동률 99.8% · 무중단 운용</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPIS.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
          <Panel title="엔진 가동 현황" sub="최근 14일 운용 · 자동매매" action={<Pill tone="green" dot>정상 작동</Pill>}>
            <div className="flex items-center gap-0 rounded-lg bg-surface-muted px-1 py-3.5 ring-1 ring-border">
              {METRICS.map((m, i) => (
                <div key={m.k} className={cn("flex-1 text-center", i > 0 && "border-l")}>
                  <div className="text-[11px] font-medium text-text-tertiary">{m.k}</div>
                  <div className={cn("text-base font-bold", m.c)}>{m.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex h-28 items-end gap-1.5">
              {BARS.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end">
                  <div
                    className={cn("rounded-t", i === BARS.length - 1 ? "bg-green-600" : "bg-green-300")}
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          </Panel>

          {/* 마케터 되기 업그레이드 */}
          <div className="flex flex-col gap-3.5 rounded-xl bg-feature p-5 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
            <span className="grid size-10 place-items-center rounded-[12px] bg-crypto">
              <BadgeCheckIcon className="size-[21px]" />
            </span>
            <div>
              <div className="text-[17px] font-bold">마케터로 전환하세요</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">
                연회비 $200/년 납부 시 추천 수당 자격을 얻습니다.
              </p>
            </div>
            <ul className="flex-1 space-y-2">
              {UPGRADE.map((u) => (
                <li key={u} className="flex items-center gap-2 text-[13px] text-white/90">
                  <CheckIcon className="size-[15px] text-lime" /> {u}
                </li>
              ))}
            </ul>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-crypto py-3 text-sm font-bold text-white">
              <ArrowUpRightIcon className="size-4" /> 마케터 전환 · $200/년
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ACTIONS.map((a) => (
            <div
              key={a.title}
              className="flex items-center gap-3 rounded-lg bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]"
            >
              <span className={cn("grid size-9 place-items-center rounded-[10px]", a.tone)}>
                <a.icon className="size-[18px]" />
              </span>
              <div>
                <div className="text-sm font-bold text-text-primary">{a.title}</div>
                <div className="text-xs text-text-secondary">{a.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MemberShell>
  );
}

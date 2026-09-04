import {
  ActivityIcon,
  ListIcon,
  TriangleAlertIcon,
  XCircleIcon,
  UserIcon,
  UserXIcon,
  ArrowUpRightIcon,
  ChevronDownIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 감사 로그 — Pencil 디자인(nf9GX) 1:1.
const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  negative: "bg-negative-soft text-negative",
};

const KPIS = [
  { icon: ActivityIcon, tone: "green" as const, label: "당일 이벤트", value: "312건", delta: null as number | null, info: "오늘 활동", infoCls: "text-text-tertiary" },
  { icon: ListIcon, tone: "info" as const, label: "당월 이벤트", value: "8,420건", delta: 6.1, info: "vs 전월", infoCls: "text-text-tertiary" },
  { icon: TriangleAlertIcon, tone: "warning" as const, label: "위험 액션", value: "47건", delta: null, info: "출금승인·권한변경", infoCls: "text-warning" },
  { icon: XCircleIcon, tone: "negative" as const, label: "로그인 실패", value: "9건", delta: null, info: "계정 잠금 2건", infoCls: "text-negative" },
];

const TABS = ["전체", "인증", "정산", "권한", "회원"];

type ATone = "green" | "info" | "warning" | "negative" | "neutral";

const LOGS: {
  dt: string; admin: string; aTone: ATone; action: string; actionTone: ATone; target: string; ip: string; ok: boolean;
}[] = [
  { dt: "06-16 14:32:08", admin: "이정산", aTone: "green", action: "출금 승인", actionTone: "warning", target: "출금 #WD-2418 · FT-8F3A21 · $1,240 TRC20", ip: "118.32.xx.xx", ok: true },
  { dt: "06-16 14:20:55", admin: "김운영", aTone: "crypto" as ATone, action: "로그인", actionTone: "info", target: "관리자 콘솔 로그인 · 2FA 인증", ip: "211.45.xx.xx", ok: true },
  { dt: "06-16 13:48:12", admin: "김운영", aTone: "crypto" as ATone, action: "권한 변경", actionTone: "crypto" as ATone, target: "박매니저 역할 변경: 조회 전용 → 운영 매니저", ip: "211.45.xx.xx", ok: true },
  { dt: "06-16 13:05:30", admin: "이정산", aTone: "green", action: "정산 확정", actionTone: "green", target: "2026-06 수당 정산 확정 · 312명 · $52,910", ip: "118.32.xx.xx", ok: true },
  { dt: "06-16 11:22:41", admin: "박매니저", aTone: "info", action: "회원 정지", actionTone: "negative", target: "회원 FT-A1B2C3 계정 정지 · 사유: 약관 위반", ip: "175.12.xx.xx", ok: true },
  { dt: "06-16 10:15:09", admin: "최조회", aTone: "neutral", action: "데이터 내보내기", actionTone: "neutral", target: "매출 리포트 CSV 내보내기 · 2026-06", ip: "222.99.xx.xx", ok: true },
  { dt: "06-16 09:03:55", admin: "미식별", aTone: "neutral", action: "로그인 실패", actionTone: "negative", target: "settle@fortuna.io · 비밀번호 5회 오류 · 계정 잠금", ip: "203.88.xx.xx", ok: false },
  { dt: "06-15 18:22:10", admin: "최조회", aTone: "neutral", action: "설정 변경", actionTone: "info", target: "수당 설정 열람 · 직급추천 1차 요율", ip: "222.99.xx.xx", ok: true },
];

const avatarTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  info: "bg-info-soft text-info",
  crypto: "bg-crypto-soft text-crypto",
  neutral: "bg-n-100 text-n-500",
};

const COLS = "grid-cols-[116px_132px_116px_1.7fr_120px_72px]";

export default function AdminAuditPage() {
  return (
    <>
      <Topbar title="감사 로그" sub="운영자 활동 기록 · 변경 이력 · 보안 이벤트" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 상단 KPI 4종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}>
                  <k.icon className="size-[18px]" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[24px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              {k.delta !== null ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-positive">
                  <ArrowUpRightIcon className="size-3" /> +{k.delta.toFixed(1)}%
                  <span className="font-medium text-text-tertiary">{k.info}</span>
                </span>
              ) : (
                <span className={cn("text-[11px] font-medium", k.infoCls)}>{k.info}</span>
              )}
            </div>
          ))}
        </section>

        {/* ── 감사 로그 ── */}
        <Panel bodyClassName="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">전체 관리자 <ChevronDownIcon className="size-3.5 text-text-tertiary" /></span>
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border">2026년 6월 <ChevronDownIcon className="size-3.5 text-text-tertiary" /></span>
              <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-surface-muted px-3 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border"><DownloadIcon className="size-4" /> 내보내기</button>
            </div>
          </div>

          <div className="min-w-[880px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>시각</span>
              <span>관리자</span>
              <span>액션</span>
              <span>대상·상세</span>
              <span>IP</span>
              <span className="text-right">결과</span>
            </div>
            {LOGS.map((l, i) => (
              <div key={i} className={cn("grid items-center gap-3 border-b py-3 last:border-0", COLS)}>
                <span className="text-[12px] tabular-nums text-text-tertiary">{l.dt}</span>
                <span className="flex items-center gap-2">
                  <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold", avatarTone[l.aTone])}>
                    {l.admin === "미식별" ? <UserXIcon className="size-3" /> : l.admin.slice(0, 1)}
                  </span>
                  <span className={cn("text-[13px] font-medium", l.admin === "미식별" ? "text-text-tertiary" : "text-text-primary")}>{l.admin}</span>
                </span>
                <span><Pill tone={l.actionTone}>{l.action}</Pill></span>
                <span className="truncate text-[13px] text-text-secondary">{l.target}</span>
                <span className="text-[12px] tabular-nums text-text-tertiary">{l.ip}</span>
                <span className="flex justify-end"><Pill tone={l.ok ? "green" : "negative"} dot={l.ok}>{l.ok ? "성공" : "실패"}</Pill></span>
              </div>
            ))}
          </div>

          {/* ── 페이지네이션 ── */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[12px] text-text-tertiary">1–8 / 8,420건</span>
            <div className="flex items-center gap-1">
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronLeftIcon className="size-4" /></button>
              {[1, 2, 3].map((p) => (
                <button key={p} className={cn("grid size-8 place-items-center rounded-md text-[13px] font-semibold", p === 1 ? "bg-green-500 text-white" : "text-text-secondary ring-1 ring-border")}>{p}</button>
              ))}
              <button className="grid size-8 place-items-center rounded-md text-text-secondary ring-1 ring-border"><ChevronRightIcon className="size-4" /></button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

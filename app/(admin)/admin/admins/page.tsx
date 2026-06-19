import { UserIcon, UserPlusIcon, MoreHorizontalIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

// 관리자·권한 — Pencil 디자인(mSPAZ) 1:1.
type Tone = "crypto" | "green" | "info" | "neutral";

const CARD =
  "rounded-xl bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const avatarTone: Record<Tone, string> = {
  crypto: "bg-crypto-soft text-crypto",
  green: "bg-green-50 text-green-700",
  info: "bg-info-soft text-info",
  neutral: "bg-n-100 text-n-500",
};

const ROLES: { name: string; tone: Tone; count: string; desc: string; perms: string[] }[] = [
  { name: "슈퍼관리자", tone: "crypto", count: "2명", desc: "모든 기능 · 설정 · 관리자 권한", perms: ["전체 권한"] },
  { name: "정산 관리자", tone: "green", count: "3명", desc: "정산·자금 처리 및 출금 승인 권한", perms: ["수당 정산", "출금 승인", "매출"] },
  { name: "운영 매니저", tone: "info", count: "5명", desc: "회원·조직·구독 운영 (정산 제외)", perms: ["회원", "조직", "구독"] },
  { name: "조회 전용", tone: "neutral", count: "4명", desc: "읽기 전용 · 수정/승인 불가", perms: ["대시보드", "리포트"] },
];

const ADMINS: {
  name: string; email: string; role: string; tone: Tone; mfa: boolean; last: string; ip: string; active: boolean;
}[] = [
  { name: "김운영", email: "ops@alphagate.io", role: "슈퍼관리자", tone: "crypto", mfa: true, last: "06-16 14:20", ip: "211.45.xx.xx", active: true },
  { name: "이정산", email: "settle@alphagate.io", role: "정산 관리자", tone: "green", mfa: true, last: "06-16 13:05", ip: "118.32.xx.xx", active: true },
  { name: "박매니저", email: "manager@alphagate.io", role: "운영 매니저", tone: "info", mfa: true, last: "06-16 09:40", ip: "175.12.xx.xx", active: true },
  { name: "최조회", email: "view@alphagate.io", role: "조회 전용", tone: "neutral", mfa: false, last: "06-15 18:22", ip: "222.99.xx.xx", active: true },
  { name: "정현우", email: "staff@alphagate.io", role: "운영 매니저", tone: "info", mfa: false, last: "05-28 11:10", ip: "—", active: false },
];

const COLS = "grid-cols-[1.9fr_132px_72px_128px_124px_84px_40px]";

export default function AdminAdminsPage() {
  return (
    <>
      <Topbar title="관리자·권한" sub="운영자 계정 · 역할 · 권한 관리" uid="운영자" />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 역할 카드 4종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLES.map((r) => (
            <div key={r.name} className={cn(CARD, "space-y-3")}>
              <div className="flex items-center justify-between">
                <Pill tone={r.tone}>{r.name}</Pill>
                <span className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary">
                  <UserIcon className="size-3.5 text-text-tertiary" /> {r.count}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">{r.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {r.perms.map((p) => (
                  <span key={p} className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── 관리자 계정 ── */}
        <Panel
          title="관리자 계정"
          sub="총 14명 · 역할별 권한 적용"
          action={
            <button className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">
              <UserPlusIcon className="size-3.5" /> 관리자 추가
            </button>
          }
          bodyClassName="overflow-x-auto"
        >
          <div className="min-w-[760px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>이름</span>
              <span>역할</span>
              <span>2FA</span>
              <span>마지막 로그인</span>
              <span>마지막 IP</span>
              <span>상태</span>
              <span />
            </div>
            {ADMINS.map((a) => (
              <div key={a.email} className={cn("grid items-center gap-3 border-b py-3 last:border-0", COLS)}>
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold", avatarTone[a.tone])}>{a.name.slice(0, 1)}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{a.name}</div>
                    <div className="truncate text-[11px] text-text-tertiary">{a.email}</div>
                  </div>
                </div>
                <span><Pill tone={a.tone}>{a.role}</Pill></span>
                <span><Pill tone={a.mfa ? "green" : "neutral"} dot={a.mfa}>{a.mfa ? "ON" : "OFF"}</Pill></span>
                <span className="text-[12px] tabular-nums text-text-secondary">{a.last}</span>
                <span className="text-[12px] tabular-nums text-text-tertiary">{a.ip}</span>
                <span><Pill tone={a.active ? "green" : "negative"} dot={a.active}>{a.active ? "활성" : "정지"}</Pill></span>
                <span className="flex justify-end">
                  <button className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><MoreHorizontalIcon className="size-4" /></button>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  ShieldCheckIcon,
  CoinsIcon,
  Settings2Icon,
  EyeIcon,
  UserPlusIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const ROLES = [
  { icon: ShieldCheckIcon, tone: "bg-crypto-soft text-crypto", name: "슈퍼관리자", count: "2명", perms: ["전체 권한"] },
  { icon: CoinsIcon, tone: "bg-green-50 text-green-700", name: "정산관리자", count: "3명", perms: ["정산", "출금 승인"] },
  { icon: Settings2Icon, tone: "bg-info-soft text-info", name: "운영매니저", count: "5명", perms: ["회원", "상품"] },
  { icon: EyeIcon, tone: "bg-n-100 text-n-500", name: "조회전용", count: "4명", perms: ["읽기 전용"] },
];

const ADMINS = [
  { name: "김운영", email: "super@alphagate.io", role: "슈퍼관리자", tone: "crypto" as const, mfa: true, last: "방금 전", ip: "211.45.x.x", state: "활성", stateTone: "green" as const },
  { name: "이정산", email: "settle@alphagate.io", role: "정산관리자", tone: "green" as const, mfa: true, last: "12분 전", ip: "121.78.x.x", state: "활성", stateTone: "green" as const },
  { name: "박매니저", email: "ops@alphagate.io", role: "운영매니저", tone: "info" as const, mfa: false, last: "3시간 전", ip: "59.20.x.x", state: "활성", stateTone: "green" as const },
  { name: "최조회", email: "view@alphagate.io", role: "조회전용", tone: "neutral" as const, mfa: true, last: "어제", ip: "182.31.x.x", state: "정지", stateTone: "negative" as const },
];

export default function AdminAdminsPage() {
  return (
    <>
      <Topbar
        title="관리자·권한"
        sub="운영 콘솔 관리자 계정 · 역할"
        uid="운영자"
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">
            <UserPlusIcon className="size-3.5" /> 관리자 추가
          </button>
        }
      />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ROLES.map((r) => (
            <Panel key={r.name}>
              <div className="flex items-center justify-between">
                <span className={cn("grid size-10 place-items-center rounded-[12px]", r.tone)}>
                  <r.icon className="size-[19px]" />
                </span>
                <span className="text-lg font-bold text-text-primary">{r.count}</span>
              </div>
              <div className="mt-3 text-sm font-bold text-text-primary">{r.name}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.perms.map((p) => (
                  <span key={p} className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border">{p}</span>
                ))}
              </div>
            </Panel>
          ))}
        </div>

        <Panel title="관리자 계정" sub="14명">
          <div>
            <div className="grid grid-cols-[1fr_1.4fr_1fr_auto_1fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>이름</span><span>이메일</span><span>역할</span><span>2FA</span><span>마지막 로그인</span><span>IP</span><span className="text-right">상태</span>
            </div>
            {ADMINS.map((a) => (
              <div key={a.email} className="grid grid-cols-[1fr_1.4fr_1fr_auto_1fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{a.name}</span>
                <span className="text-text-secondary">{a.email}</span>
                <span><Pill tone={a.tone}>{a.role}</Pill></span>
                <span>
                  <Pill tone={a.mfa ? "green" : "neutral"}>{a.mfa ? "ON" : "OFF"}</Pill>
                </span>
                <span className="text-text-secondary">{a.last}</span>
                <span className="text-xs text-text-tertiary tabular-nums">{a.ip}</span>
                <span className="justify-self-end"><Pill tone={a.stateTone} dot={a.state === "활성"}>{a.state}</Pill></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

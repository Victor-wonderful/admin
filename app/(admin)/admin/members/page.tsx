import {
  UsersIcon,
  CircleCheckIcon,
  UserRoundIcon,
  CpuIcon,
  BadgeCheckIcon,
  FilterIcon,
  DownloadIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { listMembers, getMemberStats } from "@/lib/queries/members";
import type { MemberRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<MemberRole, string> = {
  registered: "등록회원",
  subscriber: "구독회원",
  marketer: "마케터",
};
const ROLE_TONE: Record<MemberRole, "neutral" | "green" | "crypto"> = {
  registered: "neutral",
  subscriber: "green",
  marketer: "crypto",
};

const TABS = ["전체", "등록회원", "구독회원", "마케터"];

export default async function AdminMembersPage() {
  const [stats, members] = await Promise.all([getMemberStats(), listMembers()]);
  const rows = members.slice(0, 14);

  const kpis = [
    { icon: UsersIcon, tone: "neutral" as const, label: "전체 회원", value: `${stats.total.toLocaleString()}명` },
    { icon: CircleCheckIcon, tone: "green" as const, label: "활성 구독자", value: `${stats.active.toLocaleString()}명` },
    { icon: UserRoundIcon, tone: "neutral" as const, label: "등록회원", value: `${stats.registered.toLocaleString()}명` },
    { icon: CpuIcon, tone: "green" as const, label: "구독회원", value: `${stats.subscriber.toLocaleString()}명` },
    { icon: BadgeCheckIcon, tone: "crypto" as const, label: "마케터", value: `${stats.marketer.toLocaleString()}명` },
  ];

  return (
    <>
      <Topbar
        title="회원관리"
        sub="등록 · 구독 · 마케터 전체 회원"
        uid="운영자"
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">
              <FilterIcon className="size-3.5" /> 필터
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-md bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
              <DownloadIcon className="size-3.5" /> 내보내기
            </button>
          </>
        }
      />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <Panel
          title="회원 목록"
          sub={`${stats.total.toLocaleString()}명 · 최근 ${rows.length}명 표시`}
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[1.4fr_1fr_0.9fr_1fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>회원 UID</span><span>등급</span><span>구독</span><span>가입일</span><span>계정 상태</span><span className="text-right">액션</span>
            </div>
            {rows.map((m) => (
              <div key={m.id} className="grid grid-cols-[1.4fr_1fr_0.9fr_1fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="flex items-center gap-2.5 font-semibold text-text-primary">
                  <span className="grid size-7 place-items-center rounded-lg bg-surface-muted text-text-tertiary">
                    <UserRoundIcon className="size-3.5" />
                  </span>
                  {m.display_name}
                </span>
                <span><Pill tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Pill></span>
                <span className="text-text-secondary">
                  {m.is_active_subscriber ? "활성" : m.role === "registered" ? "미구독" : "만료"}
                </span>
                <span className="text-text-tertiary tabular-nums">{m.created_at.slice(0, 10)}</span>
                <span><Pill tone="green" dot>정상</Pill></span>
                <span className="justify-self-end text-xs font-semibold text-green-700">상세</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

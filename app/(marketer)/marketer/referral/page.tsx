import {
  UserPlusIcon,
  CircleCheckIcon,
  BadgeCheckIcon,
  PercentIcon,
  UsersIcon,
  CornerDownRightIcon,
  UserRoundIcon,
  BadgeCheckIcon as PartnerIcon,
} from "lucide-react";

import { toUid } from "@/lib/uid";
import { toSeoulDate, today, currentCycle } from "@/lib/dates";
import { InviteLinkActions } from "@/components/marketer/invite-link-actions";
import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getReferralCode, listReferred } from "@/lib/queries/members";
import { getMarketerViewerId } from "@/lib/session";
import type { MemberRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<MemberRole, string> = { registered: "등록회원", subscriber: "구독회원", marketer: "파트너" };
const ROLE_TONE: Record<MemberRole, "neutral" | "green" | "crypto"> = { registered: "neutral", subscriber: "green", marketer: "crypto" };

// 최근 N일 날짜 목록(서울, 오래된 순)
function lastDays(n: number): string[] {
  const end = Date.parse(today() + "T00:00:00Z");
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 86400000).toISOString().slice(0, 10));
}

export default async function MarketerReferralPage() {
  const viewerId = await getMarketerViewerId();
  const [code, referred] = await Promise.all([
    getReferralCode(viewerId),
    listReferred(viewerId),
  ]);

  const total = referred.length;
  const subscribed = referred.filter((m) => m.is_active_subscriber).length;
  const marketers = referred.filter((m) => m.role === "marketer").length;
  const convRate = total > 0 ? ((subscribed / total) * 100).toFixed(1) : "0.0";
  const mktRate = total > 0 ? ((marketers / total) * 100).toFixed(1) : "0.0";
  const codeStr = code?.code ?? "—";

  // 가입 추이(실데이터) — 최근 14일 내 초대 가입 수(서울 날짜) + 당월 가입 수
  const joinDates = referred.map((m) => toSeoulDate(m.created_at));
  const days = lastDays(14);
  const signups = days.map((d) => joinDates.filter((j) => j === d).length);
  const signupMax = Math.max(1, ...signups);
  const monthSignups = joinDates.filter((d) => d.startsWith(currentCycle())).length;
  // 등급 구성(실데이터) — 초대한 회원의 현재 등급 분포(채널별 유입은 클릭 트래킹이 없어 제공하지 않는다)
  const byRole = [
    { icon: UserRoundIcon, name: "등록회원", count: referred.filter((m) => m.role === "registered").length, color: "bg-n-400" },
    { icon: CircleCheckIcon, name: "구독회원", count: referred.filter((m) => m.role === "subscriber").length, color: "bg-green-600" },
    { icon: PartnerIcon, name: "파트너", count: marketers, color: "bg-crypto" },
  ];

  // 퍼널 — 초대 코드 가입 → 구독 → 파트너 (실데이터). 링크 클릭은 트래킹 부재로 제외.
  const pctOf = (n: number) => (total > 0 ? Math.max(n > 0 ? 8 : 0, Math.round((n / total) * 100)) : 0);
  const funnel = [
    { name: "회원 가입", sub: "내 초대 코드 가입", count: total.toLocaleString(), w: 100, bar: "bg-info", pct: "100%" },
    { name: "구독 전환", sub: "포르투나 구독 결제", count: subscribed.toLocaleString(), w: pctOf(subscribed), bar: "bg-green-600", pct: `${convRate}%` },
    { name: "파트너 전환", sub: "파트너 멤버십 납부·활동", count: marketers.toLocaleString(), w: pctOf(marketers), bar: "bg-crypto", pct: `${mktRate}%` },
  ];

  const kpis = [
    { icon: UserPlusIcon, tone: "neutral" as const, label: "총 가입", value: `${total.toLocaleString()}명` },
    { icon: CircleCheckIcon, tone: "green" as const, label: "구독 전환", value: `${subscribed.toLocaleString()}명` },
    { icon: BadgeCheckIcon, tone: "crypto" as const, label: "파트너 전환", value: `${marketers.toLocaleString()}명` },
    { icon: PercentIcon, tone: "info" as const, label: "구독 전환율", value: `${convRate}%` },
  ];

  return (
    <>
      <Topbar title="초대" sub="내 초대 코드 · 초대 현황" uid={toUid(viewerId)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-feature p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-xs font-medium text-white/60">내 초대 코드</div>
            <div className="mt-1 font-mono text-[34px] font-bold tracking-wider">{codeStr}</div>
          </div>
          <InviteLinkActions code={codeStr} />
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <Panel title="초대 전환 퍼널" sub="회원 가입 → 구독 전환 → 파트너 전환 (실데이터)" action={<Pill tone="crypto"><UsersIcon className="size-3" /> 파트너 전환율 {mktRate}%</Pill>}>
          <div className="space-y-2.5">
            {funnel.map((f) => (
              <div key={f.name} className="flex items-center gap-4">
                <div className="w-36 shrink-0">
                  <div className="text-[13px] font-semibold text-text-primary">{f.name}</div>
                  <div className="text-[11px] text-text-tertiary">{f.sub}</div>
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <div className={cn("flex h-10 items-center justify-end rounded-lg px-4 text-[15px] font-bold text-white", f.bar)} style={{ width: `${f.w}%` }}>
                    {f.count}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded bg-surface-muted px-2.5 py-1.5 text-xs font-semibold text-text-secondary ring-1 ring-border">
                    <CornerDownRightIcon className="size-3" /> {f.pct}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-[1fr_388px]">
          <Panel title="가입 추이" sub="최근 14일 내 초대 가입 수" action={<Pill tone="green" dot>당월 +{monthSignups}명</Pill>}>
            {signups.every((n) => n === 0) ? (
              <div className="grid h-44 place-items-center text-sm text-text-tertiary">최근 14일 가입이 없습니다.</div>
            ) : (
              <div className="flex h-44 items-end gap-1.5">
                {signups.map((n, i) => (
                  <div key={days[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${days[i]} · ${n}명`}>
                    <span className="text-[10px] tabular-nums text-text-tertiary">{n > 0 ? n : ""}</span>
                    <div className={cn("w-full rounded-t", i === signups.length - 1 ? "bg-green-600" : "bg-green-300")} style={{ height: `${Math.max(n > 0 ? 6 : 2, Math.round((n / signupMax) * 85))}%` }} />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-1.5 flex justify-between text-[10px] text-text-tertiary"><span>{days[0].slice(5)}</span><span>{days[days.length - 1].slice(5)}</span></div>
          </Panel>

          <Panel title="초대 회원 등급 구성" sub="내가 초대한 회원의 현재 등급">
            <div className="space-y-4">
              {byRole.map((c) => (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                      <span className="grid size-6 place-items-center rounded bg-surface-muted">
                        <c.icon className="size-3.5 text-text-secondary" />
                      </span>
                      {c.name}
                    </span>
                    <span className="text-[13px] font-bold text-text-primary">{c.count.toLocaleString()}명</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", c.color)} style={{ width: `${total > 0 ? Math.round((c.count / total) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="초대한 회원" sub={`내 초대 코드로 가입한 직접 초대 ${total.toLocaleString()}명`}>
          <div>
            <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>회원</span><span>등급</span><span>가입일</span><span className="text-right">구독</span>
            </div>
            {referred.slice(0, 20).map((m) => (
              <div key={m.id} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{toUid(m.id)}</span>
                <span><Pill tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Pill></span>
                <span className="text-text-secondary tabular-nums">{toSeoulDate(m.created_at)}</span>
                <span className="justify-self-end">
                  <Pill tone={m.is_active_subscriber ? "green" : "neutral"}>{m.is_active_subscriber ? "활성" : "미구독"}</Pill>
                </span>
              </div>
            ))}
            {referred.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">초대한 회원이 없습니다.</div>
            ) : referred.length > 20 ? (
              <div className="pt-3 text-center text-[12px] text-text-tertiary">최근 가입 20명 표시 · 외 {(referred.length - 20).toLocaleString()}명</div>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

import {
  UserPlusIcon,
  CircleCheckIcon,
  BadgeCheckIcon,
  PercentIcon,
  CopyIcon,
  Share2Icon,
  UsersIcon,
  CornerDownRightIcon,
  MessageCircleIcon,
  SendIcon,
  HashIcon,
  LinkIcon,
} from "lucide-react";

import { toUid } from "@/lib/uid";
import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getReferralCode, listReferred } from "@/lib/queries/members";
import { getMarketerViewerId } from "@/lib/session";
import type { MemberRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<MemberRole, string> = { registered: "등록회원", subscriber: "구독회원", marketer: "마케터" };
const ROLE_TONE: Record<MemberRole, "neutral" | "green" | "crypto"> = { registered: "neutral", subscriber: "green", marketer: "crypto" };

// 가입 추이·채널은 클릭 트래킹 인프라 부재로 정적(예시).
const SIGNUPS = [40, 28, 52, 44, 64, 38, 72, 56, 48, 84, 60, 92, 70, 110];
const CHANNELS = [
  { icon: MessageCircleIcon, name: "카카오톡", count: "98명", w: 40, color: "bg-green-600" },
  { icon: SendIcon, name: "텔레그램", count: "64명", w: 26, color: "bg-info" },
  { icon: HashIcon, name: "X (트위터)", count: "42명", w: 17, color: "bg-feature" },
  { icon: LinkIcon, name: "직접 링크", count: "44명", w: 17, color: "bg-crypto" },
];

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

  // 퍼널 — 추천 코드 가입 → 구독 → 마케터 (실데이터). 링크 클릭은 트래킹 부재로 제외.
  const pctOf = (n: number) => (total > 0 ? Math.max(n > 0 ? 8 : 0, Math.round((n / total) * 100)) : 0);
  const funnel = [
    { name: "회원 가입", sub: "내 추천 코드 가입", count: total.toLocaleString(), w: 100, bar: "bg-info", pct: "100%" },
    { name: "구독 전환", sub: "엔진 구독 결제", count: subscribed.toLocaleString(), w: pctOf(subscribed), bar: "bg-green-600", pct: `${convRate}%` },
    { name: "마케터 전환", sub: "연회비 납부·활동", count: marketers.toLocaleString(), w: pctOf(marketers), bar: "bg-crypto", pct: `${mktRate}%` },
  ];

  const kpis = [
    { icon: UserPlusIcon, tone: "neutral" as const, label: "총 가입", value: `${total.toLocaleString()}명` },
    { icon: CircleCheckIcon, tone: "green" as const, label: "구독 전환", value: `${subscribed.toLocaleString()}명` },
    { icon: BadgeCheckIcon, tone: "crypto" as const, label: "마케터 전환", value: `${marketers.toLocaleString()}명` },
    { icon: PercentIcon, tone: "info" as const, label: "구독 전환율", value: `${convRate}%` },
  ];

  return (
    <>
      <Topbar title="레퍼럴" sub="내 추천 코드 · 초대 실적" uid={toUid(viewerId)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-feature p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div>
            <div className="text-xs font-medium text-white/60">내 추천 코드</div>
            <div className="mt-1 font-mono text-[34px] font-bold tracking-wider">{codeStr}</div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/70">
              <HashIcon className="size-3" /> fortuna.io/r/{codeStr}
            </div>
          </div>
          <div className="flex gap-2.5">
            <button className="inline-flex items-center gap-2 rounded-[10px] bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20">
              <CopyIcon className="size-4" /> 링크 복사
            </button>
            <button className="inline-flex items-center gap-2 rounded-[10px] bg-crypto px-5 py-3 text-sm font-bold text-white">
              <Share2Icon className="size-4" /> 공유
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>

        <Panel title="초대 전환 퍼널" sub="회원 가입 → 구독 전환 → 마케터 전환 (실데이터)" action={<Pill tone="crypto"><UsersIcon className="size-3" /> 마케터 전환율 {mktRate}%</Pill>}>
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
          <Panel title="가입 추이" sub="최근 14일 내 추천 가입 수" action={<Pill tone="green" dot>당월 +32명</Pill>}>
            <div className="flex h-44 items-end gap-1.5">
              {SIGNUPS.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col justify-end">
                  <div className={cn("rounded-t", i === SIGNUPS.length - 1 ? "bg-green-600" : "bg-green-300")} style={{ height: `${h * 0.8}%` }} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="채널별 유입" sub="공유 채널별 가입 전환">
            <div className="space-y-4">
              {CHANNELS.map((c) => (
                <div key={c.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                      <span className="grid size-6 place-items-center rounded bg-surface-muted">
                        <c.icon className="size-3.5 text-text-secondary" />
                      </span>
                      {c.name}
                    </span>
                    <span className="text-[13px] font-bold text-text-primary">{c.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", c.color)} style={{ width: `${c.w}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="추천한 회원" sub={`내 추천 코드로 가입한 직접 추천 ${total.toLocaleString()}명`}>
          <div>
            <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>회원</span><span>등급</span><span>가입일</span><span className="text-right">구독</span>
            </div>
            {referred.slice(0, 8).map((m) => (
              <div key={m.id} className="grid grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{toUid(m.id)}</span>
                <span><Pill tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</Pill></span>
                <span className="text-text-secondary tabular-nums">{m.created_at.slice(0, 10)}</span>
                <span className="justify-self-end">
                  <Pill tone={m.is_active_subscriber ? "green" : "neutral"}>{m.is_active_subscriber ? "활성" : "미구독"}</Pill>
                </span>
              </div>
            ))}
            {referred.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">추천한 회원이 없습니다.</div>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

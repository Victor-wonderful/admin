import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeftIcon,
  CpuIcon,
  UsersRoundIcon,
  UserPlusIcon,
  Share2Icon,
  CoinsIcon,
  CircleCheckIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  TrophyIcon,
  ShieldCheckIcon,
  KeyRoundIcon,
  LockIcon,
  BanIcon,
  MailIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { getMember, getMemberSubscriptions, listReferred } from "@/lib/queries/members";
import { getMarketerLegs, getMajorMinor } from "@/lib/queries/legs";
import { getMemberRank } from "@/lib/queries/ranks";
import { getMemberSettlement } from "@/lib/queries/finance";
import { toUid } from "@/lib/uid";
import type { MemberRole } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYCLE = "2026-06";

const ROLE_LABEL: Record<MemberRole, string> = { registered: "등록회원", subscriber: "구독회원", marketer: "마케터" };
const ROLE_BADGE: Record<MemberRole, string> = {
  registered: "bg-n-100 text-n-600",
  subscriber: "bg-green-50 text-green-700",
  marketer: "bg-crypto-soft text-crypto",
};
const ROLE_AVATAR: Record<MemberRole, string> = {
  registered: "bg-n-100 text-n-500",
  subscriber: "bg-green-50 text-green-700",
  marketer: "bg-crypto-soft text-crypto",
};

const usd = (v: number) => `$${Math.round(v).toLocaleString()}`;
const initials = (uid: string) => {
  const after = uid.includes("·") ? uid.split("·")[1] : uid;
  return (after ?? uid).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
};
const maskEmail = (e: string | null) => {
  if (!e) return "이메일 미등록";
  const [u, d] = e.split("@");
  return d ? `${u.slice(0, 1)}•••@${d}` : e;
};
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

const CARD = "rounded-xl bg-card p-5 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

function SectionCard({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn(CARD, className)}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[15px] font-semibold text-text-primary">{title}</h3>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2.5 text-[13px] last:border-0">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{children}</span>
    </div>
  );
}

function Kpi({ icon: Icon, badge, label, value }: { icon: React.ComponentType<{ className?: string }>; badge: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-[12px]", badge)}>
        <Icon className="size-[19px]" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="text-lg font-bold text-text-primary tabular-nums">{value}</div>
      </div>
    </div>
  );
}

export default async function MemberDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMember(id);
  if (!me) notFound();

  const isMarketer = me.role === "marketer";
  const paysSub = me.role !== "registered";

  const [recommender, parent, subs, referred] = await Promise.all([
    me.recommender_id ? getMember(me.recommender_id) : Promise.resolve(null),
    me.parent_id ? getMember(me.parent_id) : Promise.resolve(null),
    getMemberSubscriptions(id),
    listReferred(id),
  ]);

  const [legs, mm, rank, settlement] = isMarketer
    ? await Promise.all([getMarketerLegs(id), getMajorMinor(id), getMemberRank(id), getMemberSettlement(id, CYCLE)])
    : [[], null, null, null];

  const uid = toUid(me.id);
  const totalPaid = subs.reduce((s, x) => s + Number(x.amount_usd), 0);
  const referredActive = referred.filter((r) => r.is_active_subscriber).length;
  const latestSub = subs[0]; // period_start desc

  // 역할별 KPI
  const kpis = isMarketer
    ? [
        { icon: UsersRoundIcon, badge: "bg-green-50 text-green-700", label: "총 활성 산하", value: `${(mm?.total_active ?? 0).toLocaleString()}명` },
        { icon: UserPlusIcon, badge: "bg-green-50 text-green-700", label: "직추 (활성)", value: `${referred.length}명 / ${referredActive}` },
        { icon: Share2Icon, badge: "bg-crypto-soft text-crypto", label: "후원 라인", value: `${mm?.leg_count ?? 0}개` },
        { icon: CoinsIcon, badge: "bg-info-soft text-info", label: "당월 수당", value: usd(settlement?.total ?? 0) },
      ]
    : me.role === "subscriber"
      ? [
          { icon: CreditCardIcon, badge: "bg-green-50 text-green-700", label: "누적 결제", value: usd(totalPaid) },
          { icon: CircleCheckIcon, badge: "bg-green-50 text-green-700", label: "결제 횟수", value: `${subs.length}회` },
          { icon: CalendarDaysIcon, badge: "bg-info-soft text-info", label: "가입 기간", value: `${daysSince(me.created_at)}일` },
          { icon: UserPlusIcon, badge: "bg-n-100 text-n-500", label: "추천 회원", value: `${referred.length}명` },
        ]
      : [
          { icon: CalendarDaysIcon, badge: "bg-info-soft text-info", label: "가입 기간", value: `${daysSince(me.created_at)}일` },
          { icon: UserPlusIcon, badge: "bg-n-100 text-n-500", label: "추천 회원", value: `${referred.length}명` },
          { icon: CreditCardIcon, badge: "bg-n-100 text-n-500", label: "구독", value: "미구독" },
          { icon: CircleCheckIcon, badge: "bg-n-100 text-n-500", label: "상태", value: "등록" },
        ];

  const rankLabel = rank && rank.rank > 0 ? `${rank.rank}직급 (${Number(rank.rate_pct)}%)` : "무직급";
  const nextTotal = rank?.next_min_total ?? null;
  const majorPct = nextTotal ? Math.min(Math.round(((rank?.major_leg ?? 0) / nextTotal) * 100), 100) : 100;

  const mix = settlement
    ? [
        { label: "직접추천 수당", value: settlement.level, color: "bg-green-500" },
        { label: "직급 수당", value: settlement.rank, color: "bg-info" },
        { label: "공유 수당", value: settlement.share, color: "bg-crypto" },
      ]
    : [];

  const sortedLegs = legs.slice().sort((a, b) => b.active_count - a.active_count);

  return (
    <>
      <Topbar title="회원 상세" sub={`${ROLE_LABEL[me.role]} · ${uid}`} uid="운영자" />

      <div className="flex-1 space-y-4 overflow-auto bg-canvas p-7">
        <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-secondary hover:text-text-primary">
          <ChevronLeftIcon className="size-4" /> 회원 목록으로
        </Link>

        {/* Profile header */}
        <section className={cn(CARD, "flex flex-wrap items-center justify-between gap-4")}>
          <div className="flex items-center gap-3.5">
            <span className={cn("grid size-14 place-items-center rounded-2xl text-lg font-bold", ROLE_AVATAR[me.role])}>{initials(uid)}</span>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-bold text-text-primary">{uid}</span>
                <span className={cn("rounded-[7px] px-2.5 py-1 text-[12px] font-semibold", ROLE_BADGE[me.role])}>{ROLE_LABEL[me.role]}</span>
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", me.is_active_subscriber ? "bg-green-50 text-green-700" : "bg-n-100 text-n-500")}>
                  <span className={cn("size-1.5 rounded-full", me.is_active_subscriber ? "bg-green-500" : "bg-n-400")} />
                  {me.is_active_subscriber ? "활성 구독 중" : "비활성"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-text-tertiary">
                <span className="inline-flex items-center gap-1"><MailIcon className="size-3" /> {maskEmail(me.email)}</span>
                <span>가입 {me.created_at.slice(0, 10)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
              <KeyRoundIcon className="size-3.5" /> 비밀번호 재설정
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-[10px] bg-card px-3.5 py-2 text-[13px] font-medium text-negative ring-1 ring-border-strong">
              <BanIcon className="size-3.5" /> 계정 정지
            </button>
          </div>
        </section>

        {/* Alpha Engine 구독 상태 */}
        {paysSub ? (
          <section className={cn(CARD, "flex flex-wrap items-center justify-between gap-4")}>
            <div className="flex items-center gap-3.5">
              <span className="grid size-11 place-items-center rounded-[12px] bg-crypto-soft text-crypto"><CpuIcon className="size-5" /></span>
              <div>
                <div className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
                  Alpha Engine 구독
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", me.is_active_subscriber ? "bg-green-50 text-green-700" : "bg-warning-soft text-warning")}>
                    <span className={cn("size-1.5 rounded-full", me.is_active_subscriber ? "bg-green-500" : "bg-warning")} />
                    {me.is_active_subscriber ? "엔진 가동 중" : "정지"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-text-tertiary">$120/월 · 구독 {subs.length}회차 · is_active_subscriber {me.is_active_subscriber ? "true" : "false"}</div>
              </div>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <div className="text-[11px] text-text-tertiary">다음 결제일</div>
                <div className="text-sm font-bold text-text-primary tabular-nums">{latestSub?.period_end ?? "—"}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-tertiary">누적 결제</div>
                <div className="text-sm font-bold text-text-primary tabular-nums">{usd(totalPaid)}</div>
              </div>
            </div>
          </section>
        ) : null}

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {kpis.map((k) => (
            <Kpi key={k.label} {...k} />
          ))}
        </div>

        {/* 기본 정보 + 계정·보안 */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard title="기본 정보">
            <div>
              <InfoRow label="회원 UID">{uid}</InfoRow>
              <InfoRow label="이메일">{maskEmail(me.email)}</InfoRow>
              <InfoRow label="역할">{ROLE_LABEL[me.role]}</InfoRow>
              <InfoRow label="추천인 (수당 귀속)">
                {recommender ? (
                  <Link href={`/admin/members/${recommender.id}`} className="text-crypto hover:underline">{toUid(recommender.id)}</Link>
                ) : (
                  <span className="text-text-tertiary">— (루트)</span>
                )}
              </InfoRow>
              <InfoRow label="후원 부모 (배치)">
                {parent ? (
                  <Link href={`/admin/members/${parent.id}`} className="text-crypto hover:underline">{toUid(parent.id)}</Link>
                ) : (
                  <span className="text-text-tertiary">— (루트)</span>
                )}
              </InfoRow>
              <InfoRow label="가입일">{me.created_at.slice(0, 10)}</InfoRow>
            </div>
            {recommender && parent && recommender.id !== parent.id ? (
              <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-warning">
                추천인 ≠ 후원 부모 — 스필오버로 배치된 회원입니다.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard title="계정 · 보안">
            <div>
              <InfoRow label="계정 상태"><span className="inline-flex items-center gap-1.5 text-green-700"><span className="size-1.5 rounded-full bg-green-700" /> 정상</span></InfoRow>
              <InfoRow label="2FA">{isMarketer ? "활성" : "미설정"}</InfoRow>
              <InfoRow label="로그인 방식">이메일 + 비밀번호</InfoRow>
              <InfoRow label="마지막 접속 IP"><span className="text-text-tertiary">기록 없음</span></InfoRow>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-card py-2 text-[12px] font-medium text-text-secondary ring-1 ring-border-strong">
                <LockIcon className="size-3.5" /> 잠금 해제
              </button>
              <button className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-card py-2 text-[12px] font-medium text-text-secondary ring-1 ring-border-strong">
                <ShieldCheckIcon className="size-3.5" /> 강제 로그아웃
              </button>
            </div>
          </SectionCard>
        </div>

        {/* 직급·자격 + 수당 구성 (마케터) */}
        {isMarketer && rank ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="직급 · 자격 산정" action={<span className="inline-flex items-center gap-1 rounded-full bg-crypto-soft px-2.5 py-1 text-[11px] font-semibold text-crypto"><TrophyIcon className="size-3" /> {rankLabel}</span>}>
              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-text-primary">대실적 라인 (주력)</span>
                    <span className="font-bold tabular-nums text-text-primary">{(rank.major_leg ?? 0).toLocaleString()}{nextTotal ? ` / ${nextTotal.toLocaleString()}` : ""}명</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-n-100"><div className="h-full rounded-full bg-green-600" style={{ width: `${majorPct}%` }} /></div>
                </div>
                <InfoRow label="기타 소실적 합계">{(rank.other_minor ?? 0).toLocaleString()}명</InfoRow>
                <InfoRow label="30% 균형 조건">
                  <span className={rank.balance_ok ? "text-green-700" : "text-warning"}>{rank.balance_ok ? "충족" : "미충족"} ({Math.round((rank.balance_pct ?? 0) * 100)}%)</span>
                </InfoRow>
                <InfoRow label="다음 직급">{rank.next_rank ? `${rank.next_rank}직급` : "최고 직급"}</InfoRow>
              </div>
            </SectionCard>

            <SectionCard title="수당 구성" action={<span className="text-xs font-medium text-text-tertiary">{CYCLE}</span>}>
              {settlement ? (
                <div className="space-y-3">
                  {mix.map((m) => {
                    const pct = settlement.total > 0 ? Math.round((m.value / settlement.total) * 100) : 0;
                    return (
                      <div key={m.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[13px]">
                          <span className="font-medium text-text-secondary">{m.label}</span>
                          <span className="font-bold tabular-nums text-text-primary">{usd(m.value)} <span className="text-xs font-semibold text-text-tertiary">{pct}%</span></span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-n-100"><div className={cn("h-full rounded-full", m.color)} style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t pt-3 text-[13px]">
                    <span className="font-semibold text-text-primary">당월 합계</span>
                    <span className="font-bold tabular-nums text-green-700">{usd(settlement.total)}</span>
                  </div>
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-text-tertiary">이번 사이클 정산 내역이 없습니다.</p>
              )}
            </SectionCard>
          </div>
        ) : null}

        {/* 후원 레그별 활성 (마케터) */}
        {isMarketer && sortedLegs.length > 0 ? (
          <SectionCard title="후원 레그별 활성 구독자" action={<span className="text-xs font-medium text-text-tertiary">{sortedLegs.length}개 라인</span>}>
            <div>
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                <span>레그 (직속 자식)</span><span className="text-right">활성 구독자</span><span className="text-right">구분</span>
              </div>
              {sortedLegs.map((l, i) => (
                <div key={l.leg_root} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b py-2.5 text-sm last:border-0">
                  <span className="font-medium text-text-primary">{l.leg_name}</span>
                  <span className="text-right font-semibold tabular-nums text-text-primary">{l.active_count.toLocaleString()}명</span>
                  <span className="text-right">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", i === 0 ? "bg-green-50 text-green-700" : "bg-info-soft text-info")}>{i === 0 ? "대실적" : "소실적"}</span>
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {/* 구독·상품 구매 이력 */}
        {paysSub ? (
          <SectionCard title="구독 · 상품 구매 이력" action={<span className="text-xs font-medium text-text-tertiary">{subs.length}건 · 누적 {usd(totalPaid)}</span>}>
            {subs.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-tertiary">구독 내역이 없습니다.</p>
            ) : (
              <div>
                <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
                  <span>기간</span><span>항목</span><span className="text-right">금액</span><span className="text-right">상태</span>
                </div>
                {subs.slice(0, 12).map((s) => (
                  <div key={s.id} className="grid grid-cols-[1.4fr_0.8fr_0.8fr_auto] items-center gap-3 border-b py-2.5 text-sm last:border-0">
                    <span className="tabular-nums text-text-secondary">{s.period_start} ~ {s.period_end}</span>
                    <span className="text-text-secondary">Alpha Engine</span>
                    <span className="text-right font-semibold tabular-nums text-text-primary">{usd(Number(s.amount_usd))}</span>
                    <span className="text-right">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", s.status === "active" ? "bg-green-50 text-green-700" : "bg-n-100 text-n-500")}>{s.status === "active" ? "활성" : "만료"}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {/* 추천한 회원 (등록회원/구독회원) */}
        {!isMarketer && referred.length > 0 ? (
          <SectionCard title="추천한 회원" action={<span className="text-xs font-medium text-text-tertiary">{referred.length}명</span>}>
            <div>
              {referred.slice(0, 10).map((r) => (
                <Link key={r.id} href={`/admin/members/${r.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b py-2.5 text-sm last:border-0 hover:bg-surface-muted">
                  <span className="font-medium text-text-primary">{toUid(r.id)}</span>
                  <span className={cn("rounded-[7px] px-2 py-0.5 text-[11px] font-semibold", ROLE_BADGE[r.role])}>{ROLE_LABEL[r.role]}</span>
                  <span className="text-xs tabular-nums text-text-tertiary">{r.created_at.slice(0, 10)}</span>
                </Link>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </>
  );
}

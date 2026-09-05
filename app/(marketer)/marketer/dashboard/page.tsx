import { currentCycle } from "@/lib/dates";
import Link from "next/link";
import {
  CoinsIcon,
  SigmaIcon,
  UserPlusIcon,
  NetworkIcon,
  TrophyIcon,
  Share2Icon,
  HashIcon,
  ShoppingCartIcon,
  WalletIcon,
  ExternalLinkIcon,
  CpuIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Pill } from "@/components/ui/pill";
import { WithdrawalRequestModal } from "@/components/withdrawals/withdrawal-request-modal";
import { CopyButton } from "@/components/marketer/copy-button";
import { getMemberRank } from "@/lib/queries/ranks";
import { getReferralCode, listReferred, getMember, getMemberSubscriptions } from "@/lib/queries/members";
import { FORTUNA_APP_URL } from "@/lib/constants";
import { SubscriptionNotice } from "@/components/portal/subscription-notice";
import { getMemberAnnualMembership } from "@/lib/queries/products";
import { today, daysBetween } from "@/lib/dates";
import { getMemberWalletData, getMemberSettlement, getMemberCumulativeCommission } from "@/lib/queries/finance";
import { getMarketerViewerId } from "@/lib/session";
import { toUid } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CYCLE = currentCycle();
const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pct = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);

const CARD = "rounded-[20px] bg-card p-[22px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

export default async function MarketerDashboardPage() {
  const ME = await getMarketerViewerId();
  const [rank, wd, settle, cumulative, code, referred, me, annual, subs] = await Promise.all([
    getMemberRank(ME),
    getMemberWalletData(ME),
    getMemberSettlement(ME, CYCLE),
    getMemberCumulativeCommission(ME),
    getReferralCode(ME),
    listReferred(ME),
    getMember(ME),
    getMemberAnnualMembership(ME),
    getMemberSubscriptions(ME),
  ]);
  // 파트너도 Basic 구독자 — 포르투나 앱(매매 판단 체크) 바로가기용 현재 구독 기간
  const T = today();
  const activeSub = subs.find((s) => s.status === "active" && s.period_start <= T && T <= s.period_end);

  const uid = toUid(ME);
  // 리워드 자격 = 멤버십 유효 + 구독 활성. 만료면 정산·실시간 지급에서 제외된다(is_qualified_marketer).
  const membershipValid = !!annual && daysBetween(today(), annual.period_end.slice(0, 10)) >= 0;
  const rewardsActive = membershipValid && (me?.is_active_subscriber ?? false);
  const balance = wd.wallet?.balance_usd ?? 0;
  const monthTotal = settle?.total ?? wd.monthCommission;
  const level = settle?.level ?? 0;
  const rankAmt = settle?.rank ?? 0;
  const share = settle?.share ?? 0;

  const curRank = settle?.member_rank ?? (rank && rank.rank > 0 ? rank.rank : 0);
  const rankLabel = curRank > 0 ? `${curRank}직급` : "직급 없음";
  const ratePct = rank ? Number(rank.rate_pct) : 0;
  const totalActive = Number(rank?.total_active ?? 0);
  const major = Number(rank?.major_leg ?? 0);
  const minor = Number(rank?.other_minor ?? 0);
  const direct = Number(rank?.direct_active ?? 0);
  const balancePct = Math.round(Number(rank?.balance_pct ?? 0) * 100);
  const nextRank = rank?.next_rank ?? null;
  const nextTotal = rank?.next_min_total ?? null;
  const majorPct = nextTotal ? Math.min(100, Math.round((major / nextTotal) * 100)) : 100;
  const remain = nextTotal ? Math.max(0, nextTotal - major) : 0;
  const shareGated = curRank >= 5;
  const shareOk = rank ? !rank.blocked_by_balance : true;

  // 리워드 구성 도넛
  const lp = pct(level, monthTotal);
  const rp = pct(rankAmt, monthTotal);
  const sp = pct(share, monthTotal);
  const donut = `conic-gradient(#1f9d55 0 ${lp}%, #7c3aed ${lp}% ${lp + rp}%, #2f6fed ${lp + rp}% 100%)`;
  const comp = [
    { label: "초대 리워드", v: level, p: lp, dot: "bg-green-500" },
    { label: "직급 리워드", v: rankAmt, p: rp, dot: "bg-crypto" },
    { label: "팀 리워드", v: share, p: sp, dot: "bg-info" },
  ];

  // 초대 실적
  const refTotal = referred.length;
  const refSub = referred.filter((m) => m.is_active_subscriber).length;
  const refMkt = referred.filter((m) => m.role === "marketer").length;
  const codeStr = code?.code ?? "—";

  const kpis = [
    { icon: CoinsIcon, badge: "bg-green-50 text-green-700", label: "당월 리워드", value: usd(monthTotal) },
    { icon: SigmaIcon, badge: "bg-text-primary text-white", label: "누적 리워드", value: usd(cumulative) },
    { icon: UserPlusIcon, badge: "bg-green-50 text-green-700", label: "초대 활성", value: `${direct.toLocaleString()}명` },
    { icon: NetworkIcon, badge: "bg-n-100 text-n-600", label: "팀원 수", value: `${totalActive.toLocaleString()}명` },
  ];

  const quick = [
    { href: "/marketer/genealogy", icon: NetworkIcon, label: "내 팀", tone: "bg-green-50 text-green-700" },
    { href: "/marketer/referral", icon: Share2Icon, label: "초대", tone: "bg-info-soft text-info" },
    { href: "/marketer/commissions", icon: CoinsIcon, label: "내 리워드", tone: "bg-crypto-soft text-crypto" },
    { href: "/marketer/orders", icon: ShoppingCartIcon, label: "구독·주문", tone: "bg-warning-soft text-warning" },
  ];

  return (
    <>
      <Topbar title="대시보드" sub="내 직급 · 리워드 현황" uid={uid} />

      <div className="flex-1 space-y-4 overflow-auto bg-canvas p-7">
        {/* 구독 만료 / 잔액 부족 안내 */}
        <SubscriptionNotice memberId={ME} role="marketer" />

        {/* 포르투나 앱 바로가기 — 파트너도 앱 이용자. 구독 만료면 갱신으로 안내 */}
        <div className="flex items-center justify-between gap-4 rounded-[20px] bg-feature p-5 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <div className="flex items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-white/10"><CpuIcon className="size-6" /></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold">포르투나 앱</span>
                <Pill tone={activeSub ? "green" : "negative"} dot={!!activeSub}>{activeSub ? "매매 판단 체크 이용 중" : "구독 만료"}</Pill>
              </div>
              <div className="mt-0.5 text-xs text-white/60">
                {activeSub
                  ? `이용 기간 ${activeSub.period_start.slice(0, 10)} ~ ${activeSub.period_end.slice(0, 10)} · AI 리서치 · 후보 레이더 · 거래 일지`
                  : "구독을 갱신하면 앱 이용과 리워드 지급이 다시 시작됩니다"}
              </div>
            </div>
          </div>
          {activeSub ? (
            <a
              href={FORTUNA_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-white px-5 py-2.5 text-sm font-bold whitespace-nowrap text-green-700"
            >
              <ExternalLinkIcon className="size-4" /> 포르투나 앱 열기
            </a>
          ) : (
            <Link href="/marketer/orders" className="inline-flex shrink-0 items-center gap-2 rounded-[10px] bg-white px-5 py-2.5 text-sm font-bold whitespace-nowrap text-green-700">
              구독 갱신
            </Link>
          )}
        </div>

        {/* RowA — 내 직급·자격 + 출금 잔액 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_392px]">
          <div className={cn(CARD, "space-y-4")}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-text-primary">내 직급 · 자격</div>
                <div className="text-xs text-text-secondary">팀 활성 구독자 기준</div>
              </div>
              <div className="flex items-center gap-1.5">
                <Pill tone={rewardsActive ? "green" : "negative"} dot={rewardsActive}>{rewardsActive ? "리워드 지급 중" : membershipValid ? "리워드 정지 · 구독 만료" : "리워드 정지 · 멤버십 만료"}</Pill>
                <Pill tone="crypto"><TrophyIcon className="size-3" /> {rankLabel}{curRank > 0 ? ` · ${ratePct}%` : ""}</Pill>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-medium text-text-secondary">{nextRank ? `다음 ${nextRank}직급까지` : "최고 직급"}</span>
                <span className="font-bold tabular-nums text-text-primary">{nextTotal ? `${major.toLocaleString()} / ${nextTotal.toLocaleString()}명` : `${totalActive.toLocaleString()}명`}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-green-600" style={{ width: `${majorPct}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { k: "팀 전체 활성", v: `${totalActive.toLocaleString()}명` },
                { k: "주력 라인", v: `${major.toLocaleString()}명` },
                { k: "기타 라인", v: `${minor.toLocaleString()}명` },
                { k: "30% 균형", v: shareGated ? (shareOk ? "충족" : "미충족") : `${balancePct}%` },
              ].map((s) => (
                <div key={s.k} className="rounded-[10px] bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                  <div className="text-[11px] text-text-tertiary">{s.k}</div>
                  <div className="mt-0.5 text-[15px] font-bold tabular-nums text-text-primary">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-[20px] bg-gradient-to-br from-lime to-green-600 p-[22px] text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
            <div className="flex items-start justify-between">
              <span className="text-[13px] font-semibold text-white/80">출금 가능 잔액</span>
              <span className="grid size-9 place-items-center rounded-full bg-white/15"><WalletIcon className="size-[18px]" /></span>
            </div>
            <div className="text-[38px] leading-none font-bold tabular-nums">{usd(balance)} <span className="text-base font-semibold text-white/80">USDT</span></div>
            <WithdrawalRequestModal
              memberId={ME}
              balance={balance}
              defaultAddress={me?.payout_address_trc20 ?? me?.payout_address_bep20 ?? ""}
              defaultNetwork={me?.payout_address_trc20 ? "TRC20" : me?.payout_address_bep20 ? "BEP20" : "TRC20"}
            />
          </div>
        </div>

        {/* RowB — KPI 4 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className={cn("flex items-center gap-3 rounded-[14px] bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]")}>
              <span className={cn("grid size-10 place-items-center rounded-[12px]", k.badge)}><k.icon className="size-[19px]" /></span>
              <div>
                <div className="text-xs text-text-secondary">{k.label}</div>
                <div className="text-xl font-bold tabular-nums text-text-primary">{k.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* RowC — 리워드 구성 도넛 + 내 초대 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_392px]">
          <div className={cn(CARD, "flex items-center gap-7")}>
            <div className="relative grid size-[150px] shrink-0 place-items-center rounded-full" style={{ background: donut }}>
              <div className="grid size-[96px] place-items-center rounded-full bg-card text-center">
                <div>
                  <div className="text-[18px] font-bold tabular-nums text-text-primary">{monthTotal >= 1000 ? `$${(monthTotal / 1000).toFixed(1)}K` : usd(monthTotal)}</div>
                  <div className="text-[10px] text-text-tertiary">당월 리워드</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3.5">
              <div className="text-[15px] font-bold text-text-primary">내 리워드 구성 (당월)</div>
              {comp.map((c) => (
                <div key={c.label} className="flex items-center gap-2.5">
                  <span className={cn("size-2.5 shrink-0 rounded-full", c.dot)} />
                  <span className="flex-1 text-[13px] font-medium text-text-secondary">{c.label}</span>
                  <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd(c.v)}</span>
                  <span className="w-9 text-right text-xs font-semibold text-text-tertiary">{c.p}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn(CARD, "space-y-3.5")}>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-[10px] bg-crypto-soft text-crypto"><Share2Icon className="size-[18px]" /></span>
              <span className="text-base font-bold text-text-primary">내 초대</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-text-tertiary">내 초대 코드</div>
              <div className="flex items-center justify-between rounded-[10px] bg-surface-muted px-3.5 py-2.5 ring-1 ring-border">
                <span className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-text-primary"><HashIcon className="size-3 text-text-tertiary" /> {codeStr}</span>
                <CopyButton text={codeStr} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {[
                { k: "가입", v: refTotal },
                { k: "구독 전환", v: refSub },
                { k: "파트너", v: refMkt },
              ].map((s) => (
                <div key={s.k} className="rounded-[10px] bg-surface-muted py-2.5 text-center ring-1 ring-border">
                  <div className="text-[17px] font-bold tabular-nums text-text-primary">{s.v}</div>
                  <div className="text-[11px] text-text-tertiary">{s.k}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RowD — 직급 상승 진행 + 빠른 작업 */}
        <div className="grid gap-4 lg:grid-cols-[1fr_412px]">
          <div className={cn(CARD, "space-y-4")}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[15px] font-bold text-text-primary">직급 상승 진행</div>
                <div className="text-xs text-text-secondary">현재 {rankLabel} {nextRank ? `→ 다음 ${nextRank}직급` : "· 최고 직급"}</div>
              </div>
              <Pill tone="crypto">달성 {majorPct}%</Pill>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-text-primary">주력 라인</span>
                  <span className="font-bold tabular-nums text-text-primary">{nextTotal ? `${major.toLocaleString()} / ${nextTotal.toLocaleString()}명` : `${major.toLocaleString()}명`}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-green-600" style={{ width: `${majorPct}%` }} /></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-text-primary">기타 라인 합계</span>
                  <span className="font-bold tabular-nums text-text-primary">{minor.toLocaleString()}명 ({balancePct}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-info" style={{ width: `${Math.min(100, balancePct)}%` }} /></div>
              </div>
              <div className={cn("flex items-center justify-between rounded-[10px] px-3.5 py-3 text-[13px]", !shareGated ? "bg-surface-muted text-text-secondary" : shareOk ? "bg-green-50 text-green-700" : "bg-warning-soft text-warning")}>
                <span className="font-semibold">팀 리워드 30% 자격 (5직급↑)</span>
                <span className="font-bold">{!shareGated ? "5직급부터" : shareOk ? "충족" : "미충족"}</span>
              </div>
            </div>
            {nextRank ? (
              <p className="border-t pt-3 text-[12px] text-text-secondary">다음 직급({nextRank}직급)까지 주력 라인 {remain.toLocaleString()}명 남았습니다.</p>
            ) : null}
          </div>

          <div className={cn(CARD, "space-y-3.5")}>
            <div className="text-base font-bold text-text-primary">빠른 작업</div>
            <div className="grid grid-cols-2 gap-3">
              {quick.map((q) => (
                <Link key={q.href} href={q.href} className="flex flex-col items-start gap-2.5 rounded-[12px] bg-surface-muted p-3.5 ring-1 ring-border transition-colors hover:ring-green-500">
                  <span className={cn("grid size-9 place-items-center rounded-[10px]", q.tone)}><q.icon className="size-[18px]" /></span>
                  <span className="text-[13px] font-semibold text-text-primary">{q.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 최근 리워드 내역 */}
        <div className={cn(CARD, "pt-3")}>
          <div className="mb-1 text-[15px] font-bold text-text-primary">최근 리워드 내역</div>
          <div className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
            <span>사이클</span><span>유형</span><span>내역</span><span className="text-right">금액</span>
          </div>
          {comp.filter((c) => c.v > 0).length === 0 ? (
            <div className="py-8 text-center text-sm text-text-tertiary">당월 리워드 내역이 없습니다.</div>
          ) : (
            comp.filter((c) => c.v > 0).map((c) => (
              <div key={c.label} className="grid grid-cols-[auto_1fr_1.5fr_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{CYCLE}</span>
                <span><Pill tone={c.dot.includes("green") ? "green" : c.dot.includes("crypto") ? "crypto" : "info"}>{c.label.replace(" 리워드", "")}</Pill></span>
                <span className="text-text-secondary">당월 정산 적립</span>
                <span className="text-right font-bold tabular-nums text-green-700">+{usd(c.v)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

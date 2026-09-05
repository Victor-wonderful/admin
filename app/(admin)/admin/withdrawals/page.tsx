import Link from "next/link";
import {
  CalendarCheckIcon,
  DollarSignIcon,
  SigmaIcon,
  ClockIcon,
  SendIcon,
  WalletIcon,
  SearchIcon,
  ExternalLinkIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { can } from "@/lib/admin-permissions";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { WithdrawalActions } from "@/components/withdrawals/withdrawal-actions";
import { CopyButton } from "@/components/marketer/copy-button";
import { listWithdrawals, getWithdrawalSummary } from "@/lib/queries/finance";
import { addressExplorerUrl } from "@/lib/chain/explorer";
import { toUid, uidInitials } from "@/lib/uid";
import { toSeoulDateTime, currentCycle } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { WithdrawalStatus } from "@/lib/actions/withdrawals";

export const dynamic = "force-dynamic";

// 출금내역 — 상태·네트워크 필터(링크), 회원·주소 검색(GET ?q=), 주소 복사. 필터는 주소에 남아 공유 가능.
const SUBCARD =
  "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-n-100 text-n-500",
};

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : usd(n));

const NET_DOT: Record<string, string> = {
  TRC20: "bg-green-500",
  BEP20: "bg-warning",
  BSC: "bg-warning", // 구 데이터 표기
  ERC20: "bg-info",
  Polygon: "bg-crypto",
};

const STATE: Record<WithdrawalStatus, { label: string; tone: "warning" | "info" | "green" | "negative" | "neutral" }> = {
  pending: { label: "승인 대기", tone: "warning" },
  approved: { label: "승인됨", tone: "info" },
  sending: { label: "송금 중", tone: "info" },
  completed: { label: "완료", tone: "green" },
  rejected: { label: "반려", tone: "negative" },
};
const STATUS_ORDER: Array<"all" | WithdrawalStatus> = ["all", "pending", "approved", "sending", "completed", "rejected"];
const NETWORKS = ["TRC20", "BEP20"] as const;
const PAGE = 50;

const COLS = "grid-cols-[110px_1.3fr_1.9fr_92px_112px_188px]";

const fmtTime = (iso: string) => toSeoulDateTime(iso); // 서울 기준
function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<{ status?: string; network?: string; q?: string }> }) {
  const admin = await requireAdminPage("withdrawals");
  const readOnly = !can(admin.role, "finance.write");
  const sp = await searchParams;
  const status = (STATUS_ORDER as string[]).includes(sp.status ?? "") ? (sp.status as "all" | WithdrawalStatus) : "all";
  const network = (NETWORKS as readonly string[]).includes(sp.network ?? "") ? sp.network! : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const ql = q.toLowerCase();

  const [all, sum] = await Promise.all([listWithdrawals(1000), getWithdrawalSummary()]);
  const cycle = currentCycle();

  const matches = (r: (typeof all)[number]) => {
    if (status !== "all" && r.status !== status) return false;
    if (network !== "all" && (r.network === "BSC" ? "BEP20" : r.network) !== network) return false;
    if (ql) {
      const hay = `${toUid(r.member_id)} ${r.members?.display_name ?? ""} ${r.members?.email ?? ""} ${r.to_address} ${r.tx_hash ?? ""}`.toLowerCase();
      if (!hay.includes(ql)) return false;
    }
    return true;
  };
  const filtered = all.filter(matches);
  const rows = filtered.slice(0, PAGE);
  const countBy = (k: "all" | WithdrawalStatus) => all.filter((r) => k === "all" || r.status === k).length;

  const href = (o: { status?: string; network?: string; q?: string }) => {
    const p = new URLSearchParams();
    const s = o.status ?? status; const n = o.network ?? network; const qq = o.q ?? q;
    if (s !== "all") p.set("status", s);
    if (n !== "all") p.set("network", n);
    if (qq) p.set("q", qq);
    const qs = p.toString();
    return `/admin/withdrawals${qs ? `?${qs}` : ""}`;
  };
  const hasFilter = status !== "all" || network !== "all" || Boolean(q);

  const KPIS = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당월 완료 출금", value: compact(sum.completedMonthAmount), info: cycle },
    { icon: DollarSignIcon, tone: "green" as const, label: "누적 출금 (완료)", value: compact(sum.completedTotalAmount), info: "전체 기간" },
    { icon: SigmaIcon, tone: "neutral" as const, label: "총 신청 건수", value: `${all.length.toLocaleString()}건`, info: `완료 ${countBy("completed")} · 반려 ${countBy("rejected")}` },
    { icon: ClockIcon, tone: "warning" as const, label: "승인 대기", value: compact(sum.pendingAmount), info: `${sum.pendingCount}건 대기`, warn: sum.pendingCount > 0 },
    { icon: SendIcon, tone: "info" as const, label: "송금 중", value: compact(sum.sendingAmount), info: `${sum.sendingCount}건 · tx_hash 입력 대기` },
    { icon: WalletIcon, tone: "green" as const, label: "출금 가능 잔액", value: compact(sum.operatingBalance), info: "운영 지갑" },
  ];

  return (
    <>
      <Topbar title="출금내역" sub="회원 출금 신청 · 승인 · 지갑 앱에서 송금 후 tx_hash 입력 (USDT)" uid={admin.display_name} />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 상단 KPI 6종 ── */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k) => (
            <div key={k.label} className={cn(SUBCARD, "space-y-3")}>
              <div className="flex items-center gap-2.5">
                <div className={cn("grid size-9 shrink-0 place-items-center rounded-[10px]", badgeTone[k.tone])}>
                  <k.icon className="size-[18px]" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{k.label}</span>
              </div>
              <div className="text-[22px] leading-none font-bold tabular-nums text-text-primary">{k.value}</div>
              <span className={cn("text-[11px] font-medium", "warn" in k && k.warn ? "text-warning" : "text-text-tertiary")}>{k.info}</span>
            </div>
          ))}
        </section>

        {/* ── 출금 승인 큐 ── */}
        <Panel bodyClassName="overflow-x-auto">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
                {STATUS_ORDER.map((k) => {
                  const on = status === k;
                  return (
                    <Link key={k} href={href({ status: k })} className={cn("flex items-center gap-1 rounded-[7px] px-2.5 py-1 text-[12px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-n-500 hover:text-text-primary")}>
                      {k === "all" ? "전체" : STATE[k].label}<span className={cn("text-[11px] tabular-nums", on ? "text-green-600" : "text-n-400")}>{countBy(k)}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
                {(["all", ...NETWORKS] as const).map((n) => {
                  const on = network === n;
                  return (
                    <Link key={n} href={href({ network: n })} className={cn("flex items-center gap-1.5 rounded-[7px] px-2.5 py-1 text-[12px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-n-500 hover:text-text-primary")}>
                      {n !== "all" ? <span className={cn("size-1.5 rounded-full", NET_DOT[n])} /> : null}{n === "all" ? "전체 네트워크" : n}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <form method="get" action="/admin/withdrawals" className="flex items-center gap-2 rounded-[10px] bg-card px-3 py-1.5 ring-1 ring-border-strong">
                {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
                {network !== "all" ? <input type="hidden" name="network" value={network} /> : null}
                <SearchIcon className="size-3.5 text-text-tertiary" />
                <input name="q" defaultValue={q} placeholder="UID · 닉네임 · 이메일 · 주소 · tx" className="w-[220px] bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
              </form>
              {hasFilter ? <Link href="/admin/withdrawals" className="text-[12px] font-medium text-text-tertiary hover:text-text-primary">초기화</Link> : null}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-[12px] text-text-tertiary">
            <span>{hasFilter ? `조건 일치 ${filtered.length.toLocaleString()}건` : `전체 ${all.length.toLocaleString()}건`}{filtered.length > PAGE ? ` · 최근 ${PAGE}건 표시` : ""}</span>
            <span>승인 → 송금 시작 → 지갑 앱(TronLink/MetaMask)에서 보낸 뒤 tx_hash 입력으로 완료</span>
          </div>

          <div className="min-w-[960px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>신청일시</span>
              <span>회원</span>
              <span>신청 금액 · 출금 주소</span>
              <span>네트워크</span>
              <span>상태</span>
              <span className="text-right">처리</span>
            </div>
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-tertiary">{all.length === 0 ? "출금 신청이 없습니다." : "조건에 맞는 출금 신청이 없습니다."}</div>
            ) : (
              rows.map((r) => {
                const st = STATE[r.status as WithdrawalStatus] ?? STATE.pending;
                const addrUrl = addressExplorerUrl(r.network === "BSC" ? "BEP20" : r.network, r.to_address);
                return (
                  <div key={r.id} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS)}>
                    <span className="text-[12px] tabular-nums text-text-tertiary">{fmtTime(r.requested_at)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">{uidInitials(r.member_id)}</span>
                      <div className="min-w-0">
                        <Link href={`/admin/members/${r.member_id}`} className="block truncate text-[13px] font-semibold text-text-primary hover:underline">{toUid(r.member_id)}</Link>
                        <span className="block truncate text-[10px] text-text-tertiary">{r.members?.display_name ?? ""}{r.members?.email ? ` · ${r.members.email}` : ""}</span>
                      </div>
                    </div>
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-bold tabular-nums text-text-primary">{usd(Number(r.amount_usd))}</span>
                      {addrUrl ? (
                        <a href={addrUrl} target="_blank" rel="noopener noreferrer" title={r.to_address} className="inline-flex items-center gap-1 font-mono text-[12px] text-text-tertiary hover:text-text-primary hover:underline">
                          {shortAddr(r.to_address)} <ExternalLinkIcon className="size-3" />
                        </a>
                      ) : (
                        <span title={r.to_address} className="font-mono text-[12px] text-text-tertiary">{shortAddr(r.to_address)}</span>
                      )}
                      <CopyButton text={r.to_address} label="주소 복사" className="bg-card text-text-secondary ring-1 ring-border-strong hover:bg-surface-muted" />
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-text-tertiary">
                      <span className={cn("size-1.5 rounded-full", NET_DOT[r.network] ?? "bg-n-400")} />
                      {r.network}
                    </span>
                    <span><Pill tone={st.tone} dot={r.status === "completed"}>{st.label}</Pill></span>
                    <WithdrawalActions id={r.id} status={r.status as WithdrawalStatus} network={r.network} txHash={r.tx_hash} readOnly={readOnly} />
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

import Link from "next/link";
import {
  SearchIcon,
  CalendarCheckIcon,
  DollarSignIcon,
  SigmaIcon,
  ReceiptIcon,
  TriangleAlertIcon,
  ExternalLinkIcon,
  RadarIcon,
  HashIcon,
  CircleCheckIcon,
  CircleAlertIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { can } from "@/lib/admin-permissions";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DepositScanButton, UnmatchedDepositActions } from "@/components/deposits/deposit-actions";
import { listOnchainDeposits, listUnmatchedDeposits, getScanStates, getDepositConfigStatus, getDepositSummary } from "@/lib/queries/deposits";
import { listTransactions } from "@/lib/queries/finance";
import { txExplorerUrl, addressExplorerUrl, shortHash, NETWORK_LABEL } from "@/lib/chain/explorer";
import { toSeoulDateTime, currentCycle } from "@/lib/dates";
import { toUid, uidInitials } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 입금내역 — 온체인 입금 감지 원장(실데이터). 회사 입금 주소로 들어온 USDT 를 스캔해 회원 잔액에 반영한다.
const SUBCARD = "rounded-lg bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";

const badgeTone: Record<string, string> = {
  green: "bg-green-50 text-green-700",
  crypto: "bg-crypto-soft text-crypto",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-n-100 text-n-500",
};

const NET_DOT: Record<string, string> = { TRC20: "bg-green-500", BEP20: "bg-warning" };

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : usd(n));
const shortAddr = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a);

const STATUS: Record<string, { label: string; tone: "green" | "warning" | "neutral" }> = {
  credited: { label: "잔액 반영", tone: "green" },
  unmatched: { label: "미확인", tone: "warning" },
  ignored: { label: "무시", tone: "neutral" },
};

const COLS = "grid-cols-[104px_1.2fr_1.4fr_1.5fr_1.3fr_120px]";
const STATUS_ORDER = ["all", "credited", "unmatched", "ignored"] as const;
const NETWORKS = ["TRC20", "BEP20"] as const;
const PAGE = 50;
const UNMATCHED_COLS = "grid-cols-[104px_92px_1.6fr_1.3fr_auto]";

export default async function AdminDepositsPage({ searchParams }: { searchParams: Promise<{ status?: string; network?: string; q?: string }> }) {
  const admin = await requireAdminPage("deposits");
  const readOnly = !can(admin.role, "finance.write");
  const sp = await searchParams;
  const status = (STATUS_ORDER as readonly string[]).includes(sp.status ?? "") ? (sp.status as (typeof STATUS_ORDER)[number]) : "all";
  const network = (NETWORKS as readonly string[]).includes(sp.network ?? "") ? sp.network! : "all";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const ql = q.toLowerCase();
  const [sum, states, unmatched, onchainAll, ledgerAll] = await Promise.all([
    getDepositSummary(),
    getScanStates(),
    listUnmatchedDeposits(),
    listOnchainDeposits(1000),
    listTransactions({ type: "deposit", limit: 1000 }),
  ]);
  // 필터 — 온체인 원장: 상태·네트워크·검색(UID·주소·해시) / 잔액 반영 내역: 네트워크·검색(UID·닉네임·이메일·해시)
  const onchainFiltered = onchainAll.filter((d) => {
    if (status !== "all" && d.status !== status) return false;
    if (network !== "all" && d.network !== network) return false;
    if (ql && !`${d.member_id ? toUid(d.member_id) : ""} ${d.from_address} ${d.tx_hash}`.toLowerCase().includes(ql)) return false;
    return true;
  });
  const onchain = onchainFiltered.slice(0, PAGE);
  const ledgerFiltered = ledgerAll.filter((r) => {
    if (network !== "all" && (r.network ?? "") !== network) return false;
    if (ql && !`${toUid(r.member_id)} ${r.members?.display_name ?? ""} ${r.members?.email ?? ""} ${r.tx_hash ?? ""}`.toLowerCase().includes(ql)) return false;
    return true;
  });
  const ledger = ledgerFiltered.slice(0, PAGE);
  const countBy = (k: string) => onchainAll.filter((d) => k === "all" || d.status === k).length;
  const href = (o: { status?: string; network?: string; q?: string }) => {
    const p = new URLSearchParams();
    const s = o.status ?? status; const n = o.network ?? network; const qq = o.q ?? q;
    if (s !== "all") p.set("status", s);
    if (n !== "all") p.set("network", n);
    if (qq) p.set("q", qq);
    const qs = p.toString();
    return `/admin/deposits${qs ? `?${qs}` : ""}`;
  };
  const hasFilter = status !== "all" || network !== "all" || Boolean(q);
  const configs = getDepositConfigStatus();
  const readyCount = configs.filter((c) => c.ready).length;

  const KPIS = [
    { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 입금", value: compact(sum.todayAmount), info: `${sum.todayCount}건` },
    { icon: DollarSignIcon, tone: "green" as const, label: "당월 입금 총액", value: compact(sum.monthAmount), info: `${currentCycle()} · ${sum.monthCount}건` },
    { icon: SigmaIcon, tone: "neutral" as const, label: "누적 입금 (전체)", value: compact(sum.totalAmount), info: "전체 기간" },
    { icon: ReceiptIcon, tone: "info" as const, label: "입금 건수", value: `${sum.totalCount}건`, info: "잔액 반영 기준" },
    { icon: RadarIcon, tone: "crypto" as const, label: "스캔 연동", value: `${readyCount} / ${configs.length}`, info: readyCount === configs.length ? "전 네트워크 준비" : "키·주소 미설정 있음", warn: readyCount < configs.length },
    { icon: TriangleAlertIcon, tone: "warning" as const, label: "미확인 입금", value: `${sum.unmatchedCount}건`, info: sum.unmatchedCount ? `${usd(sum.unmatchedAmount)} 매칭 대기` : "대기 없음", warn: sum.unmatchedCount > 0 },
  ];

  return (
    <>
      <Topbar title="입금내역" sub="회사 입금 주소로 들어온 USDT · 보낸 주소로 회원 식별 · 잔액 반영" uid={admin.display_name} actions={<DepositScanButton readOnly={readOnly} />} />

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

        {/* ── 연동 상태(네트워크별) ── */}
        <section className="grid gap-4 lg:grid-cols-2">
          {configs.map((c) => {
            const st = states.find((s) => s.network === c.network);
            const addrUrl = addressExplorerUrl(c.network, c.address);
            return (
              <div key={c.network} className={cn(SUBCARD, "space-y-3")}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    <span className={cn("size-2 rounded-full", NET_DOT[c.network])} /> {NETWORK_LABEL[c.network]}
                  </span>
                  {c.ready ? <Pill tone="green" dot>스캔 준비됨</Pill> : <Pill tone="warning">미설정</Pill>}
                </div>
                <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 ring-1 ring-border">
                  <HashIcon className="size-3 shrink-0 text-text-tertiary" />
                  {c.address ? (
                    <a href={addrUrl ?? "#"} target="_blank" rel="noopener noreferrer" className="flex-1 truncate font-mono text-xs text-text-primary hover:underline">
                      {c.address}
                    </a>
                  ) : (
                    <span className="flex-1 text-xs text-text-tertiary">회사 입금 주소 미설정</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
                  <span className="text-text-secondary">마지막 스캔</span>
                  <span className="text-right font-medium text-text-primary">{st?.last_run_at ? toSeoulDateTime(st.last_run_at) : "—"}</span>
                  <span className="text-text-secondary">커서(마지막 블록 시각)</span>
                  <span className="text-right font-medium text-text-primary">{st?.last_block_time ? toSeoulDateTime(st.last_block_time) : "—"}</span>
                  <span className="text-text-secondary">마지막 조회 건수</span>
                  <span className="text-right font-medium text-text-primary">{st?.seen_count ?? 0}</span>
                </div>
                {!c.ready ? (
                  <div className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-[11px] leading-relaxed text-text-secondary">
                    <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    <span>환경변수 필요: <span className="font-mono">{c.missing.join(", ")}</span> — 운영은 Vercel 환경변수, 로컬은 .env.local 에 기입 후 재배포·재시작</span>
                  </div>
                ) : st?.last_error ? (
                  <div className="flex items-start gap-2 rounded-md bg-negative-soft px-3 py-2 text-[11px] leading-relaxed text-negative">
                    <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" /> 마지막 오류: {st.last_error}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
                    <CircleCheckIcon className="size-3.5 text-green-600" /> 크론 /api/cron/deposits 또는 ‘지금 스캔’으로 조회
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ── 미확인 입금 (수동 매칭) ── */}
        {unmatched.length > 0 ? (
          <Panel
            title="미확인 입금"
            sub="보낸 주소가 회원 프로필의 지갑 주소와 일치하지 않은 건 · 회원을 지정해 반영하거나 무시"
            action={<Pill tone="warning">{unmatched.length}건 대기</Pill>}
            bodyClassName="overflow-x-auto"
          >
            <div className="min-w-[760px]">
              <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", UNMATCHED_COLS)}>
                <span>블록 시각</span><span>네트워크</span><span>보낸 주소 · TxHash</span><span>금액</span><span className="text-right">처리</span>
              </div>
              {unmatched.map((d) => (
                <div key={d.id} className={cn("grid items-center gap-3 border-b py-3 text-sm last:border-0", UNMATCHED_COLS)}>
                  <span className="text-[12px] tabular-nums text-text-tertiary">{toSeoulDateTime(d.block_time)}</span>
                  <span className="flex items-center gap-1 text-[12px] text-text-tertiary"><span className={cn("size-1.5 rounded-full", NET_DOT[d.network])} />{d.network}</span>
                  <span className="flex flex-col gap-0.5">
                    <a href={addressExplorerUrl(d.network, d.from_address) ?? "#"} target="_blank" rel="noopener noreferrer" className="font-mono text-[12px] text-text-primary hover:underline">{d.from_address}</a>
                    <a href={txExplorerUrl(d.network, d.tx_hash) ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-text-tertiary hover:underline">
                      {shortHash(d.tx_hash)} <ExternalLinkIcon className="size-3" />
                    </a>
                  </span>
                  <span className="text-[13px] font-bold tabular-nums text-green-700">{usd(d.amount_usd)} USDT</span>
                  <UnmatchedDepositActions depositId={d.id} readOnly={readOnly} />
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {/* ── 온체인 감지 원장 ── */}
        <Panel
          title="온체인 입금 원장"
          sub={`스캔으로 감지된 전송 · ${hasFilter ? `조건 일치 ${onchainFiltered.length.toLocaleString()}건` : `전체 ${onchainAll.length.toLocaleString()}건`}${onchainFiltered.length > PAGE ? ` · 최근 ${PAGE}건 표시` : ""}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-0.5 rounded-[10px] bg-n-100 p-[3px] ring-1 ring-border">
                {STATUS_ORDER.map((k) => {
                  const on = status === k;
                  return (
                    <Link key={k} href={href({ status: k })} className={cn("flex items-center gap-1 rounded-[7px] px-2.5 py-1 text-[12px] transition-colors", on ? "bg-card font-semibold text-text-primary shadow-sm ring-1 ring-border" : "font-medium text-n-500 hover:text-text-primary")}>
                      {k === "all" ? "전체" : STATUS[k].label}<span className={cn("text-[11px] tabular-nums", on ? "text-green-600" : "text-n-400")}>{countBy(k)}</span>
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
              <form method="get" action="/admin/deposits" className="flex items-center gap-2 rounded-[10px] bg-card px-3 py-1.5 ring-1 ring-border-strong">
                {status !== "all" ? <input type="hidden" name="status" value={status} /> : null}
                {network !== "all" ? <input type="hidden" name="network" value={network} /> : null}
                <SearchIcon className="size-3.5 text-text-tertiary" />
                <input name="q" defaultValue={q} placeholder="UID · 보낸 주소 · tx hash" className="w-[200px] bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
              </form>
              {hasFilter ? <Link href="/admin/deposits" className="text-[12px] font-medium text-text-tertiary hover:text-text-primary">초기화</Link> : null}
            </div>
          }
          bodyClassName="overflow-x-auto"
        >
          <div className="min-w-[900px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>블록 시각</span><span>회원</span><span>보낸 주소</span><span>TxHash</span><span>금액 · 네트워크</span><span className="text-right">상태</span>
            </div>
            {onchain.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-tertiary">
                {onchainAll.length > 0 ? "조건에 맞는 온체인 입금이 없습니다." : <>감지된 온체인 입금이 없습니다. {readyCount === 0 ? "키·주소를 설정하면 스캔이 시작됩니다." : "‘지금 스캔’을 누르거나 크론이 돌면 여기에 쌓입니다."}</>}
              </div>
            ) : (
              onchain.map((d) => {
                const st = STATUS[d.status] ?? STATUS.unmatched;
                return (
                  <div key={d.id} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS)}>
                    <span className="text-[12px] tabular-nums text-text-tertiary">{toSeoulDateTime(d.block_time)}</span>
                    {d.member_id ? (
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">{uidInitials(d.member_id)}</span>
                        <Link href={`/admin/members/${d.member_id}`} className="truncate text-[13px] font-semibold text-text-primary hover:underline">{toUid(d.member_id)}</Link>
                      </div>
                    ) : (
                      <span className="text-[12px] text-text-tertiary">미매칭</span>
                    )}
                    <a href={addressExplorerUrl(d.network, d.from_address) ?? "#"} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-[12px] text-text-secondary hover:underline">{shortAddr(d.from_address)}</a>
                    <a href={txExplorerUrl(d.network, d.tx_hash) ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[12px] text-text-tertiary hover:underline">
                      {shortHash(d.tx_hash)} <ExternalLinkIcon className="size-3 text-n-400" />
                    </a>
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-bold tabular-nums text-green-700">{usd(d.amount_usd)}</span>
                      <span className="flex items-center gap-1 text-[11px] text-text-tertiary"><span className={cn("size-1.5 rounded-full", NET_DOT[d.network])} />{d.network}</span>
                    </span>
                    <span className="flex justify-end"><Pill tone={st.tone} dot={d.status === "credited"}>{st.label}</Pill></span>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        {/* ── 잔액 반영 입금 내역(지갑 원장) ── */}
        <Panel title="잔액 반영 입금 내역" sub={`회원 지갑에 실제로 더해진 입금 · 온체인 반영 + 개발용 테스트 입금 · ${hasFilter ? `조건 일치 ${ledgerFiltered.length.toLocaleString()}건` : `전체 ${ledgerAll.length.toLocaleString()}건`}${ledgerFiltered.length > PAGE ? ` · 최근 ${PAGE}건 표시` : ""}${q ? " · 검색은 UID·닉네임·이메일·해시" : ""}`} bodyClassName="overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[104px_1.2fr_1.4fr_1fr_120px] items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary">
              <span>일시</span><span>회원</span><span>TxHash</span><span>금액 · 네트워크</span><span className="text-right">상태</span>
            </div>
            {ledger.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-tertiary">{ledgerAll.length > 0 ? "조건에 맞는 입금 내역이 없습니다." : "입금 내역이 없습니다."}</div>
            ) : (
              ledger.map((r) => {
                const url = txExplorerUrl(r.network, r.tx_hash);
                return (
                  <div key={r.id} className="grid grid-cols-[104px_1.2fr_1.4fr_1fr_120px] items-center gap-3 border-b py-3 text-sm last:border-0">
                    <span className="text-[12px] tabular-nums text-text-tertiary">{toSeoulDateTime(r.created_at)}</span>
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-green-50 text-[10px] font-bold text-green-700">{uidInitials(r.member_id)}</span>
                      <div className="min-w-0">
                        <Link href={`/admin/members/${r.member_id}`} className="block truncate text-[13px] font-semibold text-text-primary hover:underline">{toUid(r.member_id)}</Link>
                        <span className="block truncate text-[10px] text-text-tertiary">{r.members?.display_name ?? ""}{r.members?.email ? ` · ${r.members.email}` : ""}</span>
                      </div>
                    </div>
                    {r.tx_hash ? (
                      <a href={url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[12px] text-text-tertiary hover:underline">
                        {shortHash(r.tx_hash)} <ExternalLinkIcon className="size-3 text-n-400" />
                      </a>
                    ) : (
                      <span className="text-[12px] text-text-tertiary">— (테스트 입금)</span>
                    )}
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-bold tabular-nums text-green-700">{usd(Number(r.amount_usd))}</span>
                      <span className="text-[11px] text-text-tertiary">{r.network ?? "—"}</span>
                    </span>
                    <span className="flex justify-end"><Pill tone={r.status === "completed" ? "green" : "warning"} dot={r.status === "completed"}>{r.status === "completed" ? "반영 완료" : r.status}</Pill></span>
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

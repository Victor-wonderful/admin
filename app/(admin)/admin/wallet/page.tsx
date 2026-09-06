import { ExternalLinkIcon, HashIcon, ShieldAlertIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getSystemWallets, getAllocationTotals } from "@/lib/queries/finance";
import { getCompSettings } from "@/lib/queries/comp-settings";
import { getWalletOverview } from "@/lib/queries/admin-finance";
import { getDepositNetworks } from "@/lib/deposit-config";
import { addressExplorerUrl, NETWORK_LABEL } from "@/lib/chain/explorer";
import { currentCycle } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const pctOf = (p: number, t: number) => (t > 0 ? Math.round((p / t) * 100) : 0);

// 풀 표시 메타(라벨/색/설명) — 잔액은 system_wallets 라이브(결제마다 60/20/10/10 배분 반영).
const POOL_META: Record<string, { color: string; desc: string }> = {
  pool_commission: { color: "bg-green-500", desc: "초대·직급·팀 리워드 지급 재원" },
  pool_company: { color: "bg-info", desc: "운영·개발" },
  pool_equity: { color: "bg-crypto", desc: "지분자 분배" },
  pool_reserve: { color: "bg-n-400", desc: "리스크 적립" },
};
const POOL_ORDER = ["pool_commission", "pool_company", "pool_equity", "pool_reserve"];
const NET_COLOR: Record<string, string> = { TRC20: "bg-green-500", BEP20: "bg-warning" };

// 지갑잔액 — 수탁 원장 기준. 회사 보유(누적 입금 − 누적 출금)와 회원 예치금(부채), 배분 풀, 체인별 입출금, 14일 흐름.
export default async function AdminWalletPage() {
  const admin = await requireAdminPage("wallet");
  const [wallets, ov, alloc, settings] = await Promise.all([getSystemWallets(), getWalletOverview(), getAllocationTotals(), getCompSettings()]);
  const RATIO: Record<string, number> = { pool_commission: settings.alloc_commission_pct, pool_company: settings.alloc_company_pct, pool_equity: settings.alloc_equity_pct, pool_reserve: settings.alloc_reserve_pct };
  const ALLOCATED: Record<string, number> = { pool_commission: alloc.pool_commission, pool_company: alloc.pool_company, pool_equity: alloc.pool_equity, pool_reserve: alloc.pool_reserve };
  const ratioText = `${settings.alloc_commission_pct}/${settings.alloc_company_pct}/${settings.alloc_equity_pct}/${settings.alloc_reserve_pct}`;
  const cycle = currentCycle();
  const pools = POOL_ORDER.map((kind) => wallets.find((w) => w.kind === kind)).filter((w): w is NonNullable<typeof w> => Boolean(w));
  const poolTotal = pools.reduce((s, p) => s + p.balance_usd, 0);
  const networks = getDepositNetworks();
  const net = ov.monthDeposit - ov.monthWithdrawal;
  const dailyMax = Math.max(1, ...ov.daily.map((d) => Math.max(d.deposit, d.withdrawal)));
  const netTotal = ov.byNetwork.reduce((s, n) => s + n.deposit, 0);

  const FLOW = [
    { k: "당월 유입 (회원 입금)", v: `+${usd(ov.monthDeposit)}`, c: "text-positive" },
    { k: "당월 유출 (출금 송금)", v: `−${usd(ov.monthWithdrawal)}`, c: "text-text-primary" },
    { k: "당월 순증", v: `${net >= 0 ? "+" : "−"}${usd(Math.abs(net))}`, c: net >= 0 ? "text-positive" : "text-negative" },
  ];

  return (
    <>
      <Topbar title="지갑잔액" sub="회사 보유(원장) · 회원 예치금 · 배분 풀 · 체인별 입출금 · USDT" uid={admin.display_name} />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-4 lg:p-7">
        <div className="grid gap-[18px] lg:grid-cols-[1fr_360px]">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]" style={{ background: "linear-gradient(135deg,#3fbf6f 0%,#1f9d55 55%,#147a40 100%)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[13px] font-semibold text-white/80">회사 보유 추정 (원장 기준 · 누적 입금 − 누적 출금)</div>
                <div className="mt-1.5 text-[42px] leading-none font-bold tabular-nums">{usd(ov.custody)} <span className="text-base font-semibold text-white/75">USDT</span></div>
              </div>
              <div className="text-right text-xs text-white/80">
                <div>회원 예치금(부채) <b className="text-white">{usd(ov.memberLiability)}</b> · {ov.memberCount}지갑</div>
                <div className="mt-1">출금 홀드 <b className="text-white">{usd(ov.pendingWithdrawal)}</b></div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {networks.map((n) => {
                const url = addressExplorerUrl(n.code, n.address);
                return n.address ? (
                  <a key={n.code} href={url ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 font-mono text-xs font-medium hover:bg-white/25">
                    <HashIcon className="size-3" /> {n.code} {n.address.slice(0, 8)}…{n.address.slice(-6)} <ExternalLinkIcon className="size-3" />
                  </a>
                ) : (
                  <span key={n.code} className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70"><ShieldAlertIcon className="size-3" /> {n.code} 입금 주소 미설정</span>
                );
              })}
              <span className="rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold">당월 순증 {net >= 0 ? "+" : "−"}{usd(Math.abs(net))}</span>
            </div>
          </div>

          <Panel title="당월 자금 흐름" sub={`${cycle.slice(0, 4)}년 ${Number(cycle.slice(5, 7))}월 · 완료 건 기준`}>
            <div>
              {FLOW.map((f, i) => (
                <div key={f.k} className={cn("flex items-center justify-between py-3.5", i < FLOW.length - 1 && "border-b")}>
                  <span className="text-[13px] text-text-secondary">{f.k}</span>
                  <span className={cn("text-base font-bold tabular-nums", f.c)}>{f.v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="배분 풀 잔액" sub={`결제마다 매출을 ${ratioText} 으로 배분 · 배지 = 배분 비율 · 막대 = 배분 누계 대비 잔여 · 수당 풀은 리워드 지급분 차감`} action={<Pill tone="green">합계 {usd(poolTotal)}</Pill>}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pools.map((p) => {
              const meta = POOL_META[p.kind] ?? { color: "bg-n-400", desc: "" };
              const allocated = ALLOCATED[p.kind] ?? 0;
              const remainPct = allocated > 0 ? Math.max(0, Math.min(100, Math.round((p.balance_usd / allocated) * 100))) : 0;
              const used = Math.max(0, allocated - p.balance_usd);
              return (
                <div key={p.kind} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary"><span className={cn("size-2.5 rounded-full", meta.color)} /> {p.label}</span>
                    <span className="text-xs font-bold text-text-tertiary">배분 {RATIO[p.kind] ?? "—"}%</span>
                  </div>
                  <div className={cn("mt-2 text-xl font-bold tabular-nums", p.balance_usd < 0 ? "text-negative" : "text-text-primary")}>{usd(p.balance_usd)}</div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-n-100" title={`배분 누계 ${usd(allocated)} · 잔여 ${remainPct}%`}><div className={cn("h-full rounded-full", meta.color)} style={{ width: `${remainPct}%` }} /></div>
                  <div className="mt-2 text-[11px] text-text-tertiary">{meta.desc} · 배분 누계 {usd(allocated)}{used > 0 ? ` · 지급 ${usd(used)} · 잔여 ${remainPct}%` : ""}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-[18px] lg:grid-cols-[1fr_1fr]">
          <Panel title="체인별 입출금 (누적)" sub="완료된 입금·출금 · 회사 지원 체인 Tron TRC20 / BSC BEP20">
            {ov.byNetwork.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">아직 온체인 입출금이 없습니다.</div>
            ) : (
              <div className="space-y-3.5">
                {ov.byNetwork.map((n) => (
                  <div key={n.network} className="flex items-center gap-3">
                    <div className="w-28 shrink-0">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-text-primary"><span className={cn("size-2.5 rounded-full", NET_COLOR[n.network] ?? "bg-n-300")} /> {n.network}</div>
                      <div className="text-[11px] text-text-tertiary">{NETWORK_LABEL[n.network as "TRC20" | "BEP20"] ?? n.network}</div>
                    </div>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-n-100"><div className={cn("h-full rounded-full", NET_COLOR[n.network] ?? "bg-n-300")} style={{ width: `${pctOf(n.deposit, netTotal)}%` }} /></div>
                    <span className="w-24 text-right text-[13px] font-bold tabular-nums text-text-primary">+{usd(n.deposit)}</span>
                    <span className="w-24 text-right text-[12px] tabular-nums text-text-secondary">−{usd(n.withdrawal)}</span>
                  </div>
                ))}
                <div className="text-[11px] text-text-tertiary">입금(+) · 출금(−, 수수료 포함) · 개발용 테스트 입금은 TRC20 으로 기록됩니다</div>
              </div>
            )}
          </Panel>

          <Panel title="최근 14일 자금 흐름" sub="일별 입금(녹색)·출금(회색) · USDT" action={<Pill tone="green" dot>보유 {usd(ov.custody)}</Pill>}>
            {ov.daily.every((d) => d.deposit === 0 && d.withdrawal === 0) ? (
              <div className="grid h-40 place-items-center text-sm text-text-tertiary">최근 14일 입출금이 없습니다.</div>
            ) : (
              <div className="flex h-40 items-end gap-1.5">
                {ov.daily.map((d, i) => (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date} · 입금 ${usd(d.deposit)} · 출금 ${usd(d.withdrawal)}`}>
                    <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                      <div className={cn("w-1/2 rounded-t", i === ov.daily.length - 1 ? "bg-green-600" : "bg-green-400")} style={{ height: `${Math.round((d.deposit / dailyMax) * 100)}%` }} />
                      <div className="w-1/2 rounded-t bg-n-300" style={{ height: `${Math.round((d.withdrawal / dailyMax) * 100)}%` }} />
                    </div>
                    <span className="text-[9px] tabular-nums text-text-tertiary">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

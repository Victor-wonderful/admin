import { HashIcon, CopyIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getSystemWallets } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

const FLOW = [
  { k: "당월 유입", v: "+$184,260", c: "text-green-700" },
  { k: "당월 유출", v: "−$52,910", c: "text-text-primary" },
  { k: "당월 순증", v: "+$131,350", c: "text-green-700" },
];

const NETS = [
  { name: "TRC20", value: "$66,770", pct: 52, color: "bg-green-600" },
  { name: "ERC20", value: "$33,380", pct: 26, color: "bg-crypto" },
  { name: "Polygon", value: "$19,260", pct: 15, color: "bg-info" },
  { name: "BSC", value: "$8,990", pct: 7, color: "bg-warning" },
];

const TREND = [138, 134, 143, 149, 145, 156, 152, 160, 165, 161, 174, 178, 188, 196];

const POOL_META: Record<string, { color: string; desc: string }> = {
  pool_commission: { color: "bg-green-500", desc: "레벨·직급·공유 지급 재원" },
  pool_company: { color: "bg-info", desc: "운영·개발" },
  pool_equity: { color: "bg-crypto", desc: "투자자 분배" },
  pool_reserve: { color: "bg-n-400", desc: "리스크 대비" },
};

export default async function AdminWalletPage() {
  const wallets = await getSystemWallets();
  const operating = wallets.find((w) => w.kind === "operating");
  const pools = wallets.filter((w) => w.kind.startsWith("pool_"));
  const totalBal = operating?.balance_usd ?? 0;

  return (
    <>
      <Topbar title="지갑잔액" sub="운영 지갑 · 배분 풀 · 네트워크별 보유" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col justify-between rounded-xl bg-gradient-to-br from-lime to-green-600 p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
            <div>
              <div className="text-[13px] font-semibold text-white/80">총 잔액 (운영 지갑)</div>
              <div className="mt-1 text-[42px] leading-none font-bold tabular-nums">
                {usd(totalBal)} <span className="text-base font-semibold text-white/80">USDT</span>
              </div>
            </div>
            <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-md bg-white/15 px-3 py-1.5 text-xs font-medium">
              <HashIcon className="size-3" /> TXkQ9m…8fA2 <CopyIcon className="size-3" /> · 당월 순증 +$131,350
            </div>
          </div>
          <Panel title="당월 자금 흐름">
            <div className="space-y-0">
              {FLOW.map((f, i) => (
                <div key={f.k} className={cn("flex items-center justify-between py-3", i < FLOW.length - 1 && "border-b")}>
                  <span className="text-[13px] text-text-secondary">{f.k}</span>
                  <span className={cn("text-base font-bold tabular-nums", f.c)}>{f.v}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel title="배분 풀 잔액" sub="매출 배분 구조에 따른 풀별 보유" action={<Pill tone="green">합계 {usd(totalBal)}</Pill>}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {pools.map((p) => {
              const meta = POOL_META[p.kind] ?? { color: "bg-n-400", desc: "" };
              const pct = totalBal ? Math.round((p.balance_usd / totalBal) * 100) : 0;
              return (
                <div key={p.kind} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">{p.label}</span>
                    <span className="text-xs font-bold text-text-tertiary">{pct}%</span>
                  </div>
                  <div className="mt-1.5 text-xl font-bold tabular-nums text-text-primary">{usd(p.balance_usd)}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", meta.color)} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 text-[11px] text-text-tertiary">{meta.desc}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {NETS.map((n) => (
            <Panel key={n.name}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                  <span className={cn("size-2.5 rounded-full", n.color)} /> {n.name}
                </span>
                <span className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-text-secondary ring-1 ring-border">{n.pct}%</span>
              </div>
              <div className="mt-2 text-[22px] font-bold tabular-nums text-text-primary">{n.value}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-n-100">
                <div className={cn("h-full rounded-full", n.color)} style={{ width: `${n.pct}%` }} />
              </div>
            </Panel>
          ))}
        </div>

        <Panel title="잔액 추이" sub="운영 지갑 총 잔액 · 최근 14일 (USDT)" action={<Pill tone="green" dot>현재 {usd(totalBal)}</Pill>}>
          <div className="flex h-40 items-end gap-2">
            {TREND.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col justify-end">
                <div className={cn("rounded-t", i === TREND.length - 1 ? "bg-green-600" : "bg-green-300")} style={{ height: `${h * 0.5}%` }} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

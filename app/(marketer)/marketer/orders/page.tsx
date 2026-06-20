import {
  CpuIcon,
  BadgeCheckIcon,
  Settings2Icon,
  CalendarClockIcon,
  WalletIcon,
  HashIcon,
  CopyIcon,
  CircleCheckIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { DepositModal } from "@/components/wallet/deposit-modal";
import { getMemberSubscriptions, listProducts } from "@/lib/queries/members";
import { getMemberWallet } from "@/lib/queries/finance";
import { ROOT_MARKETER_ID } from "@/lib/constants";
import { toUid } from "@/lib/uid";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default async function MarketerOrdersPage() {
  const [subs, products, wallet] = await Promise.all([
    getMemberSubscriptions(ROOT_MARKETER_ID),
    listProducts(),
    getMemberWallet(ROOT_MARKETER_ID),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  // 구독 상태(실데이터): 활성 구독 존재 여부 + 최근 구독 기간
  const today = "2026-06-15";
  const activeSub = subs.find((s) => s.status === "active" && s.period_start <= today && today <= s.period_end);
  const latestSub = subs[0] ?? null;
  const subState = activeSub ? "가동 중" : "비활성";
  const subNext = (activeSub ?? latestSub)?.period_end?.slice(0, 10) ?? "—";
  const balance = wallet?.balance_usd ?? 0;
  const subPrice = activeSub ? Number(activeSub.amount_usd) : 120;

  const PRODUCTS = [
    { icon: CpuIcon, iconTone: "bg-green-50 text-green-700", name: "Alpha Engine 구독", sub: "AI 크립토 자동매매 엔진", price: usd(subPrice), cycle: "/ 월 · USDT", state: subState, on: !!activeSub, rows: [["다음 결제일", subNext], ["결제 내역", `${subs.length}건`]], cta: "구독 관리" },
    { icon: BadgeCheckIcon, iconTone: "bg-crypto-soft text-crypto", name: "마케터 연회비", sub: "추천 수당 자격", price: "$200", cycle: "/ 년 · USDT", state: "유효", on: true, rows: [["수당 자격", "활성"], ["갱신", "연 1회"]], cta: "갱신 관리" },
  ];

  const UPCOMING = activeSub
    ? [{ name: "Alpha Engine 구독", sub: `월 구독 · ${subNext}`, amount: usd(subPrice), soft: "bg-green-50 text-green-700", prog: 50, bar: "bg-green-600" }]
    : [];

  return (
    <>
      <Topbar title="구독·주문" sub="내 구독 · 결제 내역" uid={toUid(ROOT_MARKETER_ID)} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid gap-4 lg:grid-cols-2">
          {PRODUCTS.map((p) => (
            <Panel key={p.name}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={cn("grid size-[42px] place-items-center rounded-[12px]", p.iconTone)}>
                    <p.icon className="size-[22px]" />
                  </span>
                  <div>
                    <div className="text-[15px] font-semibold text-text-primary">{p.name}</div>
                    <div className="text-xs text-text-secondary">{p.sub}</div>
                  </div>
                </div>
                <Pill tone={p.on ? "green" : "neutral"} dot={p.on}>{p.state}</Pill>
              </div>
              <div className="mt-3 flex items-end gap-1">
                <span className="text-2xl font-bold text-text-primary">{p.price}</span>
                <span className="pb-1 text-xs font-medium text-text-tertiary">{p.cycle}</span>
              </div>
              <div className="mt-3 space-y-0">
                {p.rows.map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                    <span className="text-text-secondary">{k}</span>
                    <span className="font-semibold text-text-primary">{v}</span>
                  </div>
                ))}
              </div>
              <button className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md py-2.5 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
                <Settings2Icon className="size-4" /> {p.cta}
              </button>
            </Panel>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_412px]">
          <Panel title="다음 결제 예정" sub="예정된 자동 결제 일정" action={<Pill tone="warning"><CalendarClockIcon className="size-3" /> {UPCOMING.length}건 예정</Pill>}>
            <div>
              {UPCOMING.length === 0 ? (
                <div className="py-8 text-center text-sm text-text-tertiary">예정된 결제가 없습니다.</div>
              ) : UPCOMING.map((u, i) => (
                <div key={u.name} className={cn("space-y-2.5 py-3.5", i < UPCOMING.length - 1 && "border-b")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-10 place-items-center rounded-[12px]", u.soft)}>
                      <CalendarClockIcon className="size-[19px]" />
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-text-primary">{u.name}</div>
                      <div className="text-xs text-text-secondary">{u.sub}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-text-primary">{u.amount}</div>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-n-100">
                    <div className={cn("h-full rounded-full", u.bar)} style={{ width: `${u.prog}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="결제 잔액" sub="내 지갑 USDT 잔액에서 차감">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                <div>
                  <div className="text-xs text-text-secondary">내 지갑 잔액 (결제 가능)</div>
                  <div className="text-2xl font-bold text-text-primary">{usd(balance)}</div>
                </div>
                <span className="grid size-[42px] place-items-center rounded-[12px] bg-green-50 text-green-700">
                  <WalletIcon className="size-5" />
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                <HashIcon className="size-3 text-text-tertiary" />
                <span className="flex-1 truncate text-xs font-medium text-text-primary">{wallet?.deposit_address ?? "—"}</span>
                <CopyIcon className="size-3 text-text-tertiary" />
              </div>
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                <CircleCheckIcon className="size-4" /> 다음 결제 {usd(subPrice)} · 내 지갑 잔액에서 차감
              </div>
              <DepositModal address={wallet?.deposit_address ?? ""} network={wallet?.network ?? "TRC20"} />
            </div>
          </Panel>
        </div>

        <Panel title="결제 내역" sub={`${subs.length}건`}>
          <div>
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>결제일</span><span>항목</span><span>금액</span><span className="text-right">상태</span>
            </div>
            {subs.slice(0, 10).map((s) => (
              <div key={s.id} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="text-text-tertiary tabular-nums">{s.paid_at.slice(0, 10)}</span>
                <span className="font-medium text-text-primary">{(s.product_id && productName.get(s.product_id)) || "Alpha Engine 구독"}</span>
                <span className="font-semibold tabular-nums text-text-primary">${Number(s.amount_usd).toFixed(0)}</span>
                <span className="justify-self-end">
                  <Pill tone={s.status === "active" ? "green" : "neutral"}>{s.status === "active" ? "완료" : "만료"}</Pill>
                </span>
              </div>
            ))}
            {subs.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">결제 내역이 없습니다.</div>
            ) : null}
          </div>
        </Panel>
      </div>
    </>
  );
}

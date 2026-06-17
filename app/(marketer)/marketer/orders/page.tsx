import {
  CpuIcon,
  BadgeCheckIcon,
  Settings2Icon,
  CalendarClockIcon,
  WalletIcon,
  PlusIcon,
  HashIcon,
  CopyIcon,
  CircleCheckIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { getMemberSubscriptions, listProducts } from "@/lib/queries/members";
import { ROOT_MARKETER_ID } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PRODUCTS = [
  { icon: CpuIcon, iconTone: "bg-green-50 text-green-700", name: "Alpha Engine 구독", sub: "AI 크립토 자동매매 엔진", price: "$120", cycle: "/ 월 · USDT", state: "가동 중", rows: [["다음 결제일", "2026-07-12"], ["구독 기간", "10개월차"]], cta: "구독 관리" },
  { icon: BadgeCheckIcon, iconTone: "bg-crypto-soft text-crypto", name: "마케터 연회비", sub: "추천 수당 자격", price: "$200", cycle: "/ 년 · USDT", state: "유효", rows: [["다음 갱신일", "2026-08-12"], ["가입", "2025-08-12"]], cta: "갱신 관리" },
];

const UPCOMING = [
  { name: "Alpha Engine 구독", sub: "월 구독 · 2026-07-12", amount: "$120", dday: "D-26", soft: "bg-green-50 text-green-700", prog: 13, bar: "bg-green-600" },
  { name: "마케터 연회비", sub: "연 1회 · 2027-08-12", amount: "$200", dday: "D-421", soft: "bg-crypto-soft text-crypto", prog: 30, bar: "bg-crypto" },
];

export default async function MarketerOrdersPage() {
  const [subs, products] = await Promise.all([
    getMemberSubscriptions(ROOT_MARKETER_ID),
    listProducts(),
  ]);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return (
    <>
      <Topbar title="구독·주문" sub="내 구독 · 결제 내역" uid="AG·8F3A21" />

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
                <Pill tone="green" dot>{p.state}</Pill>
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
          <Panel title="다음 결제 예정" sub="예정된 자동 결제 일정" action={<Pill tone="warning"><CalendarClockIcon className="size-3" /> 2건 예정</Pill>}>
            <div>
              {UPCOMING.map((u, i) => (
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
                      <span className={cn("rounded px-2 py-0.5 text-[11px] font-bold", u.soft)}>{u.dday}</span>
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
                  <div className="text-2xl font-bold text-text-primary">$42,300</div>
                </div>
                <span className="grid size-[42px] place-items-center rounded-[12px] bg-green-50 text-green-700">
                  <WalletIcon className="size-5" />
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2.5 ring-1 ring-border">
                <HashIcon className="size-3 text-text-tertiary" />
                <span className="flex-1 text-xs font-medium text-text-primary">TRdep8…k29Q</span>
                <CopyIcon className="size-3 text-text-tertiary" />
              </div>
              <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2.5 text-xs font-medium text-green-700">
                <CircleCheckIcon className="size-4" /> 다음 결제 $120 · 내 지갑 잔액에서 차감
              </div>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand py-3 text-[13px] font-bold text-white">
                <PlusIcon className="size-4" /> USDT 충전하기
              </button>
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

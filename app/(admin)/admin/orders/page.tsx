import {
  CalendarCheckIcon,
  TrendingUpIcon,
  SigmaIcon,
  CircleCheckIcon,
  CalendarClockIcon,
  ShoppingCartIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const KPIS = [
  { icon: CalendarCheckIcon, tone: "green" as const, label: "당일 매출", value: "$8,940" },
  { icon: TrendingUpIcon, tone: "green" as const, label: "당월 매출", value: "$184,260" },
  { icon: SigmaIcon, tone: "neutral" as const, label: "누적 매출", value: "$2.42M" },
  { icon: CircleCheckIcon, tone: "info" as const, label: "활성 구독", value: "856건" },
  { icon: CalendarClockIcon, tone: "warning" as const, label: "갱신 임박", value: "47건" },
  { icon: ShoppingCartIcon, tone: "crypto" as const, label: "당월 신규 주문", value: "124건" },
];

const TABS = ["전체", "엔진 구독", "연회비", "상품"];

const ORDERS = [
  { uid: "AG·C9A410", item: "Alpha Engine 구독", amount: "$120", net: "TRC20", state: "완료", tone: "green" as const, date: "2026-06-17" },
  { uid: "AG·2B91C0", item: "마케터 연회비", amount: "$200", net: "ERC20", state: "완료", tone: "green" as const, date: "2026-06-17" },
  { uid: "AG·5D4E0A", item: "Alpha Engine 구독", amount: "$120", net: "Polygon", state: "대기", tone: "warning" as const, date: "2026-06-17" },
  { uid: "AG·7C0F19", item: "크립토 카드", amount: "$300", net: "TRC20", state: "완료", tone: "green" as const, date: "2026-06-16" },
  { uid: "AG·E0CC57", item: "Alpha Engine 구독", amount: "$120", net: "BSC", state: "실패", tone: "negative" as const, date: "2026-06-16" },
];

export default function AdminOrdersPage() {
  return (
    <>
      <Topbar title="구독·주문" sub="전체 구독·상품 주문 · USDT 결제" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <Panel
          title="주문 내역"
          action={
            <div className="flex gap-1 rounded-md bg-surface-muted p-1 ring-1 ring-border">
              {TABS.map((t, i) => (
                <span key={t} className={cn("rounded px-3 py-1.5 text-[13px]", i === 0 ? "bg-card font-semibold text-text-primary shadow-sm" : "font-medium text-text-secondary")}>{t}</span>
              ))}
            </div>
          }
        >
          <div>
            <div className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>회원</span><span>항목</span><span>금액</span><span>네트워크</span><span>결제일</span><span className="text-right">상태</span>
            </div>
            {ORDERS.map((o, i) => (
              <div key={i} className="grid grid-cols-[1fr_1.2fr_auto_auto_auto_auto] items-center gap-3 border-b py-3 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{o.uid}</span>
                <span className="text-text-secondary">{o.item}</span>
                <span className="font-semibold tabular-nums text-text-primary">{o.amount}</span>
                <span className="text-xs text-text-tertiary">{o.net}</span>
                <span className="text-text-tertiary tabular-nums">{o.date}</span>
                <span className="justify-self-end"><Pill tone={o.tone} dot={o.state === "완료"}>{o.state}</Pill></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

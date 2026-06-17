import {
  CpuIcon,
  BadgeCheckIcon,
  CreditCardIcon,
  Share2Icon,
  PlusIcon,
  PencilIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { listProducts } from "@/lib/queries/members";
import type { ProductRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BILLING_CYCLE: Record<ProductRow["billing"], string> = {
  monthly: "/ 월",
  yearly: "/ 년",
  event: "이벤트",
};

const ICONS = [
  { icon: CpuIcon, tone: "bg-green-50 text-green-700" },
  { icon: BadgeCheckIcon, tone: "bg-crypto-soft text-crypto" },
  { icon: CreditCardIcon, tone: "bg-info-soft text-info" },
  { icon: Share2Icon, tone: "bg-warning-soft text-warning" },
];

export default async function AdminProductsPage() {
  const products = await listProducts();

  return (
    <>
      <Topbar
        title="상품·구독플랜"
        sub="상품 카탈로그 · 주문·정산 항목 기준"
        uid="운영자"
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white">
            <PlusIcon className="size-3.5" /> 상품 추가
          </button>
        }
      />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => {
            const { icon: Icon, tone } = ICONS[i % ICONS.length];
            const counting = p.billing === "monthly";
            return (
              <Panel key={p.id}>
                <div className="flex items-start justify-between">
                  <span className={cn("grid size-11 place-items-center rounded-[12px]", tone)}>
                    <Icon className="size-[22px]" />
                  </span>
                  <span className="flex h-6 w-10 items-center rounded-full bg-brand px-0.5">
                    <span className="ml-auto size-5 rounded-full bg-white" />
                  </span>
                </div>
                <div className="mt-3 text-[15px] font-bold text-text-primary">{p.name}</div>
                <div className="font-mono text-[11px] text-text-tertiary">{p.code}</div>
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-2xl font-bold text-text-primary">
                    {p.price_usd != null ? `$${Number(p.price_usd).toFixed(0)}` : "변동"}
                  </span>
                  <span className="pb-1 text-xs font-medium text-text-tertiary">{BILLING_CYCLE[p.billing]}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  <Pill tone="green">수당 적용</Pill>
                  {counting ? <Pill tone="info">카운팅</Pill> : null}
                  <button className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-text-tertiary">
                    <PencilIcon className="size-3" /> 수정
                  </button>
                </div>
              </Panel>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 rounded-md bg-info-soft px-3.5 py-3 text-xs leading-relaxed text-info">
          <PlusIcon className="mt-0.5 size-4 shrink-0" />
          보상 엔진은 상품에 하드코딩되지 않습니다. 신상품은 카탈로그 추가로 확장되며, 각 상품마다 수당 풀 적용·활성 구독자 카운팅 여부를 설정합니다.
        </div>
      </div>
    </>
  );
}

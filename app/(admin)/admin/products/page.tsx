import {
  CpuIcon,
  BadgeCheckIcon,
  CreditCardIcon,
  Share2Icon,
  PackageIcon,
  InfoIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { can } from "@/lib/admin-permissions";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { ActiveToggle } from "@/components/products/active-toggle";
import { listAllProducts } from "@/lib/queries/products";
import type { ProductRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BILLING_CYCLE: Record<ProductRow["billing"], string> = {
  monthly: "/ 월",
  yearly: "/ 년",
  event: "일회성",
};

// 코드별 아이콘(알려진 상품) · 그 외는 기본 아이콘
const ICON_BY_CODE: Record<string, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  bot_sub: { icon: CpuIcon, tone: "bg-green-50 text-green-700" },
  annual_fee: { icon: BadgeCheckIcon, tone: "bg-crypto-soft text-crypto" },
  coin_visa: { icon: CreditCardIcon, tone: "bg-info-soft text-info" },
  exchange_fee_share: { icon: Share2Icon, tone: "bg-warning-soft text-warning" },
};
const DEFAULT_ICON = { icon: PackageIcon, tone: "bg-n-100 text-n-600" };

// 회원 화면에 연결된 플랜(가격이 그대로 반영되는 상품)
const PLAN_LABEL: Record<string, string> = { bot_sub: "회원 구독 플랜(Basic)", annual_fee: "파트너 멤버십(Pro)" };

export default async function AdminProductsPage() {
  const admin = await requireAdminPage("products");
  const readOnly = !can(admin.role, "catalog.write");
  const products = await listAllProducts();

  return (
    <>
      <Topbar
        title="상품·구독플랜"
        sub="상품 카탈로그 · 주문·정산 항목 기준 · 가격은 회원 화면에 즉시 반영"
        uid={admin.display_name}
        actions={readOnly ? null : <ProductFormModal />}
      />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => {
            const { icon: Icon, tone } = ICON_BY_CODE[p.code] ?? DEFAULT_ICON;
            const plan = PLAN_LABEL[p.code];
            return (
              <Panel key={p.id} className={cn(!p.is_active && "opacity-70")}>
                <div className="flex items-start justify-between">
                  <span className={cn("grid size-11 place-items-center rounded-[12px]", tone)}>
                    <Icon className="size-[22px]" />
                  </span>
                  <ActiveToggle id={p.id} active={p.is_active} readOnly={readOnly} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[15px] font-bold text-text-primary">{p.name}</span>
                  {!p.is_active ? <Pill tone="neutral">판매 중지</Pill> : p.price_usd == null && !plan ? <Pill tone="warning">회원 미노출 · 가격 없음</Pill> : null}
                </div>
                <div className="font-mono text-[11px] text-text-tertiary">{p.code}</div>
                {plan ? <div className="mt-1 text-[11px] font-medium text-green-700">{plan} · 회원 화면 가격 연동</div> : null}
                <div className="mt-2 flex items-end gap-1">
                  <span className="text-2xl font-bold text-text-primary">
                    {p.price_usd != null ? `$${Number(p.price_usd).toFixed(0)}` : "변동"}
                  </span>
                  <span className="pb-1 text-xs font-medium text-text-tertiary">{BILLING_CYCLE[p.billing]}</span>
                </div>
                {p.description ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">{p.description}</p> : null}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-3">
                  {p.pool_eligible ? <Pill tone="green">매출 배분</Pill> : <Pill tone="neutral">배분 제외 · 회사 100%</Pill>}
                  {readOnly ? null : <ProductFormModal product={p} />}
                </div>
              </Panel>
            );
          })}
        </div>

        <div className="flex items-start gap-2.5 rounded-md bg-info-soft px-3.5 py-3 text-xs leading-relaxed text-info">
          <InfoIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <b>bot_sub</b>(회원 구독)과 <b>annual_fee</b>(파트너 멤버십) 가격은 등록·구독회원 화면의 결제 금액과 자동 갱신 금액에 그대로 쓰입니다.
            그 외 상품은 <b>판매 활성 + 가격 입력</b>이 모두 된 것만 회원 구독·주문 페이지의 &ldquo;상품&rdquo; 섹션에 노출되어 잔액으로 구매할 수 있습니다. 가격이 비어 있거나 판매 중지면 회원에게 보이지 않습니다. <b>매출 배분</b>을 켠 상품의 매출은 수당체계의 비율로 배분되고, 끈 상품은 회사 수익으로 전액 귀속됩니다. 상품 구매에 초대·직급 리워드나 활성 카운팅을 붙일지는 결정 대기입니다.
          </div>
        </div>
      </div>
    </>
  );
}

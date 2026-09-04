import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/supabase/types";

// 플랜 코드(고정): 구독 = bot_sub, 파트너 멤버십(연회비) = annual_fee
export const PLAN_CODES = { subscription: "bot_sub", partner: "annual_fee" } as const;
const DEFAULT_PRICES = { sub: 120, annual: 200 };

// 관리자용 전체 목록(비활성 포함), 정렬순.
export async function listAllProducts(): Promise<ProductRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from("products").select("*").order("sort_order").order("code");
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

// 회원 화면 가격 — 상품 테이블의 현재가. 상품이 없거나 비활성이면 기본값.
export async function getPlanPrices(): Promise<{ sub: number; annual: number; subActive: boolean; partnerActive: boolean }> {
  const sb = getServerClient();
  const { data } = await sb.from("products").select("code, price_usd, is_active").in("code", [PLAN_CODES.subscription, PLAN_CODES.partner]);
  const rows = (data ?? []) as Array<{ code: string; price_usd: number | null; is_active: boolean }>;
  const sub = rows.find((r) => r.code === PLAN_CODES.subscription);
  const partner = rows.find((r) => r.code === PLAN_CODES.partner);
  return {
    sub: sub?.is_active && sub.price_usd != null ? Number(sub.price_usd) : DEFAULT_PRICES.sub,
    annual: partner?.is_active && partner.price_usd != null ? Number(partner.price_usd) : DEFAULT_PRICES.annual,
    subActive: sub?.is_active ?? true,
    partnerActive: partner?.is_active ?? true,
  };
}

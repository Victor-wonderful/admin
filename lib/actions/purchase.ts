"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/session";
import { today } from "@/lib/dates";

export type PurchaseResult = { ok: true; purchaseId: string } | { ok: false; error: string };

// 상품 구매 — 세션 회원 기준(클라이언트가 보낸 회원 id 를 믿지 않음). 잔액 결제 + 구매 이력.
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  const me = await getCurrentMember();
  if (!me) return { ok: false, error: "로그인이 필요합니다" };

  const sb = getServerClient();
  const { data, error } = await sb.rpc("purchase_product", { p_member: me.id, p_product: productId, p_as_of: today() });
  if (error) return { ok: false, error: error.message?.trim() || "구매 처리에 실패했습니다" };

  for (const p of ["/portal/orders", "/marketer/orders", "/portal/wallet", "/marketer/wallet", "/portal/subscriber", "/portal/registered"]) revalidatePath(p);
  return { ok: true, purchaseId: String(data) };
}

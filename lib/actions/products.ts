"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";

export type ProductFormState = { ok?: boolean; error?: string } | undefined;

const BILLING = new Set(["monthly", "yearly", "event"]);
const CODE_RE = /^[a-z0-9_]{2,32}$/;

function revalidateAll() {
  revalidatePath("/admin/products");
  revalidatePath("/portal/registered");
  revalidatePath("/portal/subscriber");
  revalidatePath("/portal/orders");
  revalidatePath("/marketer/orders");
}

function parse(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const billing = String(formData.get("billing") ?? "monthly");
  const priceRaw = String(formData.get("price_usd") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  const description = String(formData.get("description") ?? "").trim() || null;
  const sort = Number(String(formData.get("sort_order") ?? "100")) || 100;
  const flag = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";

  if (!name) return { error: "상품명을 입력하세요" } as const;
  if (!CODE_RE.test(code)) return { error: "상품 코드는 영문 소문자·숫자·밑줄 2~32자" } as const;
  if (!BILLING.has(billing)) return { error: "결제 주기가 올바르지 않습니다" } as const;
  if (price != null && (!Number.isFinite(price) || price < 0)) return { error: "가격은 0 이상 숫자" } as const;

  return {
    row: {
      code,
      name,
      billing,
      price_usd: price,
      description,
      sort_order: sort,
      is_active: flag("is_active"),
      pool_eligible: flag("pool_eligible"),
      counts_active: flag("counts_active"),
      updated_at: new Date().toISOString(),
    },
  } as const;
}

// 상품 추가
export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const sb = getServerClient();
  const { error } = await sb.from("products").insert(p.row);
  if (error) return { error: error.message.includes("duplicate") ? "이미 있는 상품 코드입니다" : "저장 실패: " + error.message };
  revalidateAll();
  return { ok: true };
}

// 상품 수정 (id 기준)
export async function updateProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "상품 id 가 없습니다" };
  const p = parse(formData);
  if ("error" in p) return { error: p.error };
  const sb = getServerClient();
  const { error } = await sb.from("products").update(p.row).eq("id", id);
  if (error) return { error: error.message.includes("duplicate") ? "이미 있는 상품 코드입니다" : "저장 실패: " + error.message };
  revalidateAll();
  return { ok: true };
}

// 판매 활성/비활성 토글
export async function setProductActive(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const sb = getServerClient();
  const { error } = await sb.from("products").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAll();
  return { ok: true };
}

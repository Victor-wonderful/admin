"use server";

import { revalidatePath } from "next/cache";
import { getServerClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import { checkCapability } from "@/lib/admin-guard";

export type ProductFormState = { ok?: boolean; error?: string } | undefined;

const BILLING = new Set(["monthly", "yearly", "event"]);
const CODE_RE = /^[a-z0-9_]{2,32}$/;

function revalidateAll() {
  revalidatePath("/admin/products");
  revalidatePath("/admin/revenue");
  revalidatePath("/admin/wallet");
  revalidatePath("/admin/dashboard");
  revalidatePath("/portal/registered");
  revalidatePath("/portal/subscriber");
  revalidatePath("/portal/orders");
  revalidatePath("/marketer/orders");
}

// 자동 상품 코드: p_ + 6자(소문자·숫자)
function genCode(): string {
  const a = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "p_";
  for (let i = 0; i < 6; i++) out += a[Math.floor(Math.random() * a.length)];
  return out;
}

// 폼 파싱. mode=create: 가격 필수, 코드·정렬 비우면 자동. mode=edit: 코드 유지(플랜은 고정), 정렬 비우면 기존값.
function parse(formData: FormData, mode: "create" | "edit") {
  const codeIn = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const billing = String(formData.get("billing") ?? "monthly");
  const priceRaw = String(formData.get("price_usd") ?? "").trim();
  const price = priceRaw === "" ? null : Number(priceRaw);
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortRaw = String(formData.get("sort_order") ?? "").trim();
  const sort = sortRaw === "" ? null : Number(sortRaw);
  const flag = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";

  if (!name) return { error: "상품명을 입력하세요" } as const;
  if (codeIn && !CODE_RE.test(codeIn)) return { error: "상품 코드는 영문 소문자·숫자·밑줄 2~32자" } as const;
  if (!BILLING.has(billing)) return { error: "결제 주기가 올바르지 않습니다" } as const;
  if (mode === "create" && price == null) return { error: "가격을 입력하세요 (USDT)" } as const;
  if (price != null && (!Number.isFinite(price) || price < 0)) return { error: "가격은 0 이상 숫자" } as const;
  if (sort != null && (!Number.isFinite(sort) || sort < 0)) return { error: "정렬 순서는 0 이상 숫자" } as const;

  return {
    code: codeIn || null,
    sort,
    row: {
      name,
      billing,
      price_usd: price,
      description,
      is_active: flag("is_active"),
      pool_eligible: flag("pool_eligible"),
      updated_at: new Date().toISOString(),
    },
  } as const;
}

// 상품 추가
export async function createProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const g = await checkCapability("catalog.write", "상품 추가");
  if (!g.ok) return { error: g.error };
  const p = parse(formData, "create");
  if ("error" in p) return { error: p.error };
  const sb = getServerClient();
  // 정렬 순서 비우면 맨 뒤(현재 최대 + 10)
  let sort = p.sort;
  if (sort == null) {
    const { data: last } = await sb.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    sort = ((last as { sort_order: number } | null)?.sort_order ?? 90) + 10;
  }
  // 코드 비우면 자동 생성(중복이면 재시도)
  let code = p.code;
  let lastErr: string | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const c = code ?? genCode();
    const { error } = await sb.from("products").insert({ ...p.row, code: c, sort_order: sort, counts_active: false });
    if (!error) { code = c; lastErr = null; break; }
    if (!error.message.includes("duplicate")) return { error: "저장 실패: " + error.message };
    if (p.code) return { error: "이미 있는 상품 코드입니다" };
    lastErr = error.message; code = null;
  }
  if (lastErr) return { error: "상품 코드 자동 생성에 실패했습니다. 다시 시도하세요" };
  await audit({ category: "catalog", action: "product_create", target: `상품 추가 · ${p.row.name} (${code}) · $${p.row.price_usd}` });
  revalidateAll();
  return { ok: true };
}

// 상품 수정 (id 기준)
export async function updateProduct(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "상품 id 가 없습니다" };
  const g = await checkCapability("catalog.write", "상품 수정");
  if (!g.ok) return { error: g.error };
  const p = parse(formData, "edit");
  if ("error" in p) return { error: p.error };
  const sb = getServerClient();
  const { data: prev } = await sb.from("products").select("code, sort_order").eq("id", id).maybeSingle();
  const before = prev as { code: string; sort_order: number } | null;
  if (!before) return { error: "상품을 찾을 수 없습니다" };
  const locked = before.code === "bot_sub" || before.code === "annual_fee";
  const code = locked ? before.code : (p.code ?? before.code);
  const patch = { ...p.row, code, sort_order: p.sort ?? before.sort_order };
  const { error } = await sb.from("products").update(patch).eq("id", id);
  if (error) return { error: error.message.includes("duplicate") ? "이미 있는 상품 코드입니다" : "저장 실패: " + error.message };
  await audit({ category: "catalog", action: "product_update", target: `상품 수정 · ${p.row.name} (${code}) · $${p.row.price_usd}`, targetId: id });
  revalidateAll();
  return { ok: true };
}

// 판매 활성/비활성 토글
export async function setProductActive(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const g = await checkCapability("catalog.write", "상품 판매 상태 변경");
  if (!g.ok) return { ok: false, error: g.error };
  const sb = getServerClient();
  const { error } = await sb.from("products").update({ is_active: active, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  const { data: pr } = await sb.from("products").select("name, code").eq("id", id).maybeSingle();
  const pi = pr as { name: string; code: string } | null;
  await audit({ category: "catalog", action: active ? "product_activate" : "product_deactivate", target: `상품 ${pi ? `${pi.name} (${pi.code})` : id.slice(0, 8)} 판매 ${active ? "활성화" : "중지"}`, targetId: id });
  revalidateAll();
  return { ok: true };
}

// 상품 삭제 — 구매 이력이 없는 상품만. bot_sub/annual_fee(회원 화면 연동 플랜)는 삭제 불가. 이력이 있으면 '판매 중지'로 숨긴다.
const PLAN_CODES_LOCKED = new Set(["bot_sub", "annual_fee"]);
export async function deleteProduct(id: string): Promise<{ ok: boolean; error?: string }> {
  const g = await checkCapability("catalog.write", "상품 삭제");
  if (!g.ok) return { ok: false, error: g.error };
  const sb = getServerClient();
  const { data: pr } = await sb.from("products").select("code, name").eq("id", id).maybeSingle();
  const p = pr as { code: string; name: string } | null;
  if (!p) return { ok: false, error: "상품을 찾을 수 없습니다" };
  if (PLAN_CODES_LOCKED.has(p.code)) return { ok: false, error: "회원 구독·파트너 멤버십 플랜은 삭제할 수 없습니다(가격 수정만 가능)" };
  const { count } = await sb.from("product_purchases").select("id", { count: "exact", head: true }).eq("product_id", id);
  if ((count ?? 0) > 0) return { ok: false, error: `구매 이력 ${count}건이 있어 삭제할 수 없습니다. 판매 중지로 회원 화면에서 숨기세요` };
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: "삭제 처리 중 오류가 발생했습니다" };
  await audit({ category: "catalog", action: "product_delete", target: `상품 삭제 · ${p.name} (${p.code})`, targetId: id, risk: true });
  revalidateAll();
  return { ok: true };
}

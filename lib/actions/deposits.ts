"use server";

import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";
import { scanDeposits, type NetworkScanResult } from "@/lib/deposit-scan";
import { toUid } from "@/lib/uid";

type Result = { ok: true } | { ok: false; error: string };

function refresh() {
  revalidatePath("/admin/deposits");
  revalidatePath("/admin/wallet");
  revalidatePath("/admin/transactions");
  revalidatePath("/portal/wallet");
  revalidatePath("/marketer/wallet");
}

// 관리자 "지금 스캔" — 크론과 같은 스캔을 즉시 실행.
export async function runDepositScan(): Promise<{ ok: true; results: NetworkScanResult[] } | { ok: false; error: string }> {
  try {
    const results = await scanDeposits();
    refresh();
    return { ok: true, results };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// 미확인 입금을 회원에게 수동 매칭해 잔액 반영. 회원은 이메일(ID) 또는 UID(FT·XXXXXX)로 지정.
export async function creditDepositToMember(depositId: string, memberRef: string): Promise<Result> {
  const ref = memberRef.trim();
  if (!ref) return { ok: false, error: "회원 ID(이메일) 또는 UID 를 입력하세요" };
  const sb = getServerClient();

  let memberId: string | null = null;
  if (ref.includes("@")) {
    const { data } = await sb.from("members").select("id").ilike("email", ref).maybeSingle();
    memberId = (data as { id: string } | null)?.id ?? null;
  } else {
    // UID 는 id 해시라 역산이 안 된다 → 전체 회원 id 를 훑어 일치하는 것을 찾는다(회원 수 규모에서 충분).
    const want = ref.toUpperCase().replace("FT-", "FT·").replace(/^(?!FT·)/, "FT·");
    const { data } = await sb.from("members").select("id");
    memberId = ((data ?? []) as Array<{ id: string }>).find((m) => toUid(m.id) === want)?.id ?? null;
  }
  if (!memberId) return { ok: false, error: `회원을 찾을 수 없습니다: ${ref}` };

  const { error } = await sb.rpc("credit_onchain_deposit", { p_id: depositId, p_member: memberId });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

// 회원 입금이 아닌 건(회사 자금 이동 등) 무시.
export async function ignoreDeposit(depositId: string, note?: string): Promise<Result> {
  const sb = getServerClient();
  const { error } = await sb.rpc("ignore_onchain_deposit", { p_id: depositId, p_note: note ?? null });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { assertCapability } from "@/lib/admin-guard";
import { toUid } from "@/lib/uid";

export type WithdrawalStatus = "pending" | "approved" | "sending" | "completed" | "rejected";

// 출금 신청(마케터). 잔액 검증 + 홀드(지갑 차감) 후 pending 생성. 신규 withdrawal id 반환.
export async function requestWithdrawal(
  memberId: string,
  amount: number,
  toAddress: string,
  network = "TRC20",
  fee = 1,
): Promise<string> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("request_withdrawal", {
    p_member: memberId,
    p_amount: amount,
    p_to_address: toAddress,
    p_network: network,
    p_fee: fee,
  });
  if (error) throw error;

  revalidatePath("/admin/withdrawals");
  revalidatePath("/marketer/wallet");
  return data as string;
}

const WITHDRAWAL_ACTION: Record<WithdrawalStatus, string> = { pending: "withdrawal_reopen", approved: "withdrawal_approve", sending: "withdrawal_send", completed: "withdrawal_complete", rejected: "withdrawal_reject" };

// 출금 상태 전이(운영자). approve/reject/send/complete 를 단일 state machine 으로 처리.
//   pending→approved|rejected, approved→sending|rejected, sending→completed.
//   reject 시 홀드 환불, complete 시 tx_hash/처리시각 확정.
export async function transitionWithdrawal(
  id: string,
  to: WithdrawalStatus,
  txHash?: string,
): Promise<WithdrawalStatus> {
  await assertCapability("finance.write", "출금 상태 변경");
  const sb = getServerClient();
  const { data: w } = await sb.from("withdrawals").select("member_id, amount, network").eq("id", id).maybeSingle();
  const info = w as { member_id: string; amount: number; network: string } | null;
  const desc = info ? `${toUid(info.member_id)} · $${Number(info.amount).toLocaleString()} ${info.network}` : id.slice(0, 8);
  const { data, error } = await sb.rpc("transition_withdrawal", {
    p_id: id,
    p_to: to,
    p_tx_hash: txHash ?? null,
  });
  if (error) {
    await audit({ category: "finance", action: WITHDRAWAL_ACTION[to], target: `출금 ${desc} · 실패: ${error.message}`, targetId: id, ok: false, risk: true });
    throw error;
  }
  await audit({ category: "finance", action: WITHDRAWAL_ACTION[to], target: `출금 ${desc}${txHash ? ` · tx ${txHash.slice(0, 10)}…` : ""}`, targetId: id, risk: to !== "sending" });

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin/wallet");
  revalidatePath("/marketer/wallet");
  return data as WithdrawalStatus;
}

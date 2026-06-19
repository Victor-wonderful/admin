"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

// 출금 상태 전이(운영자). approve/reject/send/complete 를 단일 state machine 으로 처리.
//   pending→approved|rejected, approved→sending|rejected, sending→completed.
//   reject 시 홀드 환불, complete 시 tx_hash/처리시각 확정.
export async function transitionWithdrawal(
  id: string,
  to: WithdrawalStatus,
  txHash?: string,
): Promise<WithdrawalStatus> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("transition_withdrawal", {
    p_id: id,
    p_to: to,
    p_tx_hash: txHash ?? null,
  });
  if (error) throw error;

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin/wallet");
  revalidatePath("/marketer/wallet");
  return data as WithdrawalStatus;
}

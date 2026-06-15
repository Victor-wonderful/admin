"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 스필오버 배치: 대상 회원을 마케터 M 의 대실적 라인 최하단으로 이동.
export async function placeUnderMajorLeg(marketerId: string, targetMemberId: string) {
  const sb = getServerClient();

  const { data: lowest, error: e1 } = await sb.rpc("lowest_node_of_major_leg", { m_id: marketerId });
  if (e1) throw e1;
  const newParent = lowest as string | null;
  if (!newParent) throw new Error("대실적 라인을 찾을 수 없습니다.");
  if (newParent === targetMemberId) throw new Error("대상이 이미 최하단 노드입니다.");

  const { error: e2 } = await sb.rpc("move_placement_subtree", {
    p_node: targetMemberId,
    p_new_parent: newParent,
  });
  if (e2) throw e2;

  revalidatePath("/admin");
  revalidatePath("/marketer");
  return { movedTo: newParent };
}

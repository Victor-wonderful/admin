"use server";

import { getServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { assertCapability } from "@/lib/admin-guard";
import { toUid } from "@/lib/uid";

// 스필오버 배치: 대상 회원을 파트너 M 의 대실적 라인 최하단으로 이동.
export async function placeUnderMajorLeg(marketerId: string, targetMemberId: string) {
  await assertCapability("members.write", "주력 라인 이동");
  const sb = getServerClient();

  const { data: lowest, error: e1 } = await sb.rpc("lowest_node_of_major_leg", { m_id: marketerId });
  if (e1) throw e1;
  const newParent = lowest as string | null;
  if (!newParent) throw new Error("대실적 라인을 찾을 수 없습니다.");
  if (newParent === targetMemberId) throw new Error("대상이 이미 최하단 노드입니다.");

  const { error: e2 } = await sb.rpc("place_member", {
    p_member: targetMemberId,
    p_new_parent: newParent,
    p_by: "admin",
    p_note: "관리자 · 주력 라인 최하단 이동",
  });
  if (e2) throw e2;
  await audit({ category: "member", action: "member_place_major", target: `회원 ${toUid(targetMemberId)} → ${toUid(marketerId)} 주력 라인 최하단(${toUid(newParent)}) 이동`, targetId: targetMemberId, risk: true });

  revalidatePath("/admin");
  revalidatePath("/marketer");
  return { movedTo: newParent };
}

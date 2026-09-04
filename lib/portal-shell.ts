import "server-only";
import { getMemberSubscriptions } from "@/lib/queries/members";
import { getMemberRank } from "@/lib/queries/ranks";
import { toUid } from "@/lib/uid";
import { today } from "@/lib/dates";
import type { MemberRow } from "@/lib/supabase/types";

// 기준일 = 실제 오늘(Asia/Seoul).
const TODAY = today();

// 회원 사이드바 하단 카드용 등급 요약 문구 — 등급별 실데이터로 계산.
export async function getGradeSub(member: MemberRow): Promise<string> {
  if (member.role === "marketer") {
    const rank = await getMemberRank(member.id);
    return rank && rank.rank > 0
      ? `${rank.rank}등급 · 활성 팀원 ${rank.total_active.toLocaleString()}명`
      : "등급 없음 · 활성 팀원 집계";
  }
  if (member.role === "subscriber") {
    const subs = await getMemberSubscriptions(member.id);
    const active = subs.find((s) => s.status === "active" && s.period_start <= TODAY && TODAY <= s.period_end);
    if (!active) return "구독 회원";
    const dday = Math.max(0, Math.round((new Date(active.period_end).getTime() - new Date(TODAY).getTime()) / 86400000));
    return `매매 판단 체크 이용중 · 다음 결제 D-${dday}`;
  }
  return "구독 시작 전 · 매매 판단 체크 미이용";
}

export async function getShellProps(member: MemberRow) {
  return { role: member.role, uid: toUid(member.id), gradeSub: await getGradeSub(member) };
}

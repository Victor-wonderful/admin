"use server";

import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";
import { checkCapability } from "@/lib/admin-guard";
import { syncMemberAccess } from "@/lib/member-access";
import { audit } from "@/lib/audit";
import { generateTempPassword } from "@/lib/passwords";
import { syncFortunaAccount, setFortunaBanned, getLinkedFortunaId } from "@/lib/fortuna-auth";
import { toUid } from "@/lib/uid";

// 관리자 회원 제어 — 회원 상세의 "비밀번호 재설정" · "계정 정지/해제". 회원 운영(members.write) 권한.

type MemberInfo = { id: string; email: string | null; display_name: string; suspended_at: string | null };

async function loadMember(memberId: string): Promise<MemberInfo | null> {
  const sb = getServerClient();
  const { data } = await sb.from("members").select("id, email, display_name, suspended_at").eq("id", memberId).maybeSingle();
  return (data as MemberInfo | null) ?? null;
}

// 임시 비밀번호 발급 — 한 번만 화면에 보여준다. 회원 세션 전부 종료, Fortuna 앱 계정도 같은 비밀번호로.
export async function resetMemberPassword(memberId: string): Promise<{ ok: true; tempPassword: string } | { ok: false; error: string }> {
  const g = await checkCapability("members.write", "회원 비밀번호 재설정");
  if (!g.ok) return { ok: false, error: g.error };
  const m = await loadMember(memberId);
  if (!m) return { ok: false, error: "회원을 찾을 수 없습니다" };
  const temp = generateTempPassword();
  const sb = getServerClient();
  const { error } = await sb.rpc("admin_set_member_password", { p_member: memberId, p_new: temp });
  if (error) return { ok: false, error: "재설정 처리 중 오류가 발생했습니다" };
  await syncFortunaAccount({ memberId, email: m.email, password: temp, displayName: m.display_name });
  await audit({ category: "member", action: "member_password_reset", target: `회원 ${toUid(memberId)}${m.email ? ` (${m.email})` : ""} 임시 비밀번호 발급 · 세션 전부 종료`, targetId: memberId, risk: true });
  revalidatePath(`/admin/members/${memberId}`);
  return { ok: true, tempPassword: temp };
}

// 계정 정지 / 해제. 정지: 로그인 차단 + 세션 종료 + Fortuna 앱 계정 차단. 해제: 모두 복구.
export async function setMemberSuspended(memberId: string, suspended: boolean, reason: string): Promise<{ ok: boolean; error?: string }> {
  const g = await checkCapability("members.write", suspended ? "회원 계정 정지" : "회원 정지 해제");
  if (!g.ok) return { ok: false, error: g.error };
  if (suspended && !reason.trim()) return { ok: false, error: "정지 사유를 입력하세요" };
  const m = await loadMember(memberId);
  if (!m) return { ok: false, error: "회원을 찾을 수 없습니다" };
  const sb = getServerClient();
  const { error } = await sb.rpc("admin_set_member_suspended", { p_member: memberId, p_suspended: suspended, p_reason: reason });
  if (error) return { ok: false, error: "처리 중 오류가 발생했습니다" };
  const fortunaId = await getLinkedFortunaId(memberId);
  if (fortunaId) await setFortunaBanned(fortunaId, suspended);
  await audit({
    category: "member",
    action: suspended ? "member_suspend" : "member_unsuspend",
    target: `회원 ${toUid(memberId)}${m.email ? ` (${m.email})` : ""} ${suspended ? `계정 정지 · 사유: ${reason.trim()}` : "정지 해제"}`,
    targetId: memberId,
    risk: true,
  });
  revalidatePath(`/admin/members/${memberId}`);
  revalidatePath("/admin/members");
  return { ok: true };
}

// 체험 연장(슈퍼관리자 전용) — members.trial_until 을 지정 시각으로 두고 포르투나 앱 이용 기한을 즉시 갱신한다.
// 규칙(2026-09-06): 기본 체험은 가입 후 2일. 연장은 앞당길 수 없고(기존보다 뒤여야), 최대 1년.
export async function extendMemberTrial(memberId: string, untilDate: string): Promise<{ ok: boolean; error?: string; until?: string }> {
  const g = await checkCapability("members.write", "회원 체험 연장");
  if (!g.ok) return { ok: false, error: g.error };
  if (g.admin.role !== "super") return { ok: false, error: "슈퍼관리자만 체험을 연장할 수 있습니다" };
  const d = new Date(`${untilDate}T23:59:59+09:00`); // 해당 날짜의 한국시간 끝까지
  if (!untilDate || Number.isNaN(d.getTime())) return { ok: false, error: "날짜가 올바르지 않습니다" };
  if (d.getTime() < Date.now()) return { ok: false, error: "오늘 이후 날짜를 고르세요" };
  if (d.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) return { ok: false, error: "최대 1년까지 연장할 수 있습니다" };

  const sb = getServerClient();
  const { data: m } = await sb.from("members").select("email, trial_until").eq("id", memberId).maybeSingle();
  if (!m) return { ok: false, error: "회원을 찾을 수 없습니다" };
  const { error } = await sb.from("members").update({ trial_until: d.toISOString() }).eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  await syncMemberAccess(memberId);
  await audit({ category: "member", action: "member_trial_extend", target: `회원 ${toUid(memberId)}${m.email ? ` (${m.email})` : ""} 체험 연장 → ${untilDate} 까지`, targetId: memberId, risk: false, meta: { trial_until: d.toISOString(), prev: m.trial_until ?? null } });
  return { ok: true, until: d.toISOString() };
}

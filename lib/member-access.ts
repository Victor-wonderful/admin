import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { isFortunaConfigured, setFortunaAccessUntil } from "@/lib/fortuna-auth";

// 포르투나 앱 이용 권한 동기화(2026-09-06 Victor 결정: 가입 후 2일 체험, 이후 구독 필요. 파트너도 동일).
// 만료 시각은 DB 함수 member_access_until(0052) 이 계산하고, 여기서 포르투나 앱 profiles.access_until 에 밀어 넣는다.
// 호출 시점: 가입/로그인/비밀번호 변경(syncFortunaAccount) · 구독 결제/갱신 · 구독 상품 구매 · 일일 갱신 크론(전체).

export async function syncMemberAccess(memberId: string): Promise<void> {
  if (!isFortunaConfigured()) return;
  const sb = getServerClient();
  const { data: m } = await sb.from("members").select("fortuna_user_id").eq("id", memberId).maybeSingle();
  const fortunaId = (m?.fortuna_user_id as string | null) ?? null;
  if (!fortunaId) {
    console.info(`[member-access] ${memberId.slice(0, 8)} 앱 계정 미연결 → 건너뜀`);
    return;
  }
  const { data: until, error } = await sb.rpc("member_access_until", { p_member: memberId });
  if (error) {
    console.warn("[member-access] 만료 시각 계산 실패:", error.message);
    return;
  }
  await setFortunaAccessUntil(fortunaId, (until as string | null) ?? null);
  console.info(`[member-access] ${memberId.slice(0, 8)} 앱 이용 기한 → ${until ?? "무제한"}`);
}

// 연결된 회원 전부 동기화(일일 크론용). 회원 수가 많아지면 변경분만 추리도록 바꾼다.
export async function syncAllMemberAccess(): Promise<{ total: number; synced: number }> {
  if (!isFortunaConfigured()) return { total: 0, synced: 0 };
  const sb = getServerClient();
  const { data: rows } = await sb.from("members").select("id, fortuna_user_id").not("fortuna_user_id", "is", null);
  const list = (rows ?? []) as Array<{ id: string; fortuna_user_id: string }>;
  let synced = 0;
  for (const r of list) {
    const { data: until, error } = await sb.rpc("member_access_until", { p_member: r.id });
    if (error) continue;
    try {
      await setFortunaAccessUntil(r.fortuna_user_id, (until as string | null) ?? null);
      synced++;
    } catch (e) {
      console.warn("[member-access] 앱 반영 실패:", r.id, e instanceof Error ? e.message : e);
    }
  }
  return { total: list.length, synced };
}

// 회원 상세 표시용: 현재 계산된 앱 이용 만료 시각(ISO) — 없으면 null.
export async function getMemberAccessUntil(memberId: string): Promise<string | null> {
  const sb = getServerClient();
  const { data, error } = await sb.rpc("member_access_until", { p_member: memberId });
  if (error) return null;
  return (data as string | null) ?? null;
}

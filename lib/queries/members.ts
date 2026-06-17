import "server-only";
import { getServerClient } from "@/lib/supabase/server";
import type { MemberRow, ReferralCodeRow, SubscriptionRow, ProductRow } from "@/lib/supabase/types";

export async function listMembers(opts?: { role?: string; activeOnly?: boolean }): Promise<MemberRow[]> {
  const sb = getServerClient();
  let q = sb.from("members").select("*").order("created_at", { ascending: true });
  if (opts?.role) q = q.eq("role", opts.role);
  if (opts?.activeOnly) q = q.eq("is_active_subscriber", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function getMember(id: string): Promise<MemberRow | null> {
  const sb = getServerClient();
  const { data, error } = await sb.from("members").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as MemberRow) ?? null;
}

export async function getMemberSubscriptions(id: string): Promise<SubscriptionRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("subscriptions")
    .select("*")
    .eq("member_id", id)
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SubscriptionRow[];
}

export async function getReferralCode(ownerId: string): Promise<ReferralCodeRow | null> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("referral_codes")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as ReferralCodeRow) ?? null;
}

export async function listMarketers(): Promise<MemberRow[]> {
  return listMembers({ role: "marketer" });
}

// 특정 회원이 추천(recommender)한 직접 하위 회원 목록
export async function listReferred(recommenderId: string): Promise<MemberRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb
    .from("members")
    .select("*")
    .eq("recommender_id", recommenderId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MemberRow[];
}

export async function listProducts(): Promise<ProductRow[]> {
  const sb = getServerClient();
  const { data, error } = await sb.from("products").select("*").order("code");
  if (error) throw error;
  return (data ?? []) as ProductRow[];
}

// 회원 카운트 요약(어드민 대시보드)
export async function getMemberStats() {
  const members = await listMembers();
  const by = { registered: 0, subscriber: 0, marketer: 0 };
  let active = 0;
  for (const m of members) {
    by[m.role]++;
    if (m.is_active_subscriber) active++;
  }
  return { total: members.length, active, ...by };
}

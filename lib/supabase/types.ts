// 도메인 타입 (수동 작성 — CLI gen types 가 플랫폼 로그인을 요구해 대체).
// 스키마: supabase/migrations/0001_init.sql 와 일치.

export type MemberRole = "registered" | "subscriber" | "marketer";

export interface MemberRow {
  id: string;
  display_name: string;
  email: string | null;
  role: MemberRole;
  recommender_id: string | null;
  parent_id: string | null;
  joined_at: string;
  is_active_subscriber: boolean;
  created_at: string;
  fortuna_user_id?: string | null; // Fortuna 제품 앱(Supabase Auth) 연결 id
  payout_address_trc20?: string | null; // 회원 본인 지갑(Tron) — 출금 목적지·입금 식별
  payout_address_bep20?: string | null; // 회원 본인 지갑(BSC)
  auto_renew?: boolean; // 구독 자동 갱신(false = 해지 예약)
  placement_slot?: number | null; // 후원 부모 아래 자리 번호(1 = 주력 라인 머리, 파트너 전용)
  placed_at?: string | null;
  placed_by?: string | null; // system | partner | admin | seed
  placement_locked?: boolean; // 한 번 확정되면 true(파트너 변경 불가)
  placement_note?: string | null;
}

export interface ReferralCodeRow {
  id: string;
  code: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductRow {
  id: string;
  code: string;
  name: string;
  price_usd: number | null;
  billing: "monthly" | "yearly" | "event";
  is_active: boolean; // 판매 중
  pool_eligible: boolean; // 매출을 수당 풀에 포함
  counts_active: boolean; // 구매 시 활성 구독자 카운팅
  description: string | null;
  sort_order: number;
  updated_at?: string;
}

export interface SubscriptionRow {
  id: string;
  member_id: string;
  product_id: string | null;
  amount_usd: number;
  period_start: string;
  period_end: string;
  paid_at: string;
  status: "active" | "expired";
  created_at: string;
}

export interface ProductPurchaseRow {
  id: string;
  member_id: string;
  product_id: string;
  product_name: string;
  amount_usd: number;
  billing: "monthly" | "yearly" | "event";
  period_start: string | null;
  period_end: string | null;
  paid_at: string;
  status: string;
  created_at: string;
}

export interface AnnualMembershipRow {
  id: string;
  member_id: string;
  amount_usd: number;
  period_start: string;
  period_end: string;
  paid_at: string;
  created_at: string;
}

// RPC 반환형
export interface MarketerLeg {
  leg_root: string;
  leg_name: string;
  active_count: number;
}

export interface MajorMinor {
  major_leg: number;
  other_minor: number;
  total_active: number;
  leg_count: number;
}

export interface RankRow {
  rank: number;
  rate_pct: number;
  min_total: number | null;
  min_direct: number | null;
  override_rate: number | null;
  requires_30pct: boolean;
  label: string;
}

export interface RankInfo {
  rank: number;
  rate_pct: number;
  total_active: number;
  direct_active: number;
  major_leg: number;
  other_minor: number;
  balance_pct: number; // 기타소실적 비율 (0~1)
  balance_ok: boolean;
  blocked_by_balance: boolean; // 카운트는 5직급+ 되나 30% 미달로 강등
  next_rank: number | null;
  next_min_total: number | null;
  next_min_direct: number | null;
}

// 트리 시각화 공통 노드
export interface TreeNode {
  id: string;
  name: string;
  role: MemberRole;
  isActive: boolean;
  children: TreeNode[];
  meta?: { activeCount?: number; recommenderId?: string | null; parentId?: string | null; slot?: number | null };
}

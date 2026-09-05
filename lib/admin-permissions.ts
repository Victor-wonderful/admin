import type { AdminRole } from "@/lib/admin-session";

// 관리자 역할별 권한 매트릭스 — 순수 모듈(서버·클라이언트 공용).
//   super      슈퍼관리자  : 전부
//   settlement 정산 관리자 : 정산·자금 실행(정산 재산정/확정/지급/보류, 출금 승인, 입금 매칭, 매출 배분) + 나머지 조회
//   ops        운영 매니저 : 회원·조직 운영(강제 로그아웃, 후원배치 이동) + 회원·주문·매출·상품 조회. 정산·자금 화면 없음
//   viewer     조회 전용   : 전부 조회, 실행 없음
// 관리자·권한 화면은 슈퍼관리자만.

export type AdminPage =
  | "dashboard" | "members" | "org" | "orders" | "revenue"
  | "settlements" | "deposits" | "withdrawals" | "wallet" | "transactions"
  | "ranks" | "products" | "admins" | "audit" | "account";

export type Capability = "members.write" | "settlement.write" | "finance.write" | "catalog.write" | "admins.write";

export const PAGE_LABEL: Record<AdminPage, string> = {
  dashboard: "대시보드", members: "회원관리", org: "조직도", orders: "구독·주문", revenue: "매출현황",
  settlements: "수당 정산", deposits: "입금내역", withdrawals: "출금내역", wallet: "지갑잔액", transactions: "트랜잭션",
  ranks: "수당체계·직급", products: "상품·구독플랜", admins: "관리자·권한", audit: "감사 로그", account: "내 계정",
};

export const CAPABILITY_LABEL: Record<Capability, string> = {
  "members.write": "회원 운영",
  "settlement.write": "정산 실행",
  "finance.write": "자금 처리",
  "catalog.write": "상품·수당체계 변경",
  "admins.write": "관리자 관리",
};

const ALL_PAGES: AdminPage[] = ["dashboard", "members", "org", "orders", "revenue", "settlements", "deposits", "withdrawals", "wallet", "transactions", "ranks", "products", "admins", "audit", "account"];
const VIEW_PAGES: AdminPage[] = ALL_PAGES.filter((p) => p !== "admins");

export const ROLE_PAGES: Record<AdminRole, AdminPage[]> = {
  super: ALL_PAGES,
  settlement: VIEW_PAGES,
  ops: ["dashboard", "members", "org", "orders", "revenue", "products", "audit", "account"],
  viewer: VIEW_PAGES,
};

export const ROLE_CAPS: Record<AdminRole, Capability[]> = {
  super: ["members.write", "settlement.write", "finance.write", "catalog.write", "admins.write"],
  settlement: ["settlement.write", "finance.write"],
  ops: ["members.write"],
  viewer: [],
};

export function canView(role: AdminRole, page: AdminPage): boolean {
  return ROLE_PAGES[role].includes(page);
}
export function can(role: AdminRole, cap: Capability): boolean {
  return ROLE_CAPS[role].includes(cap);
}

// 사이드바 경로 → 페이지 키.
export function pageOfPath(href: string): AdminPage | null {
  const seg = href.replace(/^\/admin\/?/, "").split("/")[0];
  return (ALL_PAGES as string[]).includes(seg) ? (seg as AdminPage) : null;
}

// 기준일 유틸 — 화면·정산·구독 계산은 모두 "실제 오늘"(Asia/Seoul) 기준.
// (이전에는 데모용 고정 날짜 2026-06-15 를 썼다.)

const TZ = "Asia/Seoul";

// YYYY-MM-DD (서울 기준 오늘)
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

// YYYY-MM (서울 기준 이번 달) — 정산 사이클 키
export function currentCycle(): string {
  return today().slice(0, 7);
}

// 두 날짜(YYYY-MM-DD) 차이(일). b - a.
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000);
}

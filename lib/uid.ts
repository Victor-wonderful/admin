// 회원 식별 UID — 회원은 실명이 없고 모든 화면에서 UID(FT·XXXXXX)로 표시한다.
// 시드 display_name(예: "마케터#0")이 아니라 회원 id에서 결정적으로 파생한다(FNV-1a 32bit).
export function toUid(id: string | null | undefined): string {
  if (!id) return "—";
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "FT·" + h.toString(16).toUpperCase().padStart(8, "0").slice(0, 6);
}

// 아바타 이니셜 — UID 뒤 2자리(예: FT·8F3A21 → "8F").
export function uidInitials(id: string | null | undefined): string {
  const u = toUid(id);
  return u.startsWith("FT·") ? u.slice(3, 5) : u.slice(0, 2);
}

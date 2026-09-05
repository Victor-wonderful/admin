import { randomBytes } from "node:crypto";

// 임시 비밀번호 생성 — 헷갈리는 글자(0/O, 1/l/I) 제외, 12자. 관리자·회원 초기화 공용.
export function generateTempPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

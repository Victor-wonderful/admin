import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// TOTP(RFC 6238) — Google Authenticator / Authy 호환. 외부 의존성 없이 Node crypto 로 구현.
// 30초 주기, 6자리, SHA-1, 앞뒤 1스텝 허용(시계 오차).

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const byte of buf) {
    value = (value << 8) | byte; bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch); bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Uint8Array.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20)); // 160bit
}

function hotp(secret: Uint8Array, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", Buffer.from(secret)).update(msg).digest();
  const off = h[h.length - 1] & 0x0f;
  const code = ((h[off] & 0x7f) << 24) | ((h[off + 1] & 0xff) << 16) | ((h[off + 2] & 0xff) << 8) | (h[off + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function totpCode(secretB32: string, at = Date.now(), step = 30): string {
  return hotp(base32Decode(secretB32), Math.floor(at / 1000 / step));
}

// 입력 코드 검증(±1 스텝). 비교는 타이밍 안전.
export function verifyTotp(secretB32: string, code: string, at = Date.now(), step = 30, window = 1): boolean {
  const c = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(c)) return false;
  const secret = base32Decode(secretB32);
  const counter = Math.floor(at / 1000 / step);
  for (let w = -window; w <= window; w++) {
    const expect = hotp(secret, counter + w);
    if (expect.length === c.length && timingSafeEqual(Buffer.from(expect), Buffer.from(c))) return true;
  }
  return false;
}

// 인증 앱 등록용 URI (QR 로 표시)
export function otpauthUrl(secretB32: string, account: string, issuer = "Fortuna Admin"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

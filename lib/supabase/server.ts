import "server-only";
import { createClient } from "@supabase/supabase-js";

// 서버 전용 Supabase 클라이언트(service-role). 클라이언트 컴포넌트에 import 금지.
// TODO: 프로덕션 전 anon 키 + RLS 로 전환.
export function getServerClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다 (.env.local 확인).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { today } from "@/lib/dates";

export const dynamic = "force-dynamic";

// 구독 자동 갱신·만료 배치(크론용). 매일 1회 호출: Vercel Cron 또는 외부 스케줄러.
// 인증: Authorization: Bearer <CRON_SECRET> (Vercel Cron 은 자동으로 붙여 보낸다).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = getServerClient();
  const { data, error } = await sb.rpc("process_subscription_renewals", { p_today: today() });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, today: today(), ...row });
}

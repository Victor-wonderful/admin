import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { today } from "@/lib/dates";
import { sendEmail, renewalReminderText } from "@/lib/notify";

export const dynamic = "force-dynamic";

// 구독 일일 배치(크론용). 매일 1회 호출: Vercel Cron 또는 외부 스케줄러.
//  1) 종료일 지난 구독 자동 갱신/만료
//  2) 3일 안에 종료되는데 잔액이 부족한 회원에게 이메일 안내(제공자 미설정이면 로그만)
// 인증: Authorization: Bearer <CRON_SECRET> (Vercel Cron 은 자동으로 붙여 보낸다).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = getServerClient();
  const t = today();

  const { data: batch, error } = await sb.rpc("process_subscription_renewals", { p_today: t });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const counts = Array.isArray(batch) ? batch[0] : batch;

  // 3) 후원배치 7일 방치 → 1번 라인 최하단 자동 배치·확정
  const { data: placed, error: pErr } = await sb.rpc("auto_place_pending", { p_days: 7 });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // 4) 매출 배분 안전망 — 결제 트리거가 결제마다 배분하지만, 이번 달 사이클을 한 번 더 재계산(멱등)
  const { error: aErr } = await sb.rpc("allocate_revenue", { p_cycle: t.slice(0, 7) });
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  const { data: reminders, error: rErr } = await sb.rpc("list_renewal_reminders", { p_today: t, p_days: 3 });
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const sent = { sent: 0, skipped: 0, failed: 0 };
  for (const r of (reminders ?? []) as Array<{ email: string; display_name: string; period_end: string; amount_usd: number; balance_usd: number }>) {
    const { subject, text } = renewalReminderText({
      nickname: r.display_name,
      endDate: String(r.period_end).slice(0, 10),
      price: Number(r.amount_usd),
      balance: Number(r.balance_usd),
    });
    const res = await sendEmail(r.email, subject, text);
    sent[res] += 1;
  }

  return NextResponse.json({ ok: true, today: t, renewals: counts, autoPlaced: Number(placed ?? 0), reminders: { candidates: reminders?.length ?? 0, ...sent } });
}

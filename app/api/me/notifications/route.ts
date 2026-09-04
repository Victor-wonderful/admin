import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/session";
import { getMemberSubscriptions } from "@/lib/queries/members";
import { getMemberWalletData } from "@/lib/queries/finance";
import { getPlanPrices, getMemberAnnualMembership } from "@/lib/queries/products";
import { today, daysBetween, toSeoulDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export type NotificationItem = { id: string; tone: "info" | "warning" | "negative" | "green"; title: string; sub: string; ts?: string };

// 상단 종 아이콘용 알림 — 세션 회원의 실제 상태에서 만든다(구독 만료/임박·잔액, 최근 지갑 내역).
export async function GET() {
  const me = await getCurrentMember();
  if (!me) return NextResponse.json({ items: [] as NotificationItem[] });

  const [subs, wd, plans] = await Promise.all([getMemberSubscriptions(me.id), getMemberWalletData(me.id), getPlanPrices()]);
  const t = today();
  const items: NotificationItem[] = [];

  if (me.role !== "registered") {
    const active = subs.find((s) => s.status === "active" && s.period_start <= t && t <= s.period_end);
    const balance = wd.wallet?.balance_usd ?? 0;
    if (!active && subs.length > 0) {
      items.push({ id: "sub-expired", tone: "negative", title: "구독이 만료되었습니다", sub: `마지막 종료일 ${subs[0].period_end.slice(0, 10)} · 지금 갱신하면 30일 이용` });
    } else if (active) {
      const dday = daysBetween(t, active.period_end.slice(0, 10));
      if (dday <= 7 && balance < plans.sub) {
        items.push({ id: "sub-lowbal", tone: "warning", title: `D-${dday} 구독 자동 결제 예정 · 잔액 부족`, sub: `잔액 $${balance.toFixed(0)} · 필요 $${plans.sub} → 입금이 필요합니다` });
      } else if (dday <= 3) {
        items.push({ id: "sub-soon", tone: "info", title: `D-${dday} 구독 자동 결제 예정`, sub: `${active.period_end.slice(0, 10)}에 잔액에서 $${plans.sub} 결제` });
      }
    }
  }

  if (me.role === "marketer") {
    const annual = await getMemberAnnualMembership(me.id);
    if (annual) {
      const d = daysBetween(t, annual.period_end.slice(0, 10));
      if (d < 0) items.push({ id: "ms-expired", tone: "negative", title: "파트너 멤버십이 만료되었습니다", sub: `${annual.period_end.slice(0, 10)} 종료 · 구독·주문에서 갱신 ($${plans.annual})` });
      else if (d <= 14) items.push({ id: "ms-soon", tone: "warning", title: `파트너 멤버십 D-${d}`, sub: `${annual.period_end.slice(0, 10)} 종료 · 지금 갱신 가능 ($${plans.annual})` });
    }
  }

  for (const r of wd.ledger.slice(0, 5)) {
    const amt = Math.round(Math.abs(r.amount_usd));
    const tone = r.tx_type === "commission" ? "green" : r.tx_type === "deposit" ? "info" : r.tx_type === "withdrawal" ? "warning" : "info";
    items.push({ id: `tx-${r.ts}-${r.tx_type}`, tone, title: r.desc, sub: `${r.amount_usd >= 0 ? "+" : "−"}$${amt.toLocaleString()} · ${toSeoulDate(r.ts)}`, ts: r.ts });
  }

  return NextResponse.json({ items });
}

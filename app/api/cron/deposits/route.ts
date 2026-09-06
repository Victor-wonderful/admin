import { NextResponse } from "next/server";
import { scanDeposits } from "@/lib/deposit-scan";
import { syncWithdrawalsFromChain } from "@/lib/withdrawal-sync";

export const dynamic = "force-dynamic";

// 온체인 입금 스캔(크론용). 몇 분 간격으로 호출: Vercel Cron 또는 외부 스케줄러.
// 회사 입금 주소로 들어온 USDT 를 조회해 회원 잔액에 반영하고, 나간 USDT 로 '송금 중' 출금을 자동 완료한다. 키·주소 미설정 네트워크는 skipped.
// 인증: Authorization: Bearer <CRON_SECRET> (renewals 와 동일).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const results = await scanDeposits();
    const withdrawals = await syncWithdrawalsFromChain(); // 송금 중 출금 건의 체인 확인 → 자동 완료
    return NextResponse.json({ ok: true, at: new Date().toISOString(), results, withdrawals });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

import "server-only";

// 회원 알림 발송(이메일). 제공자는 환경변수로 결정한다.
//   RESEND_API_KEY + NOTIFY_FROM_EMAIL → Resend 로 발송
//   미설정 → 발송하지 않고 서버 로그에만 남긴다(개발 환경).
// 반환: 'sent' | 'skipped' | 'failed'

export type NotifyResult = "sent" | "skipped" | "failed";

export async function sendEmail(to: string, subject: string, text: string): Promise<NotifyResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM_EMAIL;
  if (!key || !from) {
    console.info(`[notify] (미발송·제공자 미설정) to=${to} subject=${subject}`);
    return "skipped";
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.warn("[notify] 발송 실패:", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (e) {
    console.warn("[notify] 발송 예외:", e instanceof Error ? e.message : e);
    return "failed";
  }
}

// 갱신 예정 안내 문구(잔액 부족)
export function renewalReminderText(args: { nickname: string; endDate: string; price: number; balance: number }): { subject: string; text: string } {
  const need = Math.max(0, args.price - args.balance);
  return {
    subject: `[포르투나] 구독 자동 결제 예정 · 잔액 부족 안내 (${args.endDate})`,
    text:
      `${args.nickname}님,\n\n` +
      `포르투나 구독이 ${args.endDate}에 종료되며, 종료일에 내 지갑 잔액에서 $${args.price}가 자동 결제됩니다.\n` +
      `현재 잔액 $${args.balance.toFixed(2)} 로 결제에 $${need.toFixed(2)} 가 부족합니다.\n\n` +
      `종료일 전에 회사 입금 주소로 USDT 를 입금해 주세요. 잔액이 부족하면 구독이 만료되어 포르투나 앱 이용이 중단됩니다.\n\n` +
      `— 포르투나`,
  };
}

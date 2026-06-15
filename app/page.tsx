import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <div>
        <h1 className="text-3xl font-bold">MLM 보상 시스템 어드민</h1>
        <p className="mt-2 text-muted-foreground">
          AI 트레이딩 봇 구독 기반 네트워크 마케팅 — 직접추천/후원 두 계보도, 대실적·기타소실적 집계 프로토타입.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/marketer" className="rounded-xl border bg-card p-6 transition-colors hover:bg-muted">
          <h2 className="text-lg font-semibold">마케터 홈 →</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            요약 카드(대실적/기타소실적), 직접추천·후원 계보도, 레퍼럴 코드.
          </p>
        </Link>
        <Link href="/admin/members" className="rounded-xl border bg-card p-6 transition-colors hover:bg-muted">
          <h2 className="text-lg font-semibold">운영자 어드민 →</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            회원 관리(3단계), 전체 조직도, 월 만료 실행, 스필오버 배치.
          </p>
        </Link>
      </div>
    </main>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReferralCode, getMember } from "@/lib/queries/members";
import { ROOT_MARKETER_ID } from "@/lib/constants";

export default async function ReferralPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const id = as ?? ROOT_MARKETER_ID;
  const [me, code] = await Promise.all([getMember(id), getReferralCode(id)]);
  const isMarketer = me?.role === "marketer";

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">레퍼럴 코드</h1>

      {!isMarketer ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            레퍼럴 권한은 <b>마케터</b>(연회비 $200 유지자)만 가집니다. 일반 회원/구독자는 코드를 발급받을 수
            없습니다. <span className="text-foreground">(규칙 R1)</span>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">내 코드 (1인 1개 — 규칙 R2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border bg-muted px-4 py-3 font-mono text-lg">
              {code?.code ?? "코드 없음"}
            </div>
            {code ? (
              <div className="text-sm text-muted-foreground">
                가입 링크 예시:
                <div className="mt-1 rounded bg-background px-3 py-2 font-mono text-xs">
                  https://platform.example/signup?ref={code.code}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              이 코드로 가입하면 추천인(수당 귀속)은 나로 고정됩니다. 조직 내 배치 위치(후원)는 별도입니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

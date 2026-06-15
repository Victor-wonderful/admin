import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listRanks } from "@/lib/queries/ranks";

export default async function RanksPage() {
  const ranks = await listRanks();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">수당체계 — 직급 / 요율</h1>
        <p className="text-sm text-muted-foreground">
          직급 기준 = 후원계보 포함 전체 활성 구독유저수. 1~3직급은 직접추천 수로도 인정. 5직급+는 기타소실적
          30% 이상 유지 필요. (금액 정산 로직은 기준금 확정 후 추가)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">① 직접추천수당</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          직접추천 계보 기준 — <b>1대 25%</b>, <b>2대 9%</b> (2세대).
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">② 직급수당 (요율 · 차액차단)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>직급</TableHead>
                <TableHead>직급요율</TableHead>
                <TableHead>달성조건 (후원계보 포함)</TableHead>
                <TableHead>직추 대체</TableHead>
                <TableHead>30% 게이트</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks.map((r) => (
                <TableRow key={r.rank}>
                  <TableCell className="font-medium">{r.rank}직급</TableCell>
                  <TableCell>{Number(r.rate_pct)}%</TableCell>
                  <TableCell>
                    {r.min_total ? `총 활성 ${r.min_total.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.min_direct ? `직접추천 ${r.min_direct}` : "—"}
                  </TableCell>
                  <TableCell>{r.requires_30pct ? "필요" : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            산하에 동급자 이상이 나오면 차액(브레이크어웨이)만 지급됩니다. 1직급의 첫 직접추천은 대실적 후원계보로
            자동지정됩니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">③ 직급 차등 누적배분 (3~9직급, 중복수령)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>대상직급</TableHead>
                <TableHead>배분요율</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks
                .filter((r) => r.override_rate != null)
                .map((r) => (
                  <TableRow key={r.rank}>
                    <TableCell>{r.rank}직급</TableCell>
                    <TableCell>{Number(r.override_rate)}%</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            차등 누적배분방식(상위 직급이 하위 위에 겹쳐 받는 오버라이드). 금액 정산은 기준금 확정 후 구현.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

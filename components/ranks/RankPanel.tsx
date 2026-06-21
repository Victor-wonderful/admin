import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RankInfo } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

function Bar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full bg-primary", className)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function RankPanel({ info }: { info: RankInfo }) {
  const ranked = info.rank > 0;
  const balancePctText = `${Math.round(info.balance_pct * 100)}%`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          직급 자격
          {ranked ? (
            <Badge className="bg-violet-600 text-white">
              {info.rank}직급 · {Number(info.rate_pct)}%
            </Badge>
          ) : (
            <Badge variant="outline">무직급</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* 다음 직급 진행 */}
        {info.next_rank ? (
          <div className="space-y-1.5">
            <div className="flex justify-between text-muted-foreground">
              <span>다음 {info.next_rank}직급까지</span>
              <span className="tabular-nums">
                후원 전체 활성 {info.total_active.toLocaleString()}
                {info.next_min_total ? ` / ${info.next_min_total.toLocaleString()}` : ""}
              </span>
            </div>
            {info.next_min_total ? <Bar value={info.total_active} max={info.next_min_total} /> : null}
            {info.next_min_direct ? (
              <p className="text-xs text-muted-foreground">
                또는 직접추천 {info.direct_active} / {info.next_min_direct} (1~3직급은 직추로도 인정)
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">최고 직급(9직급)입니다.</p>
        )}

        {/* 30% 기타소실적 균형 = 공유수당 자격(5직급+) */}
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">기타소실적 비율 (공유수당 5직급+ 30%)</span>
            <span
              className={cn(
                "font-medium tabular-nums",
                info.balance_ok ? "text-emerald-600" : "text-amber-600"
              )}
            >
              {balancePctText} {info.balance_ok ? "✓" : "(부족)"}
            </span>
          </div>
          <Bar
            value={Math.round(info.balance_pct * 100)}
            max={30}
            className={info.balance_ok ? "bg-emerald-500" : "bg-amber-500"}
          />
          {info.blocked_by_balance ? (
            <p className="text-xs text-amber-600">
              ⚠ 직급·직급수당은 그대로지만, 기타소실적 30% 미달로 <b>공유수당</b>(5직급↑)을 받지 못합니다.
            </p>
          ) : null}
        </div>

        <div className="flex gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span>대실적 {info.major_leg.toLocaleString()}</span>
          <span>기타소실적 {info.other_minor.toLocaleString()}</span>
          <span>직접추천(활성) {info.direct_active.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}

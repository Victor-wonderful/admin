import { cn } from "@/lib/utils";
import type { MemberCyclePoint } from "@/lib/queries/finance";

// 파트너 지갑 — 리워드 적립 추이. 최근 6개 사이클(빈 달 포함)을 같은 폭의 누적 막대로.
// 초대(레벨)=green · 직급(랭크)=crypto · 팀(공유)=info. 당월 막대는 진하게 + 링. 서버 컴포넌트(hover 는 CSS).

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;
const SERIES = [
  { key: "level", label: "초대", cls: "bg-green-500" },
  { key: "rank", label: "직급", cls: "bg-crypto" },
  { key: "share", label: "팀", cls: "bg-info" },
] as const;

// 축 최댓값을 보기 좋은 단위로 올림(1·2·5 × 10^k).
function niceMax(v: number): number {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const k of [1, 2, 2.5, 5, 10]) if (v <= k * p) return k * p;
  return 10 * p;
}
const monthLabel = (cycle: string) => `${Number(cycle.slice(5, 7))}월`;

export function RewardTrendChart({ points, currentCycle }: { points: MemberCyclePoint[]; currentCycle: string }) {
  const max = niceMax(Math.max(0, ...points.map((p) => p.total)));
  const ticks = [1, 0.5, 0];
  const hasAny = points.some((p) => p.total > 0);
  const sum = points.reduce((s, p) => s + p.total, 0);
  const shown = points.filter((p) => p.total > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3.5">
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
              <span className={cn("size-2 rounded-sm", s.cls)} /> {s.label}
            </span>
          ))}
        </div>
        <span className="text-[12px] text-text-tertiary">
          {hasAny ? <>6개월 합계 <b className="font-semibold text-text-secondary">{usd(sum)}</b> · 정산 {shown}회</> : "정산된 리워드가 아직 없습니다"}
        </span>
      </div>

      <div className="grid grid-cols-[40px_1fr] gap-x-2">
        {/* y축 */}
        <div className="relative h-40">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2 text-[10px] tabular-nums text-text-tertiary" style={{ top: `${(1 - t) * 100}%` }}>
              {usd(max * t)}
            </span>
          ))}
        </div>
        {/* 그리드 + 막대 */}
        <div className="relative h-40">
          {ticks.map((t) => (
            <div key={t} className={cn("absolute inset-x-0 border-t", t === 0 ? "border-border-strong" : "border-dashed border-border")} style={{ top: `${(1 - t) * 100}%` }} />
          ))}
          <div className="absolute inset-0 grid items-end gap-3 px-2" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
            {points.map((p) => {
              const isCur = p.cycle === currentCycle;
              const h = p.total > 0 ? Math.max(3, (p.total / max) * 100) : 0;
              return (
                <div key={p.cycle} className="group relative flex h-full flex-col justify-end">
                  {/* 툴팁 */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max -translate-x-1/2 rounded-md bg-feature px-2.5 py-2 text-[11px] leading-relaxed text-white shadow-lg group-hover:block">
                    <div className="font-semibold">{p.cycle.replace("-", "년 ")}월 · {usd(p.total)}</div>
                    {p.total > 0 ? (
                      <div className="mt-0.5 space-y-0.5 text-white/75">
                        {SERIES.filter((s) => p[s.key] > 0).map((s) => (
                          <div key={s.key} className="flex justify-between gap-3"><span>{s.label}</span><span className="tabular-nums">{usd(p[s.key])}</span></div>
                        ))}
                      </div>
                    ) : <div className="text-white/60">정산 없음</div>}
                  </div>
                  {p.total > 0 ? (
                    <span className={cn("mb-1 text-center text-[11px] font-semibold tabular-nums", isCur ? "text-text-primary" : "text-text-secondary")}>{usd(p.total)}</span>
                  ) : null}
                  <div className={cn("mx-auto w-full max-w-[56px] overflow-hidden rounded-t-md transition-opacity group-hover:opacity-90", isCur && p.total > 0 && "ring-2 ring-green-500/30 ring-offset-1 ring-offset-card", p.total === 0 && "h-[3px] rounded-sm bg-n-200")} style={p.total > 0 ? { height: `${h}%` } : undefined}>
                    {p.total > 0 ? (
                      <div className="flex h-full flex-col">
                        {SERIES.map((s) => (
                          <div key={s.key} className={cn(s.cls, !isCur && "opacity-70")} style={{ flexGrow: p[s.key] / p.total, flexBasis: 0 }} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* x축 */}
        <div />
        <div className="grid gap-3 px-2 pt-1.5" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
          {points.map((p) => {
            const isCur = p.cycle === currentCycle;
            return (
              <div key={p.cycle} className="text-center">
                <div className={cn("text-[11px] tabular-nums", isCur ? "font-bold text-text-primary" : "text-text-tertiary")}>{monthLabel(p.cycle)}</div>
                {isCur ? <div className="text-[10px] font-medium text-green-700">당월</div> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

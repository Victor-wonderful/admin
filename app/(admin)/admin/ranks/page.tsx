import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { listRanks } from "@/lib/queries/ranks";

export const dynamic = "force-dynamic";

const ALLOCATION = [
  { label: "수당 풀", pct: 60, color: "bg-green-500", desc: "레벨·직급·공유 지급 재원" },
  { label: "회사 수익", pct: 20, color: "bg-info", desc: "운영·개발" },
  { label: "지분자 배당", pct: 10, color: "bg-crypto", desc: "투자자 분배" },
  { label: "예비비", pct: 10, color: "bg-n-400", desc: "리스크 대비" },
];

const POOL = [
  { label: "레벨 수당", pct: 45, color: "bg-green-500", hint: "요율 1대 25% · 2대 9%" },
  { label: "직급 수당", pct: 38, color: "bg-crypto", hint: "요율 5~53% 차액차단" },
  { label: "공유 수당", pct: 17, color: "bg-info", hint: "직급별 차등 누적배분" },
];

export default async function AdminRanksPage() {
  const ranks = await listRanks();
  const shareRanks = ranks.filter((r) => r.override_rate != null);

  return (
    <>
      <Topbar title="수당체계·직급" sub="매출 배분 · 레벨·직급·공유 수당 설정" uid="운영자" />
      <div className="flex-1 space-y-4 overflow-auto p-7">
        {/* 매출 배분 구조 (정책 — 정적) */}
        <Panel title="매출 배분 구조" sub="매출 입금(100%) → 1차 배분" action={<Pill tone="green">합계 100%</Pill>}>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {ALLOCATION.map((a) => (
              <div key={a.label} className={a.color} style={{ width: `${a.pct}%` }} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {ALLOCATION.map((a) => (
              <div key={a.label} className="rounded-lg bg-surface-muted p-3.5 ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-text-primary">{a.label}</span>
                  <span className="text-sm font-bold text-text-primary">{a.pct}%</span>
                </div>
                <div className="mt-1 text-[11px] text-text-tertiary">{a.desc}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="수당 풀 설정" sub="수당 풀(매출 60%)을 레벨·직급·공유에 배분" action={<Pill tone="warning">추정값 · 재검토 필요</Pill>}>
          <div className="mb-4 flex h-3 overflow-hidden rounded-full">
            {POOL.map((p) => <div key={p.label} className={p.color} style={{ width: `${p.pct}%` }} />)}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {POOL.map((p) => (
              <div key={p.label} className="rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-text-primary">{p.label}</span>
                  <span className="text-base font-bold text-text-primary">{p.pct}%</span>
                </div>
                <div className="mt-1.5 text-[11px] text-text-tertiary">{p.hint}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="레벨 수당" sub="추천 세대 기준 · 1·2대만 (3대 이상 차단)">
          <div className="grid gap-3 sm:grid-cols-2">
            {[["1대", "25%", "직접 추천"], ["2대", "9%", "추천의 추천"]].map(([lv, rate, d]) => (
              <div key={lv} className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                <div>
                  <div className="text-sm font-bold text-green-700">{lv}</div>
                  <div className="text-xs text-text-secondary">{d}</div>
                </div>
                <div className="text-2xl font-bold text-green-700">{rate}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-text-tertiary">기준금 = 하위 회원의 $120 구독료. 3대 이상은 레벨 수당 지급 차단.</p>
        </Panel>

        {/* 직급 수당 — 실데이터 (ranks 테이블) */}
        <Panel title="직급 수당" sub={`${ranks.length}직급 · 차액(차등) 지급 · 차액차단(브레이크어웨이)`}>
          <div>
            <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
              <span>직급</span><span>요율</span><span>달성 조건 (후원 활성 구독자)</span><span>직추 대체</span><span>30% 게이트</span><span className="text-right">공유 배분</span>
            </div>
            {ranks.map((r) => (
              <div key={r.rank} className="grid grid-cols-[auto_auto_1fr_auto_auto_auto] items-center gap-3 border-b py-2.5 text-sm last:border-0">
                <span className="font-semibold text-text-primary">{r.rank}직급</span>
                <span className="font-bold text-crypto tabular-nums">{Number(r.rate_pct)}%</span>
                <span className="text-text-secondary tabular-nums">{r.min_total != null ? `총 활성 ${r.min_total.toLocaleString()}명` : "—"}</span>
                <span className="text-text-tertiary tabular-nums">{r.min_direct != null ? r.min_direct : "—"}</span>
                <span>{r.requires_30pct ? <Pill tone="warning">필요</Pill> : <span className="text-text-tertiary">—</span>}</span>
                <span className="justify-self-end text-text-secondary tabular-nums">{r.override_rate != null ? `${Number(r.override_rate)}%` : "—"}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
            상위 직급은 (본인 요율 − 직하위 직급 요율) 차액만 수령, 나머지는 하위로 내려갑니다. 산하 동급자 이상 시 차단. 첫 직접추천은 대실적 후원계보로 자동 지정.
          </p>
        </Panel>

        {/* 공유 수당 — 실데이터 */}
        <Panel title="공유 수당" sub="수당 풀의 공유수당 몫 · 직급별 차등 누적배분(중복수령)">
          <div className="flex flex-wrap gap-2">
            {shareRanks.map((r) => (
              <div key={r.rank} className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-2 ring-1 ring-border">
                <span className="text-[13px] font-semibold text-text-primary">{r.rank}직급</span>
                <span className="text-[13px] font-bold text-info tabular-nums">{Number(r.override_rate)}%</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-text-tertiary">5직급 = 전체 구독유저수 30% 기타소실적 유지. 상위 직급이 하위 위에 겹쳐 받는 중복수령 방식.</p>
        </Panel>
      </div>
    </>
  );
}

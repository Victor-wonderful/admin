import { ChartCandlestickIcon, RadarIcon, BrainCircuitIcon, NotebookPenIcon, ExternalLinkIcon } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { FORTUNA_APP_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Fortuna 앱 핵심 기능 4종 — 등록/구독회원 대시보드 공용. 각 타일은 앱을 새 탭으로 연다.
const TILES = [
  { icon: ChartCandlestickIcon, tone: "bg-green-50 text-green-700", title: "시장 현황", sub: "BTC 시세 · 도미넌스 · 공포탐욕 · 롱숏 비율" },
  { icon: RadarIcon, tone: "bg-info-soft text-info", title: "후보 레이더", sub: "코드 신호로 후보 선별 · 거래 가능/차단 판정" },
  { icon: BrainCircuitIcon, tone: "bg-crypto-soft text-crypto", title: "AI 리서치", sub: "거래소 데이터 → 진입·손절·목표 시나리오" },
  { icon: NotebookPenIcon, tone: "bg-warning-soft text-warning", title: "거래 일지 · AI 복기", sub: "실현 R · 청산 사유 기록 · AI 코칭" },
];

export function FortunaFeatureTiles({ title, sub }: { title: string; sub: string }) {
  return (
    <Panel title={title} sub={sub}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <a
            key={t.title}
            href={FORTUNA_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg bg-card p-4 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)] transition-colors hover:ring-green-500"
          >
            <span className={cn("grid size-10 shrink-0 place-items-center rounded-[11px]", t.tone)}><t.icon className="size-[19px]" /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-sm font-bold text-text-primary">{t.title} <ExternalLinkIcon className="size-3 text-text-tertiary" /></div>
              <div className="mt-0.5 text-xs leading-relaxed text-text-secondary">{t.sub}</div>
            </div>
          </a>
        ))}
      </div>
    </Panel>
  );
}

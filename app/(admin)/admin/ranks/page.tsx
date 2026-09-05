import {
  ArrowDownToLineIcon,
  LayersIcon,
} from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { can } from "@/lib/admin-permissions";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { RankConfigEditor } from "@/components/ranks/rank-config-editor";
import { listRanks } from "@/lib/queries/ranks";
import { getCompSettings } from "@/lib/queries/comp-settings";
import { AllocationEditor } from "@/components/ranks/allocation-editor";
import { LevelRateEditor } from "@/components/ranks/level-rate-editor";
import { BalanceGateEditor } from "@/components/ranks/balance-gate-editor";

export const dynamic = "force-dynamic";

// 수당체계·직급 — 실제 설정 화면. 매출 배분 비율·레벨 요율은 comp_settings, 직급 요율·기준은 ranks. 저장 즉시 엔진 반영.

export default async function AdminRanksPage() {
  const admin = await requireAdminPage("ranks");
  const readOnly = !can(admin.role, "catalog.write");
  const [ranks, settings] = await Promise.all([listRanks(), getCompSettings()]);

  return (
    <>
      <Topbar title="수당체계·직급" sub="직급 9단계 · 직급요율 5~53% · 자격 기준 · 수당 3종" uid={admin.display_name} />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-7">
        {/* ── 매출 배분 구조 (편집) ── */}
        <Panel
          title="매출 배분 구조"
          sub="매출 입금 시 먼저 4개로 1차 배분 → 수당 풀은 다시 레벨·직급·공유 수당으로 지급 · 비율은 여기서 변경"
          action={<Pill tone="green" dot>합계 100%</Pill>}
        >
          <div className="flex items-center justify-between gap-4 rounded-lg bg-green-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-green-500 text-white"><ArrowDownToLineIcon className="size-[18px]" /></span>
              <div>
                <div className="text-[13px] font-bold text-green-700">매출 입금</div>
                <div className="text-[11px] text-green-700/70">구독료·연회비·상품대금 등 회사 지갑 유입 (USDT)</div>
              </div>
            </div>
            <span className="text-2xl font-bold tabular-nums text-green-700">100%</span>
          </div>
          <AllocationEditor initial={settings} readOnly={readOnly} />
        </Panel>

        {/* ── 레벨 수당 (편집) ── */}
        <Panel
          title={<span className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-md bg-green-50 text-green-700"><LayersIcon className="size-4" /></span>레벨 수당 (직접추천)</span>}
          sub="추천 세대별 요율 · 레벨 1·2대 지급, 3대 이상 차단 · 결제 즉시 실시간 지급 + 월 정산 재산정에 같은 요율 사용"
        >
          <LevelRateEditor initial={settings} readOnly={readOnly} />
        </Panel>

        {/* ── 직급 자격 기준 · 공유수당 (실DB 편집) ── */}
        <Panel
          title="직급 자격 기준 · 공유수당 (관리자 설정)"
          sub={`직급=순수 카운트(게이트 무관) · ${settings.balance_gate_pct}% 게이트는 공유수당에만 · 저장 즉시 정산 기준 반영`}
          action={<Pill tone="crypto">단일 소스</Pill>}
        >
          <BalanceGateEditor initial={settings.balance_gate_pct} readOnly={readOnly} />
          <RankConfigEditor initial={ranks} readOnly={readOnly} />
        </Panel>
      </div>
    </>
  );
}

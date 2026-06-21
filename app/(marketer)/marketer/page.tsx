import { StatCard } from "@/components/cards/StatCard";
import { RankPanel } from "@/components/ranks/RankPanel";
import { getMajorMinor } from "@/lib/queries/legs";
import { getMember } from "@/lib/queries/members";
import { getMemberRank } from "@/lib/queries/ranks";
import { toUid } from "@/lib/uid";
import { ROOT_MARKETER_ID } from "@/lib/constants";

export default async function MarketerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const id = as ?? ROOT_MARKETER_ID;
  const [mm, me, rank] = await Promise.all([getMajorMinor(id), getMember(id), getMemberRank(id)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{me ? toUid(me.id) : "마케터"} 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          카운팅 기준: 이번 달 구독료를 유지 중인 <b>활성 구독자</b>만 집계됩니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="대실적 (최대 라인)" value={mm.major_leg} accent="major" hint="가장 큰 후원 라인 1개" />
        <StatCard
          title="기타소실적 (나머지 합산)"
          value={mm.other_minor}
          accent="minor"
          hint={`나머지 ${Math.max(mm.leg_count - 1, 0)}개 라인 전부 합산`}
        />
        <StatCard title="총 활성 산하" value={mm.total_active} hint={`후원 라인 ${mm.leg_count}개`} />
        <StatCard
          title="직급"
          value={rank && rank.rank > 0 ? `${rank.rank}직급` : "무직급"}
          hint={rank && rank.rank > 0 ? `직급요율 ${Number(rank.rate_pct)}%` : "조건 미달"}
          accent="major"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {rank ? <RankPanel info={rank} /> : null}
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="mb-2">
            <b>대실적 vs 기타소실적</b>: 바이너리(2줄)와 달리, 가장 큰 라인 1개를 대실적으로 두고 나머지 모든
            라인을 합쳐 기타소실적으로 인정합니다. 라인 수에는 제한이 없습니다.
          </p>
          <p>
            <b>직급 기준</b>: 후원계보 포함 전체 활성 구독유저수(순수 카운트). 1~3직급은 직접추천 수로도
            인정됩니다. <b>30% 균형</b>은 직급 자격이 아니라 <b>공유수당</b> 조건 — 5직급 이상은 기타소실적이
            전체의 30% 이상일 때만 공유수당을 받습니다(직급·직급수당은 카운트대로 유지).
          </p>
        </div>
      </div>
    </div>
  );
}

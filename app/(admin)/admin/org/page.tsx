import { PlacementTree } from "@/components/trees/PlacementTree";
import { RunExpiryButton } from "@/components/admin/RunExpiryButton";
import { getPlacementTree } from "@/lib/queries/trees";
import { getMajorMinor } from "@/lib/queries/legs";
import { ROOT_MARKETER_ID } from "@/lib/constants";

export default async function OrgPage() {
  const [root, mm] = await Promise.all([
    getPlacementTree(ROOT_MARKETER_ID),
    getMajorMinor(ROOT_MARKETER_ID),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">전체 조직도 (후원/Placement)</h1>
          <p className="text-sm text-muted-foreground">
            루트 마케터 기준 · 대실적 <span className="text-emerald-600">{mm.major_leg}</span> / 기타소실적{" "}
            <span className="text-sky-600">{mm.other_minor}</span> / 총활성 {mm.total_active}
          </p>
        </div>
        <RunExpiryButton />
      </div>
      <PlacementTree root={root} />
    </div>
  );
}

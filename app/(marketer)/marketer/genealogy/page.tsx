import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnilevelTree } from "@/components/trees/UnilevelTree";
import { PlacementTree } from "@/components/trees/PlacementTree";
import { getBothTrees } from "@/lib/queries/trees";
import { getMajorMinor } from "@/lib/queries/legs";
import { ROOT_MARKETER_ID } from "@/lib/constants";

export default async function GenealogyPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;
  const id = as ?? ROOT_MARKETER_ID;
  const [{ unilevel, placement }, mm] = await Promise.all([getBothTrees(id), getMajorMinor(id)]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">계보도</h1>
        <p className="text-sm text-muted-foreground">
          직접추천(누가 추천했나)과 후원(조직 어디에 배치됐나)은 별개의 트리입니다.
        </p>
      </div>

      <Tabs defaultValue="unilevel">
        <TabsList>
          <TabsTrigger value="unilevel">직접추천 (Unilevel)</TabsTrigger>
          <TabsTrigger value="placement">후원 (Placement)</TabsTrigger>
        </TabsList>

        <TabsContent value="unilevel" className="mt-4">
          <p className="mb-2 text-sm text-muted-foreground">
            내 레퍼럴 링크로 가입한 직접추천 라인. 가로 무제한으로 펼쳐집니다. (● 활성 / ○ 비활성)
          </p>
          <UnilevelTree root={unilevel} />
        </TabsContent>

        <TabsContent value="placement" className="mt-4">
          <div className="mb-2 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-muted-foreground">상위가 내려꽂은 스필오버 포함 조직도. (클릭 시 접기/펼치기)</span>
            <span className="text-emerald-600">대실적 {mm.major_leg}</span>
            <span className="text-sky-600">기타소실적 {mm.other_minor}</span>
          </div>
          <PlacementTree root={placement} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

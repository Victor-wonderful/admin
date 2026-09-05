import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { MemberTree } from "@/components/trees/member-tree";
import { OrgView } from "@/components/trees/org-view";
import { getBothTrees, getActiveRootId } from "@/lib/queries/trees";
import { getMajorMinor } from "@/lib/queries/legs";
import { ROOT_MARKETER_ID } from "@/lib/constants";
import type { TreeNode } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// 추천 계보 트리에서 총 산하 / 깊이 / 활성 / 직추 집계
function calcUnilevel(root: TreeNode | null) {
  if (!root) return { total: 0, depth: 0, active: 0, direct: 0 };
  let total = 0,
    active = 0,
    depth = 0;
  const walk = (nd: TreeNode, d: number) => {
    for (const c of nd.children) {
      total++;
      if (c.isActive) active++;
      depth = Math.max(depth, d);
      walk(c, d + 1);
    }
  };
  walk(root, 1);
  return { total, depth, active, direct: root.children.length };
}

export default async function AdminOrgPage() {
  const admin = await requireAdminPage("org");
  // 기준 회원 = 하위가 가장 많은 활성 마케터(비활성 루트 회피).
  const rootId = (await getActiveRootId()) ?? ROOT_MARKETER_ID;
  const [{ unilevel, placement }, mm] = await Promise.all([
    getBothTrees(rootId),
    getMajorMinor(rootId),
  ]);

  const uni = calcUnilevel(unilevel);
  const plc = calcUnilevel(placement);
  const balancePct = mm.total_active > 0 ? mm.other_minor / mm.total_active : 0;

  const rootName = unilevel?.name ?? placement?.name ?? "ROOT";
  const rootRole = unilevel?.role ?? placement?.role ?? "marketer";

  return (
    <>
      <Topbar title="조직도" sub="추천조직 · 후원배치" uid={admin.display_name} />
      <OrgView
        rootName={rootName}
        rootRole={rootRole}
        unilevelVals={uni}
        placementVals={{ total: plc.total, major: mm.major_leg, minor: mm.other_minor, balancePct }}
        unilevelTree={<MemberTree root={unilevel} maxDepth={2} maxChildren={5} />}
        placementTree={<MemberTree root={placement} maxDepth={7} maxChildren={3} spine highlightLabel="주력 라인" showSpillover />}
      />
    </>
  );
}

import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { MemberTree } from "@/components/trees/member-tree";
import { OrgView } from "@/components/trees/org-view";
import { RootPicker } from "@/components/trees/root-picker";
import { toUid } from "@/lib/uid";
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminOrgPage({ searchParams }: { searchParams: Promise<{ root?: string }> }) {
  const admin = await requireAdminPage("org");
  const { root } = await searchParams;
  // 기준 회원: ?root=<회원 id> 로 지정, 없으면 하위가 가장 많은 활성 파트너 자동(비활성 루트 회피).
  const autoRoot = (await getActiveRootId()) ?? ROOT_MARKETER_ID;
  const requested = root && UUID_RE.test(root) ? root : null;
  const first = await getBothTrees(requested ?? autoRoot);
  const valid = requested !== null && first.members.some((m) => m.id === requested);
  const rootId = valid ? requested! : autoRoot;
  const { unilevel, placement, members } = valid || requested === null ? first : await getBothTrees(autoRoot);
  const mm = await getMajorMinor(rootId);
  const options = members
    .filter((m) => m.role === "marketer")
    .map((m) => ({ id: m.id, uid: toUid(m.id), name: m.display_name, email: m.email, active: m.is_active_subscriber }))
    .sort((a, b) => a.uid.localeCompare(b.uid));

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
        rootPicker={<RootPicker options={options} currentId={rootId} isAuto={!valid} />}
        unilevelVals={uni}
        placementVals={{ total: plc.total, major: mm.major_leg, minor: mm.other_minor, balancePct }}
        unilevelTree={<MemberTree root={unilevel} maxDepth={2} maxChildren={5} />}
        placementTree={<MemberTree root={placement} maxDepth={7} maxChildren={3} spine highlightLabel="주력 라인" showSpillover />}
        unilevelRoot={unilevel}
        placementRoot={placement}
      />
    </>
  );
}

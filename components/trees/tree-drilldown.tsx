"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRightIcon, UserRoundIcon, HomeIcon, CornerUpLeftIcon, ExternalLinkIcon } from "lucide-react";

import type { TreeNode, MemberRole } from "@/lib/supabase/types";
import { PlaceHereButton } from "@/components/marketer/placement-context";
import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<MemberRole, string> = {
  marketer: "파트너",
  subscriber: "구독회원",
  registered: "등록회원",
};
const ROLE_TONE: Record<MemberRole, "crypto" | "green" | "neutral"> = {
  marketer: "crypto",
  subscriber: "green",
  registered: "neutral",
};

// 산하 전체 인원(자신 제외)
function countBelow(n: TreeNode): number {
  return n.children.reduce((s, c) => s + 1 + countBelow(c), 0);
}

// 후원배치 정렬: 1번 자리(고정 주력) → 활성 → 활성 하위 많은 순. MemberTree 의 spine 정렬과 같다.
function sortForPlacement(kids: TreeNode[]): TreeNode[] {
  if (kids.length <= 1) return kids;
  return [...kids].sort(
    (a, b) =>
      ((a.meta?.slot === 1 ? 0 : 1) - (b.meta?.slot === 1 ? 0 : 1)) ||
      (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0) ||
      (b.meta?.activeCount ?? 0) - (a.meta?.activeCount ?? 0),
  );
}

function Avatar({ active }: { active: boolean }) {
  return (
    <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-green-50 text-crypto">
      <UserRoundIcon className="size-4" />
      <span className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card", active ? "bg-green-500" : "bg-n-400")} />
    </span>
  );
}

/**
 * 모바일 전용 조직 탐색 — 트리 도식 대신 "현재 회원 + 직속 하위 목록"을 보여주고
 * 하위를 눌러 한 단계씩 내려간다(경로는 상단 breadcrumb).
 * ZoomPanCanvas 트리는 휠 확대·마우스 드래그 전용이라 터치에서 조작이 안 되므로 lg 미만에서 이것을 쓴다.
 */
export function TreeDrilldown({
  root,
  spine = false,
  placeable = false,
  emptyLabel = "하위 회원이 없습니다.",
  detailHref,
}: {
  root: TreeNode | null;
  /** 후원배치 트리: 1번 라인(주력) 강조 + 자동 배치 표시 */
  spine?: boolean;
  placeable?: boolean;
  emptyLabel?: string;
  /** 있으면 각 회원 카드에 상세 링크를 붙인다(관리자 조직도용). */
  detailHref?: (n: TreeNode) => string;
}) {
  // 경로: [루트, ...내려온 노드]. 항상 마지막이 현재 노드.
  const [path, setPath] = React.useState<TreeNode[]>(root ? [root] : []);

  // 트리 데이터가 바뀌면(탭 전환 등) 경로를 루트로 되돌린다 — 렌더 중 보정(effect 불필요).
  const rootId = root?.id ?? null;
  const [seenRoot, setSeenRoot] = React.useState(rootId);
  if (seenRoot !== rootId) {
    setSeenRoot(rootId);
    setPath(root ? [root] : []);
  }

  if (!root || path.length === 0) {
    return <div className="py-10 text-center text-sm text-text-tertiary">조직 데이터가 없습니다.</div>;
  }

  const current = path[path.length - 1];
  const kids = spine ? sortForPlacement(current.children) : current.children;
  const below = countBelow(current);

  return (
    <div className="space-y-3">
      {/* 경로 */}
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
        {path.map((p, i) => (
          <React.Fragment key={p.id}>
            {i > 0 ? <ChevronRightIcon className="size-3 shrink-0 text-text-tertiary" /> : null}
            <button
              type="button"
              onClick={() => setPath(path.slice(0, i + 1))}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[12px] whitespace-nowrap transition-colors",
                i === path.length - 1
                  ? "bg-green-50 font-bold text-green-700"
                  : "font-medium text-text-secondary hover:bg-surface-muted",
              )}
            >
              {i === 0 ? <HomeIcon className="size-3" /> : null}
              {p.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* 현재 회원 */}
      <div className="flex items-center gap-3 rounded-[12px] bg-surface-muted p-3 ring-1 ring-border">
        <Avatar active={current.isActive} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-bold text-text-primary">{current.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={ROLE_TONE[current.role]}>{ROLE_LABEL[current.role]}</Pill>
            {!current.isActive ? <Pill tone="neutral">비활성</Pill> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[11px] text-text-tertiary">직속 {kids.length} · 산하</div>
          <div className="text-[17px] font-bold tabular-nums text-text-primary">{below.toLocaleString()}명</div>
          {detailHref ? (
            <Link href={detailHref(current)} className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-green-700 hover:underline">
              상세 <ExternalLinkIcon className="size-2.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {path.length > 1 ? (
        <button
          type="button"
          onClick={() => setPath(path.slice(0, -1))}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-semibold text-text-secondary transition-colors hover:bg-surface-muted"
        >
          <CornerUpLeftIcon className="size-3.5" /> 위로
        </button>
      ) : null}

      {/* 직속 하위 목록 */}
      {kids.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-tertiary">{emptyLabel}</div>
      ) : (
        <ul className="space-y-2">
          {kids.map((c, i) => {
            const cBelow = countBelow(c);
            // 추천인 ≠ 후원부모 → 자동(후원) 배치된 회원
            const auto = spine && !!c.meta?.recommenderId && c.meta.recommenderId !== c.meta.parentId;
            const major = spine && i === 0;
            return (
              <li key={c.id}>
                <div
                  className={cn(
                    "rounded-[12px] bg-card ring-1 transition-colors",
                    major ? "ring-2 ring-green-600" : auto ? "ring-warning/60" : "ring-border",
                    !c.isActive && "opacity-70",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => (cBelow > 0 ? setPath([...path, c]) : undefined)}
                    disabled={cBelow === 0}
                    className="flex w-full items-center gap-3 p-3 text-left disabled:cursor-default"
                  >
                    <Avatar active={c.isActive} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13.5px] font-semibold text-text-primary">{c.name}</span>
                        {major ? <span className="shrink-0 rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">1번 라인</span> : null}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-text-tertiary">
                        <span>{ROLE_LABEL[c.role]}</span>
                        {auto ? <span className="font-semibold text-warning">· 자동 배치</span> : null}
                        {!c.isActive ? <span className="font-semibold text-negative">· 비활성</span> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {cBelow > 0 ? (
                        <>
                          <span className="text-[12px] font-semibold tabular-nums text-text-secondary">하위 {cBelow.toLocaleString()}</span>
                          <ChevronRightIcon className="size-4 text-text-tertiary" />
                        </>
                      ) : (
                        <span className="text-[11px] text-text-tertiary">하위 없음</span>
                      )}
                    </div>
                  </button>
                  {placeable || detailHref ? (
                    <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
                      {placeable ? <PlaceHereButton nodeId={c.id} nodeUid={c.name} /> : <span />}
                      {detailHref ? (
                        <Link href={detailHref(c)} className="inline-flex items-center gap-1 text-[12px] font-semibold text-green-700 hover:underline">
                          상세 보기 <ChevronRightIcon className="size-3" />
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

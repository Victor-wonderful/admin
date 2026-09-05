"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { XIcon, Loader2Icon, CheckCircle2Icon, TriangleAlertIcon, LockIcon, PlusIcon } from "lucide-react";

import { placeMemberByPartner } from "@/lib/actions/placement";
import type { PendingPlacement, PlacementTarget } from "@/lib/queries/placement";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

const ROLE_LABEL = { registered: "등록회원", subscriber: "구독회원", marketer: "파트너" } as const;

type Ctx = {
  pending: PendingPlacement[];
  // 배치 창 열기. member 를 지정하지 않으면 첫 대기 회원. parentId 를 지정하면(트리에서 열 때) 그 회원 아래로 미리 선택.
  open: (opts?: { memberId?: string; parentId?: string }) => void;
};
const PlacementCtx = React.createContext<Ctx | null>(null);
export const usePlacement = () => React.useContext(PlacementCtx);

// 후원배치 공용 창 — 대기 목록의 "배치" 버튼과 후원배치도 카드의 "＋배치" 버튼이 같은 창을 연다.
export function PlacementProvider({
  ownerUid,
  pending,
  targets,
  recommended,
  children,
}: {
  ownerUid: string;
  pending: PendingPlacement[];
  targets: PlacementTarget[];
  recommended: { id: string; uid: string } | null; // 1번 라인 최하단
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [openState, setOpenState] = React.useState(false);
  const [memberId, setMemberId] = React.useState<string>("");
  const [mode, setMode] = React.useState<"recommended" | "custom">("recommended");
  const [parentId, setParentId] = React.useState<string>("");
  const [confirming, setConfirming] = React.useState(false);
  const [pendingTx, start] = React.useTransition();
  const [err, setErr] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  const close = React.useCallback(() => {
    setOpenState(false);
    setConfirming(false);
    setErr(null);
    setDone(null);
  }, []);
  useEscapeKey(openState, close);

  const open = React.useCallback(
    (opts?: { memberId?: string; parentId?: string }) => {
      if (pending.length === 0) return;
      setMemberId(opts?.memberId ?? pending[0].id);
      if (opts?.parentId) {
        setParentId(opts.parentId);
        setMode("custom");
      } else {
        setParentId(recommended?.id ?? targets[0]?.id ?? "");
        setMode("recommended");
      }
      setConfirming(false);
      setErr(null);
      setDone(null);
      setOpenState(true);
    },
    [pending, recommended, targets],
  );

  const sel = pending.find((p) => p.id === memberId) ?? null;
  const finalParent = mode === "recommended" ? (recommended?.id ?? targets[0]?.id ?? "") : parentId;
  const finalTarget = targets.find((t) => t.id === finalParent);

  const submit = () =>
    start(async () => {
      if (!sel) return;
      setErr(null);
      const res = await placeMemberByPartner(sel.id, finalParent);
      if (!res.ok) {
        setErr(res.error);
        setConfirming(false);
        return;
      }
      setDone(`${sel.uid} → ${finalTarget?.uid ?? ""} 아래 ${res.slot}번 자리에 배치·확정되었습니다`);
      router.refresh();
    });

  return (
    <PlacementCtx.Provider value={{ pending, open }}>
      {children}

      {openState && sel ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={close} />
          <div className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">후원배치</h2>
                <p className="mt-0.5 text-xs text-text-secondary">{ownerUid}의 후원 조직 안에 자리를 정합니다 · 한 번 확정하면 바꿀 수 없습니다</p>
              </div>
              <button type="button" onClick={close} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted"><XIcon className="size-4" /></button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                <CheckCircle2Icon className="size-12 text-green-600" />
                <div className="text-[15px] font-bold text-text-primary">배치 확정</div>
                <p className="text-xs text-text-secondary">{done}</p>
                <button type="button" onClick={close} className="mt-2 rounded-md bg-brand px-5 py-2 text-[13px] font-semibold text-white">확인</button>
              </div>
            ) : (
              <>
                <div className="space-y-4 px-6 py-5">
                  {/* 배치할 회원 — 대기가 여럿이면 고른다 */}
                  <div className="flex items-center gap-3 rounded-lg bg-surface-muted px-3.5 py-2.5 ring-1 ring-border">
                    <span className="text-xs font-medium text-text-secondary">배치할 회원</span>
                    {pending.length > 1 ? (
                      <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="flex-1 rounded-md bg-card px-2.5 py-1.5 text-[13px] font-semibold text-text-primary ring-1 ring-border-strong outline-none focus:ring-2 focus:ring-green-500">
                        {pending.map((p) => (
                          <option key={p.id} value={p.id}>{p.uid} · {ROLE_LABEL[p.role]}{p.days_left != null ? ` · D-${p.days_left}` : ""}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[13px] font-bold text-text-primary">{sel.uid} · {ROLE_LABEL[sel.role]}</span>
                    )}
                  </div>

                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg p-3.5 ring-1 transition-colors", mode === "recommended" ? "bg-green-50 ring-green-500" : "ring-border")}>
                    <input type="radio" name="mode" className="mt-1" checked={mode === "recommended"} onChange={() => setMode("recommended")} />
                    <div>
                      <div className="text-[13px] font-bold text-text-primary">권장 · {recommended ? `1번 라인 최하단 (${recommended.uid} 아래)` : "내 바로 아래 다음 자리"}</div>
                      <div className="mt-0.5 text-[11px] leading-relaxed text-text-secondary">
                        {recommended
                          ? "직추를 1번 라인 하부로 계속 몰아주면 그 라인이 깊게 쌓여 내 대실적이 됩니다. 위쪽 전원의 실적으로도 함께 잡힙니다."
                          : "아직 1번 라인(첫 파트너)이 없습니다. 첫 파트너가 나오면 그 자리에 시스템이 고정합니다."}
                      </div>
                    </div>
                  </label>
                  <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg p-3.5 ring-1 transition-colors", mode === "custom" ? "bg-green-50 ring-green-500" : "ring-border")}>
                    <input type="radio" name="mode" className="mt-1" checked={mode === "custom"} onChange={() => setMode("custom")} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-text-primary">직접 선택 · 내 후원 조직의 특정 회원 아래</div>
                      <select
                        value={parentId}
                        onChange={(e) => { setParentId(e.target.value); setMode("custom"); }}
                        className="mt-2 w-full rounded-md bg-card px-3 py-2 text-[13px] text-text-primary ring-1 ring-border-strong outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {targets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {"　".repeat(Math.min(t.depth, 6))}{t.depth === 0 ? `${t.uid} (나)` : `${t.uid} · ${ROLE_LABEL[t.role]} · ${t.slot ?? "-"}번${t.on_first_line ? " · 1번 라인" : ""}`}
                          </option>
                        ))}
                      </select>
                      <div className="mt-1 text-[11px] text-text-tertiary">들여쓰기 = 깊이 · 후원배치도에서 회원 카드의 ‘＋배치’를 눌러도 여기에 선택됩니다 · 그 회원 아래 다음 빈 자리(2번 이상)</div>
                    </div>
                  </label>

                  <div className="flex gap-2 rounded-lg bg-warning-soft px-3.5 py-3 text-[11px] leading-relaxed text-text-secondary">
                    <LockIcon className="mt-0.5 size-4 shrink-0 text-warning" />
                    <span><b className="text-text-primary">후원배치는 한 번만 할 수 있습니다.</b> 확정 후에는 본인이 변경할 수 없습니다. 1번 자리는 파트너 전용이라 직접 고를 수 없습니다.</span>
                  </div>
                  {err ? <div className="flex items-center gap-2 rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative"><TriangleAlertIcon className="size-3.5" /> {err}</div> : null}
                </div>

                <div className="flex items-center justify-between gap-2 border-t px-6 py-4">
                  <span className="text-[12px] text-text-secondary">{sel.uid} → <b className="text-text-primary">{finalTarget?.uid ?? "—"}</b> 아래</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={close} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">취소</button>
                    {confirming ? (
                      <button type="button" disabled={pendingTx || !finalParent} onClick={submit} className="inline-flex items-center gap-1.5 rounded-md bg-negative px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">
                        {pendingTx ? <Loader2Icon className="size-3.5 animate-spin" /> : <LockIcon className="size-3.5" />} 확정 (되돌릴 수 없음)
                      </button>
                    ) : (
                      <button type="button" disabled={!finalParent} onClick={() => setConfirming(true)} className="rounded-md bg-brand px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">
                        이 자리로 배치
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </PlacementCtx.Provider>
  );
}

// 후원배치도 회원 카드용 "＋배치" — 배치 대기가 있을 때만 보인다. 누르면 이 회원 아래로 미리 선택된 창이 열린다.
export function PlaceHereButton({ nodeId }: { nodeId: string }) {
  const ctx = usePlacement();
  if (!ctx || ctx.pending.length === 0) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        ctx.open({ parentId: nodeId });
      }}
      title="이 회원 아래에 배치"
      className="absolute -right-2 -bottom-2.5 inline-flex items-center gap-0.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white shadow-sm ring-2 ring-card hover:bg-green-700"
    >
      <PlusIcon className="size-3" /> 배치
    </button>
  );
}

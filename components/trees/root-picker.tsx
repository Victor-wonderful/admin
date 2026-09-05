"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, SearchIcon, RotateCcwIcon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// 조직도 기준 회원 선택 — 파트너 목록에서 UID·닉네임·이메일로 검색해 ?root= 로 전환.
// 기본(파라미터 없음)은 하위가 가장 많은 활성 파트너 자동 선택.

export interface RootOption { id: string; uid: string; name: string; email: string | null; active: boolean }

export function RootPicker({ options, currentId, isAuto }: { options: RootOption[]; currentId: string; isAuto: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.id === currentId);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const list = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    const arr = s ? options.filter((o) => `${o.uid} ${o.name} ${o.email ?? ""}`.toLowerCase().includes(s)) : options;
    return arr.slice(0, 40);
  }, [options, q]);

  const pick = (id: string) => { setOpen(false); setQ(""); router.push(`/admin/org?root=${id}`); };
  const initials = (uid: string) => (uid.includes("·") ? uid.split("·")[1] : uid).replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={cn("flex items-center gap-2.5 rounded-[10px] bg-card py-1.5 pr-2 pl-3 ring-1 transition-colors hover:bg-surface-muted", open ? "ring-green-500" : "ring-border")}>
        <span className="text-xs text-text-secondary">기준 회원</span>
        <span className="inline-flex items-center gap-2 rounded-lg bg-crypto-soft px-2.5 py-1">
          <span className="grid size-[22px] place-items-center rounded-md bg-crypto text-[11px] font-bold text-white">{current ? initials(current.uid) : "?"}</span>
          <span className="text-xs font-semibold text-crypto">{current ? `${current.uid} · ${current.name}` : "선택"}</span>
        </span>
        {isAuto ? <span className="text-[10px] font-medium text-text-tertiary">자동</span> : null}
        <ChevronDownIcon className={cn("size-4 text-text-tertiary transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute left-0 z-40 mt-2 w-[360px] overflow-hidden rounded-xl bg-card shadow-[0_12px_32px_-8px_rgba(16,24,40,0.25)] ring-1 ring-border">
          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <SearchIcon className="size-3.5 text-text-tertiary" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="파트너 UID · 닉네임 · 이메일" className="w-full bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-tertiary" />
          </div>
          <div className="max-h-[320px] overflow-auto py-1">
            {list.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-text-tertiary">일치하는 파트너가 없습니다</div>
            ) : list.map((o) => (
              <button key={o.id} type="button" onClick={() => pick(o.id)} className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface-muted", o.id === currentId && "bg-green-50/60")}>
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-crypto-soft text-[10px] font-bold text-crypto">{initials(o.uid)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary">{o.uid} <span className="font-medium text-text-secondary">· {o.name}</span>{o.active ? <span className="size-1.5 rounded-full bg-green-500" title="활성 구독" /> : null}</span>
                  <span className="block truncate text-[11px] text-text-tertiary">{o.email ?? "이메일 미등록"}</span>
                </span>
                {o.id === currentId ? <CheckIcon className="size-4 text-green-600" /> : null}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t px-3 py-2 text-[11px] text-text-tertiary">
            <span>파트너 {options.length.toLocaleString()}명</span>
            {!isAuto ? (
              <button type="button" onClick={() => { setOpen(false); router.push("/admin/org"); }} className="inline-flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary"><RotateCcwIcon className="size-3" /> 자동 선택으로</button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

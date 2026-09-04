"use client";

import * as React from "react";
import { BellIcon, Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

type Item = { id: string; tone: "info" | "warning" | "negative" | "green"; title: string; sub: string };

const DOT: Record<Item["tone"], string> = { info: "bg-info", warning: "bg-warning", negative: "bg-negative", green: "bg-green-500" };

// 상단 알림 종 — 열면 /api/me/notifications 에서 세션 회원의 실제 알림(구독 상태·최근 지갑 내역)을 가져온다.
export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/me/notifications", { cache: "no-store" });
      const json = (await res.json()) as { items: Item[] };
      setItems(json.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!open) return;
    void load();
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, load]);

  const urgent = items?.some((i) => i.tone === "negative" || i.tone === "warning") ?? false;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="알림"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative grid size-[38px] place-items-center rounded-[10px] bg-card text-text-secondary ring-1 ring-border transition-colors hover:bg-n-50",
          open && "bg-n-50",
        )}
      >
        <BellIcon className="size-[17px]" />
        {urgent ? <span className="absolute top-2 right-2 size-2 rounded-full bg-negative ring-2 ring-card" /> : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-xl bg-card shadow-[0_12px_32px_-8px_rgba(16,24,40,0.25)] ring-1 ring-border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-bold text-text-primary">알림</span>
            <span className="text-[11px] text-text-tertiary">구독 상태 · 최근 지갑 내역</span>
          </div>
          <div className="max-h-[360px] overflow-auto">
            {loading && items === null ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-tertiary"><Loader2Icon className="size-4 animate-spin" /> 불러오는 중</div>
            ) : !items || items.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-tertiary">새 알림이 없습니다.</div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[it.tone])} />
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-text-primary">{it.title}</div>
                    <div className="text-xs text-text-secondary">{it.sub}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

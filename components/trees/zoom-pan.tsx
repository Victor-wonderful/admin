"use client";

import * as React from "react";
import { PlusIcon, MinusIcon, MaximizeIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const MIN = 0.4;
const MAX = 2.5;
const clamp = (s: number) => Math.min(MAX, Math.max(MIN, s));

// 트리/다이어그램을 마우스 휠로 확대·축소하고 드래그로 이동하는 캔버스.
export function ZoomPanCanvas({ children, className }: { children: React.ReactNode; className?: string }) {
  const [scale, setScale] = React.useState(1);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  // 휠 줌(페이지 스크롤 막기 위해 non-passive 네이티브 리스너).
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = 1 - e.deltaY * 0.0015;
      setScale((s) => clamp(s * factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, tx, ty };
    setDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag.current) return;
    setTx(drag.current.tx + (e.clientX - drag.current.x));
    setTy(drag.current.ty + (e.clientY - drag.current.y));
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const btn = "grid size-7 place-items-center rounded-md text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary";

  return (
    <div
      ref={ref}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      className={cn(
        "relative h-[540px] overflow-hidden rounded-xl bg-card ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)] select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        className,
      )}
    >
      {/* 줌 % */}
      <div className="pointer-events-none absolute top-3 left-3 z-10 rounded-md bg-surface-muted px-2 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border">
        {Math.round(scale * 100)}%
      </div>

      {/* 컨트롤 */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="absolute top-3 right-3 z-10 flex flex-col gap-0.5 rounded-lg bg-card p-1 ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]"
      >
        <button type="button" aria-label="확대" onClick={() => setScale((s) => clamp(s + 0.2))} className={btn}>
          <PlusIcon className="size-4" />
        </button>
        <button type="button" aria-label="축소" onClick={() => setScale((s) => clamp(s - 0.2))} className={btn}>
          <MinusIcon className="size-4" />
        </button>
        <div className="my-0.5 h-px bg-border" />
        <button type="button" aria-label="원래대로" onClick={reset} className={btn}>
          <MaximizeIcon className="size-4" />
        </button>
      </div>

      {/* 안내 */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 text-[11px] text-text-tertiary">
        휠: 확대/축소 · 드래그: 이동
      </div>

      {/* 변환 레이어 */}
      <div
        className="flex h-full w-full items-start justify-center pt-10"
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center top",
          transition: dragging ? "none" : "transform 0.08s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

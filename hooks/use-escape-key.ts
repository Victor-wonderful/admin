"use client";

import * as React from "react";

// 모달 공용 — 열려 있을 때 Escape 키로 닫는다.
export function useEscapeKey(active: boolean, onEscape: () => void) {
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, onEscape]);
}

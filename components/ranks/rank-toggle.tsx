"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function RankToggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      aria-pressed={on}
      className={cn("flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors", on ? "bg-brand" : "bg-n-300")}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
    </button>
  );
}

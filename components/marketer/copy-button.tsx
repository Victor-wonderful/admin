"use client";

import * as React from "react";
import { CopyIcon, CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// 짧은 텍스트(초대 코드 등) 클립보드 복사 버튼. 복사 후 1.5초 "복사됨" 표시.
export function CopyButton({ text, label = "복사", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드 미지원 무시 */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!text || text === "—"}
      className={cn("inline-flex items-center gap-1 rounded-[7px] bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50", className)}
    >
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />} {copied ? "복사됨" : label}
    </button>
  );
}

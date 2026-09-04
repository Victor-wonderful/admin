"use client";

import * as React from "react";
import { CopyIcon, CheckIcon, Share2Icon, HashIcon } from "lucide-react";

// 초대 링크 — 현재 사이트 주소 + /signup?ref=코드. 복사/공유(모바일 공유 시트, 미지원 시 복사).
export function InviteLinkActions({ code }: { code: string }) {
  const [origin, setOrigin] = React.useState("");
  const [copied, setCopied] = React.useState<"link" | "share" | null>(null);
  React.useEffect(() => setOrigin(window.location.origin), []);

  const link = origin ? `${origin}/signup?ref=${encodeURIComponent(code)}` : `/signup?ref=${code}`;
  const display = link.replace(/^https?:\/\//, "");

  const copy = async (which: "link" | "share") => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      window.prompt("아래 링크를 복사하세요", link);
    }
  };

  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "포르투나 초대", text: `포르투나 초대 코드 ${code}`, url: link });
        return;
      } catch {
        /* 취소 시 무시 */
      }
    }
    await copy("share");
  };

  return (
    <>
      <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/70">
        <HashIcon className="size-3 shrink-0" /> <span className="truncate">{display}</span>
      </div>
      <div className="flex gap-2.5">
        <button type="button" onClick={() => copy("link")} className="inline-flex items-center gap-2 rounded-[10px] bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/20 hover:bg-white/15">
          {copied === "link" ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />} {copied === "link" ? "복사됨" : "링크 복사"}
        </button>
        <button type="button" onClick={share} className="inline-flex items-center gap-2 rounded-[10px] bg-crypto px-5 py-3 text-sm font-bold text-white hover:opacity-90">
          {copied === "share" ? <CheckIcon className="size-4" /> : <Share2Icon className="size-4" />} {copied === "share" ? "링크 복사됨" : "공유"}
        </button>
      </div>
    </>
  );
}

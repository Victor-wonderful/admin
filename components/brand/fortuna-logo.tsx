import { cn } from "@/lib/utils";

// 포르투나(Fortuna) 브랜드 로고 — 3단 적층 바 마크 + 워드마크.
// 색은 currentColor 를 따르므로 다크 패널(흰색)·라이트 패널(진한색) 어디서나 쓴다.
export function FortunaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9", className)} fill="currentColor">
      <g transform="skewX(-14)">
        <rect x="11" y="6" width="26" height="7" rx="1.5" />
        <rect x="9" y="16.5" width="28" height="7" rx="1.5" />
        <rect x="7" y="27" width="30" height="7" rx="1.5" />
      </g>
    </svg>
  );
}

export function FortunaLogo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <FortunaMark className={markClassName} />
      <div className="leading-none">
        <div className="text-lg font-bold tracking-tight">포르투나</div>
        <div className="mt-1 text-[9px] font-medium tracking-[0.32em] uppercase opacity-60">Fortuna</div>
      </div>
    </div>
  );
}

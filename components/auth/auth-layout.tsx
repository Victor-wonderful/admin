import { ShieldCheckIcon, CpuIcon, TrendingUpIcon } from "lucide-react";

import { FortunaLogo } from "@/components/brand/fortuna-logo";

const POINTS = [
  { icon: CpuIcon, t: "AI 매매 판단 체크", s: "진입 전 시나리오·자금 규율 검증" },
  { icon: ShieldCheckIcon, t: "USDT 온체인 정산", s: "투명한 수당·출금" },
  { icon: TrendingUpIcon, t: "3단계 보상", s: "직접추천 · 직급 · 공유수당" },
];

// 로그인·회원가입 공통 분할 레이아웃 — 좌: 다크 브랜드 패널 / 우: 폼.
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
      <div className="hidden flex-col justify-between bg-feature p-14 text-white lg:flex">
        <FortunaLogo />
        <div className="space-y-6">
          <h2 className="max-w-md text-[34px] leading-tight font-bold">
            구독으로 시작해<br />마케터로 성장하세요
          </h2>
          <div className="space-y-4">
            {POINTS.map((p) => (
              <div key={p.t} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/10">
                  <p.icon className="size-5" />
                </span>
                <div>
                  <div className="text-sm font-bold">{p.t}</div>
                  <div className="text-xs text-white/70">{p.s}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="text-xs text-white/50">© 포르투나 · 구독 보상 플랫폼</span>
      </div>

      <div className="grid place-items-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-6 lg:hidden">
            <FortunaLogo className="text-text-primary" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

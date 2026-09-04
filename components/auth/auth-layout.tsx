import { BrainCircuitIcon, ClipboardCheckIcon, ShieldCheckIcon } from "lucide-react";

import { FortunaLogo } from "@/components/brand/fortuna-logo";

// Fortuna 앱 로그인 화면과 같은 소개 문구 — 제품이 무엇을 하는지(진입 전 AI 검증)로 통일.
const POINTS = [
  { icon: BrainCircuitIcon, t: "실시간 12+ 데이터로 AI 시나리오 자동 생성" },
  { icon: ClipboardCheckIcon, t: "거래 가능·차단 판정 + 추격·미확정 캔들·과노출 자동 감지" },
  { icon: ShieldCheckIcon, t: "진입 시 평가 영구 저장 + AI 한국어 복기 코멘트" },
];

// 로그인·회원가입 공통 분할 레이아웃 — 좌: 다크 브랜드 패널 / 우: 폼.
export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
      <div className="hidden flex-col justify-between bg-feature p-14 text-white lg:flex">
        <FortunaLogo />
        <div className="space-y-7">
          <div className="space-y-4">
            <h2 className="max-w-xl text-[38px] leading-[1.2] font-bold tracking-tight">
              매매 전 의사결정을
              <br />
              <span className="text-lime">AI가 검증</span>합니다
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-white/70">
              한 번의 흥분한 거래가 한 달 수익을 지웁니다. 포르투나가 진입 전 5분에 점검합니다.
            </p>
          </div>
          <div className="space-y-3">
            {POINTS.map((p) => (
              <div key={p.t} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-white/10 ring-1 ring-white/10">
                  <p.icon className="size-5 text-lime" />
                </span>
                <div className="text-sm text-white/85">{p.t}</div>
              </div>
            ))}
          </div>
        </div>
        <span className="text-xs text-white/50">© 포르투나 · 본 서비스는 투자 자문이 아닙니다</span>
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

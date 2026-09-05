import { ShieldCheckIcon } from "lucide-react";

import { FortunaMark } from "@/components/brand/fortuna-logo";

// 관리자 인증 화면 공통 — 어두운 배경 + 중앙 흰 카드(회원 인증의 분할 레이아웃과 구분).
export function AdminAuthShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-feature p-6">
      <div className="w-full max-w-[428px] rounded-2xl bg-card p-8 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-feature text-white"><FortunaMark className="size-5" /></span>
          <div>
            <div className="text-[15px] font-bold text-text-primary">포르투나 운영 콘솔</div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-crypto"><ShieldCheckIcon className="size-3" /> 관리자 전용</div>
          </div>
        </div>
        <div className="mt-6">
          <h1 className="text-[22px] font-bold text-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{sub}</p>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

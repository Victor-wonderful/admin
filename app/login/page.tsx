import { ShieldCheckIcon, CpuIcon, TrendingUpIcon } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentMember, roleHome } from "@/lib/session";
import { ROOT_MARKETER_ID, DEMO_REGISTERED_ID, DEMO_SUBSCRIBER_ID } from "@/lib/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const POINTS = [
  { icon: CpuIcon, t: "AI 자동매매 엔진", s: "Alpha Engine 24/7 무인 운용" },
  { icon: ShieldCheckIcon, t: "USDT 온체인 정산", s: "투명한 수당·출금" },
  { icon: TrendingUpIcon, t: "3단계 보상", s: "직접추천 · 직급 · 공유수당" },
];

export default async function LoginPage() {
  // 이미 로그인했으면 역할 홈으로
  const member = await getCurrentMember();
  if (member) redirect(roleHome(member.role));

  const demoIds = {
    registered: DEMO_REGISTERED_ID,
    subscriber: DEMO_SUBSCRIBER_ID,
    marketer: ROOT_MARKETER_ID,
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_560px]">
      {/* 브랜드 패널 */}
      <div className="hidden flex-col justify-between bg-feature p-14 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[10px] bg-white/15 text-lg font-bold">A</span>
          <span className="text-lg font-bold">Alpha Gate</span>
        </div>
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
        <span className="text-xs text-white/50">© Alpha Gate · MLM 보상 프로토타입</span>
      </div>

      {/* 폼 패널 */}
      <div className="grid place-items-center bg-canvas px-6 py-12">
        <LoginForm demoIds={demoIds} />
      </div>
    </div>
  );
}

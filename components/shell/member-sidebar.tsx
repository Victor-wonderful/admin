"use client";

import {
  LayoutDashboardIcon,
  NetworkIcon,
  Share2Icon,
  CoinsIcon,
  WalletIcon,
  ShoppingCartIcon,
  UserRoundIcon,
  LogOutIcon,
} from "lucide-react";

import { FortunaMark } from "@/components/brand/fortuna-logo";
import { logout } from "@/lib/actions/auth";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarBrand,
  SidebarSection,
  SidebarNavItem,
  SidebarSpacer,
  SidebarBottomCard,
} from "@/components/shell/sidebar";

export type MemberRole = "registered" | "subscriber" | "marketer";

const ROLE_LABEL: Record<MemberRole, string> = {
  registered: "등록회원",
  subscriber: "구독회원",
  marketer: "파트너",
};

const ROLE_BADGE: Record<MemberRole, string> = {
  registered: "bg-n-400 text-n-900",
  subscriber: "bg-brand text-white",
  marketer: "bg-crypto text-white",
};

export function MemberSidebar({
  role,
  uid,
  gradeSub,
}: {
  role: MemberRole;
  uid: string;
  gradeSub: string;
}) {
  // 파트너 전용 메뉴(내 팀·초대·내 리워드): 파트너에게만 노출.
  const isMarketer = role === "marketer";
  // 등급별 경로: 파트너는 /marketer/*, 등록·구독회원은 /portal/* (대시보드만 등급별 페이지가 다름)
  const home = role === "marketer" ? "/marketer/dashboard" : role === "subscriber" ? "/portal/subscriber" : "/portal/registered";
  const sub = (page: string) => (isMarketer ? `/marketer/${page}` : `/portal/${page}`);

  return (
    <Sidebar>
      <SidebarBrand
        icon={FortunaMark}
        title="포르투나"
        subtitle={role === "marketer" ? "파트너 포털" : "회원"}
        subtitleClassName={role === "marketer" ? "text-crypto" : "text-green-600"}
      />

      <SidebarSection>
        <SidebarNavItem href={home} icon={LayoutDashboardIcon} label="대시보드" sublabel="Dashboard" />
        {isMarketer ? (
          <>
            <SidebarNavItem href="/marketer/genealogy" icon={NetworkIcon} label="내 팀" sublabel="My Team" />
            <SidebarNavItem href="/marketer/referral" icon={Share2Icon} label="초대" sublabel="Invite" />
            <SidebarNavItem href="/marketer/commissions" icon={CoinsIcon} label="내 리워드" sublabel="Rewards" />
          </>
        ) : null}
        <SidebarNavItem href={sub("wallet")} icon={WalletIcon} label="내 지갑" sublabel="My Wallet" />
        <SidebarNavItem href={sub("orders")} icon={ShoppingCartIcon} label="구독·주문" sublabel="Subscription" />
        <SidebarNavItem href={sub("profile")} icon={UserRoundIcon} label="프로필·설정" sublabel="Profile" />
      </SidebarSection>

      <SidebarSpacer />

      <SidebarBottomCard>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/70">회원 구분</span>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-bold",
              ROLE_BADGE[role],
            )}
          >
            {ROLE_LABEL[role]}
          </span>
        </div>
        <div className="mt-1.5 text-sm font-bold text-white">{uid}</div>
        <div className="mt-1 text-[11px] leading-relaxed text-white/60">{gradeSub}</div>
        <form action={logout} className="mt-2.5">
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 py-2 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/15">
            <LogOutIcon className="size-3.5" /> 로그아웃
          </button>
        </form>
      </SidebarBottomCard>
    </Sidebar>
  );
}

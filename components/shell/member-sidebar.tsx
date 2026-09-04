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
  marketer: "마케터",
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
  // 마케터 전용 메뉴(계보도·레퍼럴·내 수당): 마케터에게만 노출.
  const isMarketer = role === "marketer";
  // 등급별 경로: 마케터는 /marketer/*, 등록·구독회원은 /portal/* (대시보드만 등급별 페이지가 다름)
  const home = role === "marketer" ? "/marketer/dashboard" : role === "subscriber" ? "/portal/subscriber" : "/portal/registered";
  const sub = (page: string) => (isMarketer ? `/marketer/${page}` : `/portal/${page}`);

  return (
    <Sidebar>
      <SidebarBrand
        icon={FortunaMark}
        title="포르투나"
        subtitle={role === "marketer" ? "마케터 포털" : "회원"}
        subtitleClassName={role === "marketer" ? "text-crypto" : "text-green-600"}
      />

      <SidebarSection>
        <SidebarNavItem href={home} icon={LayoutDashboardIcon} label="대시보드" sublabel="Dashboard" />
        {isMarketer ? (
          <>
            <SidebarNavItem href="/marketer/genealogy" icon={NetworkIcon} label="계보도" sublabel="Genealogy" />
            <SidebarNavItem href="/marketer/referral" icon={Share2Icon} label="레퍼럴" sublabel="Referral" />
            <SidebarNavItem href="/marketer/commissions" icon={CoinsIcon} label="내 수당" sublabel="Commissions" />
          </>
        ) : null}
        <SidebarNavItem href={sub("wallet")} icon={WalletIcon} label="내 지갑" sublabel="My Wallet" />
        <SidebarNavItem href={sub("orders")} icon={ShoppingCartIcon} label="구독·주문" sublabel="Subscription" />
        <SidebarNavItem href={sub("profile")} icon={UserRoundIcon} label="프로필·설정" sublabel="Profile" />
      </SidebarSection>

      <SidebarSpacer />

      <SidebarBottomCard>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-white/70">
            {role === "marketer" ? "내 직급" : "내 등급"}
          </span>
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

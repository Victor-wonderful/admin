"use client";

import {
  LayoutDashboardIcon,
  NetworkIcon,
  Share2Icon,
  CoinsIcon,
  WalletIcon,
  ShoppingCartIcon,
  UserRoundIcon,
} from "lucide-react";

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
  const locked = role !== "marketer";

  return (
    <Sidebar>
      <SidebarBrand
        title="Alpha Gate"
        subtitle={role === "marketer" ? "마케터 포털" : "회원"}
        subtitleClassName={role === "marketer" ? "text-crypto" : "text-green-600"}
      />

      <SidebarSection>
        <SidebarNavItem href="/marketer/dashboard" icon={LayoutDashboardIcon} label="대시보드" sublabel="Dashboard" />
        <SidebarNavItem href="/marketer/genealogy" icon={NetworkIcon} label="계보도" sublabel="Genealogy" locked={locked} />
        <SidebarNavItem href="/marketer/referral" icon={Share2Icon} label="레퍼럴" sublabel="Referral" locked={locked} />
        <SidebarNavItem href="/marketer/commissions" icon={CoinsIcon} label="내 수당" sublabel="Commissions" locked={locked} />
        <SidebarNavItem href="/marketer/wallet" icon={WalletIcon} label="내 지갑" sublabel="My Wallet" />
        <SidebarNavItem href="/marketer/orders" icon={ShoppingCartIcon} label="구독·주문" sublabel="Subscription" />
        <SidebarNavItem href="/marketer/profile" icon={UserRoundIcon} label="프로필·설정" sublabel="Profile" />
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
      </SidebarBottomCard>
    </Sidebar>
  );
}

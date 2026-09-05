"use client";

import {
  LayoutDashboardIcon,
  UsersIcon,
  NetworkIcon,
  ShoppingCartIcon,
  TrendingUpIcon,
  CoinsIcon,
  ArrowDownToLineIcon,
  ArrowUpFromLineIcon,
  WalletIcon,
  ArrowLeftRightIcon,
  LayersIcon,
  PackageIcon,
  ShieldCheckIcon,
  ScrollTextIcon,
  LogOutIcon,
  UserCogIcon,
} from "lucide-react";

import { adminLogout } from "@/lib/actions/admin-auth";

import {
  Sidebar,
  SidebarBrand,
  SidebarSection,
  SidebarNavItem,
  SidebarNavGroup,
  SidebarSubItem,
  SidebarSpacer,
  SidebarBottomCard,
} from "@/components/shell/sidebar";
import { FortunaMark } from "@/components/brand/fortuna-logo";

export function AdminSidebar({ name = "관리자", roleLabel = "관리자", mfa = false, mfaOff = false }: { name?: string; roleLabel?: string; mfa?: boolean; mfaOff?: boolean }) {
  return (
    <Sidebar>
      <SidebarBrand icon={FortunaMark} title="포르투나" subtitle="운영 콘솔" />

      <SidebarSection>
        <SidebarNavItem
          href="/admin/dashboard"
          icon={LayoutDashboardIcon}
          label="대시보드"
          sublabel="Dashboard"
        />
      </SidebarSection>

      <SidebarSection label="회원·조직">
        <SidebarNavGroup href="/admin/members" icon={UsersIcon} label="회원관리" sublabel="Members">
          <SidebarSubItem href="/admin/members/registered" label="등록회원" />
          <SidebarSubItem href="/admin/members/subscriber" label="구독회원" />
          <SidebarSubItem href="/admin/members/marketer" label="마케터" />
        </SidebarNavGroup>
        <SidebarNavItem href="/admin/org" icon={NetworkIcon} label="조직도" sublabel="Genealogy" />
      </SidebarSection>

      <SidebarSection label="실적·매출">
        <SidebarNavItem href="/admin/orders" icon={ShoppingCartIcon} label="구독·주문" sublabel="Orders" />
        <SidebarNavItem href="/admin/revenue" icon={TrendingUpIcon} label="매출현황" sublabel="Revenue" />
      </SidebarSection>

      <SidebarSection label="정산·자금">
        <SidebarNavItem href="/admin/settlements" icon={CoinsIcon} label="수당 정산" sublabel="Settlements" />
        <SidebarNavItem href="/admin/deposits" icon={ArrowDownToLineIcon} label="입금내역" sublabel="Deposits" />
        <SidebarNavItem href="/admin/withdrawals" icon={ArrowUpFromLineIcon} label="출금내역" sublabel="Withdrawals" />
        <SidebarNavItem href="/admin/wallet" icon={WalletIcon} label="지갑잔액" sublabel="Wallet" />
        <SidebarNavItem href="/admin/transactions" icon={ArrowLeftRightIcon} label="트랜잭션" sublabel="Transactions" />
      </SidebarSection>

      <SidebarSection label="설정">
        <SidebarNavItem href="/admin/ranks" icon={LayersIcon} label="수당체계·직급" sublabel="Compensation" />
        <SidebarNavItem href="/admin/products" icon={PackageIcon} label="상품·구독플랜" sublabel="Products" />
        <SidebarNavItem href="/admin/admins" icon={ShieldCheckIcon} label="관리자·권한" sublabel="Admins" />
        <SidebarNavItem href="/admin/audit" icon={ScrollTextIcon} label="감사 로그" sublabel="Audit Log" />
        <SidebarNavItem href="/admin/account" icon={UserCogIcon} label="내 계정" sublabel="My Account" />
      </SidebarSection>

      <SidebarSpacer />

      <SidebarBottomCard>
        <div className="text-[11px] font-medium text-white/70">운영 콘솔</div>
        <div className="mt-1 text-sm font-bold">{name}</div>
        <div className="mt-1 text-[11px] leading-relaxed text-white/60">
          {roleLabel} · {mfaOff ? "2FA 꺼짐(개발)" : mfa ? "2FA 활성" : "2FA 미등록"}
        </div>
        <form action={adminLogout} className="mt-2.5">
          <button type="submit" className="flex w-full items-center justify-center gap-1.5 rounded-md bg-white/10 py-2 text-[12px] font-semibold text-white/80 transition-colors hover:bg-white/15">
            <LogOutIcon className="size-3.5" /> 로그아웃
          </button>
        </form>
      </SidebarBottomCard>
    </Sidebar>
  );
}

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
} from "lucide-react";

import {
  Sidebar,
  SidebarBrand,
  SidebarSection,
  SidebarNavItem,
  SidebarSpacer,
  SidebarBottomCard,
} from "@/components/shell/sidebar";

export function AdminSidebar() {
  return (
    <Sidebar>
      <SidebarBrand title="Alpha Gate" subtitle="운영 콘솔" />

      <SidebarSection>
        <SidebarNavItem
          href="/admin/dashboard"
          icon={LayoutDashboardIcon}
          label="대시보드"
          sublabel="Dashboard"
        />
      </SidebarSection>

      <SidebarSection label="회원·조직">
        <SidebarNavItem href="/admin/members" icon={UsersIcon} label="회원관리" sublabel="Members" />
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
      </SidebarSection>

      <SidebarSpacer />

      <SidebarBottomCard>
        <div className="text-[11px] font-medium text-white/70">운영 콘솔</div>
        <div className="mt-1 text-sm font-bold">Alpha Gate Admin</div>
        <div className="mt-1 text-[11px] leading-relaxed text-white/60">
          슈퍼관리자 · 2FA 활성
        </div>
      </SidebarBottomCard>
    </Sidebar>
  );
}

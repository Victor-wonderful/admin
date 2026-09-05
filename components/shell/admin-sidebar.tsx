"use client";

import * as React from "react";

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
import { canView, pageOfPath } from "@/lib/admin-permissions";
import type { AdminRole } from "@/lib/admin-session";

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

function showFor(role: AdminRole, href: string): boolean {
  const p = pageOfPath(href);
  return p ? canView(role, p) : true;
}

// 역할이 볼 수 있는 화면만 렌더되는 메뉴 항목.
function Item({ role, ...props }: { role: AdminRole } & React.ComponentProps<typeof SidebarNavItem>) {
  return showFor(role, props.href) ? <SidebarNavItem {...props} /> : null;
}

export function AdminSidebar({ name = "관리자", role = "viewer", roleLabel = "관리자", mfa = false, mfaOff = false }: { name?: string; role?: AdminRole; roleLabel?: string; mfa?: boolean; mfaOff?: boolean }) {
  // 역할이 볼 수 없는 화면은 메뉴에서 감춘다(진입도 requireAdminPage 가 막는다).
  const finance = ["/admin/settlements", "/admin/deposits", "/admin/withdrawals", "/admin/wallet", "/admin/transactions"].some((h) => showFor(role, h));
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
        <Item role={role} href="/admin/org" icon={NetworkIcon} label="조직도" sublabel="Genealogy" />
      </SidebarSection>

      <SidebarSection label="실적·매출">
        <Item role={role} href="/admin/orders" icon={ShoppingCartIcon} label="구독·주문" sublabel="Orders" />
        <Item role={role} href="/admin/revenue" icon={TrendingUpIcon} label="매출현황" sublabel="Revenue" />
      </SidebarSection>

      {finance ? (
        <SidebarSection label="정산·자금">
          <Item role={role} href="/admin/settlements" icon={CoinsIcon} label="수당 정산" sublabel="Settlements" />
          <Item role={role} href="/admin/deposits" icon={ArrowDownToLineIcon} label="입금내역" sublabel="Deposits" />
          <Item role={role} href="/admin/withdrawals" icon={ArrowUpFromLineIcon} label="출금내역" sublabel="Withdrawals" />
          <Item role={role} href="/admin/wallet" icon={WalletIcon} label="지갑잔액" sublabel="Wallet" />
          <Item role={role} href="/admin/transactions" icon={ArrowLeftRightIcon} label="트랜잭션" sublabel="Transactions" />
        </SidebarSection>
      ) : null}

      <SidebarSection label="설정">
        <Item role={role} href="/admin/ranks" icon={LayersIcon} label="수당체계·직급" sublabel="Compensation" />
        <Item role={role} href="/admin/products" icon={PackageIcon} label="상품·구독플랜" sublabel="Products" />
        <Item role={role} href="/admin/admins" icon={ShieldCheckIcon} label="관리자·권한" sublabel="Admins" />
        <Item role={role} href="/admin/audit" icon={ScrollTextIcon} label="감사 로그" sublabel="Audit Log" />
        <Item role={role} href="/admin/account" icon={UserCogIcon} label="내 계정" sublabel="My Account" />
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

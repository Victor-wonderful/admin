"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import type { MemberRole } from "@/components/shell/member-sidebar";

type Tab = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

// 하단 탭바 구성 — 등급별로 "자주 쓰는 화면"만 올린다.
// 여기에 없는 항목(파트너의 구독·주문/프로필)은 상단 계정 메뉴(AccountMenu)에서 간다.
export function tabsFor(role: MemberRole): Tab[] {
  if (role === "marketer") {
    return [
      { href: "/marketer/dashboard", icon: LayoutDashboardIcon, label: "홈" },
      { href: "/marketer/genealogy", icon: NetworkIcon, label: "내 팀" },
      { href: "/marketer/referral", icon: Share2Icon, label: "초대" },
      { href: "/marketer/commissions", icon: CoinsIcon, label: "리워드" },
      { href: "/marketer/wallet", icon: WalletIcon, label: "지갑" },
    ];
  }
  const home = role === "subscriber" ? "/portal/subscriber" : "/portal/registered";
  return [
    { href: home, icon: LayoutDashboardIcon, label: "홈" },
    { href: "/portal/wallet", icon: WalletIcon, label: "지갑" },
    { href: "/portal/orders", icon: ShoppingCartIcon, label: "구독" },
    { href: "/portal/profile", icon: UserRoundIcon, label: "프로필" },
  ];
}

// 탭바 높이(safe-area 제외). 본문 하단 여백과 맞춰야 마지막 요소가 가려지지 않는다.
export const TABBAR_H = 56;

// 모바일·태블릿 전용 하단 탭바. lg 이상에서는 사이드바가 대신하므로 숨는다.
export function MemberTabBar({ role }: { role: MemberRole }) {
  const pathname = usePathname();
  const tabs = tabsFor(role);

  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_-6px_rgba(16,24,40,0.18)] lg:hidden"
    >
      <ul className="flex">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="flex h-14 flex-col items-center justify-center gap-1 px-1"
              >
                <Icon className={cn("size-[21px] shrink-0", active ? "text-green-700" : "text-n-500")} />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    active ? "font-bold text-green-700" : "font-medium text-n-500",
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

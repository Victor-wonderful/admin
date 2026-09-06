"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRoundIcon, ShoppingCartIcon, LogOutIcon, ChevronDownIcon } from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

// 모바일 전용 계정 메뉴.
// <lg 에서는 사이드바(하단 로그아웃 카드 포함)가 숨겨지므로, 프로필·구독·로그아웃 진입점을 여기서 보장한다.
// 어드민 화면은 좌측 드로어에 사이드바가 통째로 들어가므로 렌더하지 않는다.
export function AccountMenu({ uid }: { uid: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  const base = pathname.startsWith("/marketer") ? "/marketer" : "/portal";
  const links = [
    { href: `${base}/profile`, icon: UserRoundIcon, label: "프로필·설정" },
    { href: `${base}/orders`, icon: ShoppingCartIcon, label: "구독·주문" },
  ];

  return (
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        aria-label="계정 메뉴"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-[38px] items-center gap-1 rounded-[10px] bg-card pr-1.5 pl-1.5 ring-1 ring-border transition-colors",
          open && "bg-n-50",
        )}
      >
        <span className="grid size-7 place-items-center rounded-lg bg-n-100 text-n-500">
          <UserRoundIcon className="size-[15px]" />
        </span>
        <ChevronDownIcon className={cn("size-3.5 text-n-400 transition-transform", open ? "rotate-180" : "")} />
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[210px] overflow-hidden rounded-xl bg-card shadow-[0_12px_32px_-8px_rgba(16,24,40,0.25)] ring-1 ring-border">
          <div className="border-b px-4 py-3">
            <div className="text-[11px] text-text-tertiary">회원 UID</div>
            <div className="text-[13px] font-bold text-text-primary">{uid}</div>
          </div>
          {links.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-2.5 border-b px-4 text-[13px] font-medium text-text-primary transition-colors hover:bg-n-50"
            >
              <Icon className="size-4 text-n-500" /> {label}
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="flex h-12 w-full items-center gap-2.5 px-4 text-[13px] font-semibold text-negative transition-colors hover:bg-n-50"
            >
              <LogOutIcon className="size-4" /> 로그아웃
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

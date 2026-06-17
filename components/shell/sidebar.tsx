"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HexagonIcon, LockIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function Sidebar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col gap-1.5 border-r bg-sidebar px-3.5 py-5",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarBrand({
  icon: Icon = HexagonIcon,
  title,
  subtitle,
  subtitleClassName,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  subtitleClassName?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-1.5 pt-1 pb-4">
      <span className="grid size-[30px] place-items-center rounded-lg bg-brand text-white">
        <Icon className="size-[17px]" />
      </span>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold text-text-primary">{title}</div>
        {subtitle ? (
          <div className={cn("text-[11px]", subtitleClassName ?? "text-text-tertiary")}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SidebarSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 pt-3 first:pt-0">
      {label ? (
        <div className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase">
          {label}
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SidebarNavItem({
  href,
  icon: Icon,
  label,
  sublabel,
  locked,
  exact,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel?: string;
  locked?: boolean;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active =
    !locked &&
    (exact
      ? pathname === href
      : pathname === href || (href !== "/" && pathname.startsWith(href + "/")));

  const inner = (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 transition-colors",
        active ? "bg-green-50" : locked ? "" : "hover:bg-n-50",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-green-700" : locked ? "text-n-400" : "text-n-500",
        )}
      />
      <div className="min-w-0 flex-1 leading-tight">
        <div
          className={cn(
            "text-[13px]",
            active
              ? "font-semibold text-green-700"
              : locked
                ? "font-medium text-n-400"
                : "font-medium text-n-900",
          )}
        >
          {label}
        </div>
        {sublabel ? (
          <div
            className={cn(
              "text-[10px]",
              active ? "text-green-600" : "text-n-400",
            )}
          >
            {sublabel}
          </div>
        ) : null}
      </div>
      {locked ? <LockIcon className="size-[13px] text-n-400" /> : null}
    </div>
  );

  if (locked) {
    return (
      <div className="cursor-not-allowed" title="마케터 전용" aria-disabled>
        {inner}
      </div>
    );
  }
  return <Link href={href}>{inner}</Link>;
}

export function SidebarSpacer() {
  return <div className="flex-1" />;
}

export function SidebarBottomCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg bg-feature p-3.5 text-white", className)}>
      {children}
    </div>
  );
}

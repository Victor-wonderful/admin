"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

export function SideNav({
  title,
  items,
  preserveParam,
}: {
  title: string;
  items: { href: string; label: string }[];
  preserveParam?: string; // 예: 'as' — 페이지 이동 시 선택 마케터 유지
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const keep = preserveParam ? params.get(preserveParam) : null;
  const suffix = keep ? `?${preserveParam}=${keep}` : "";
  return (
    <nav className="flex flex-col gap-1">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {items.map((it) => {
        const active = pathname === it.href || pathname.startsWith(it.href + "/");
        return (
          <Link
            key={it.href}
            href={it.href + suffix}
            className={cn(
              "rounded-md px-3 py-2 text-sm transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

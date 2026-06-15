import Link from "next/link";
import { SideNav } from "@/components/shell/SideNav";

// DB(서비스롤) 기반 → 정적 프리렌더 대신 요청 시 동적 렌더.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-card">
        <Link href="/" className="block px-4 py-4 text-lg font-bold">
          운영자 어드민
        </Link>
        <div className="px-2 pt-2">
          <SideNav
            title="운영"
            items={[
              { href: "/admin/members", label: "회원 관리" },
              { href: "/admin/org", label: "전체 조직도" },
              { href: "/admin/ranks", label: "수당체계/직급" },
              { href: "/admin/products", label: "상품" },
            ]}
          />
        </div>
        <div className="mt-6 px-4">
          <Link href="/marketer" className="text-xs text-muted-foreground underline">
            마케터 홈으로 →
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}

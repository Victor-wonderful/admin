import Link from "next/link";
import { SideNav } from "@/components/shell/SideNav";
import { MarketerSwitcher } from "@/components/marketer/MarketerSwitcher";
import { listMarketers } from "@/lib/queries/members";
import { ROOT_MARKETER_ID } from "@/lib/constants";

// DB(서비스롤) 기반 → 정적 프리렌더 대신 요청 시 동적 렌더.
export const dynamic = "force-dynamic";

export default async function MarketerLayout({ children }: { children: React.ReactNode }) {
  const marketers = await listMarketers();
  const options = marketers.map((m) => ({ id: m.id, name: m.display_name }));

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r bg-card">
        <Link href="/" className="block px-4 py-4 text-lg font-bold">
          마케팅 홈
        </Link>
        <MarketerSwitcher marketers={options} defaultId={ROOT_MARKETER_ID} />
        <div className="px-2 pt-2">
          <SideNav
            title="마케터"
            preserveParam="as"
            items={[
              { href: "/marketer", label: "대시보드" },
              { href: "/marketer/genealogy", label: "계보도" },
              { href: "/marketer/referral", label: "레퍼럴 코드" },
            ]}
          />
        </div>
        <div className="mt-6 px-4">
          <Link href="/admin/members" className="text-xs text-muted-foreground underline">
            운영자 어드민으로 →
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-6">{children}</main>
    </div>
  );
}

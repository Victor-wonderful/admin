import { MemberSidebar } from "@/components/shell/member-sidebar";

export const dynamic = "force-dynamic";

export default function MarketerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <MemberSidebar
        role="marketer"
        uid="AG·8F3A21"
        gradeSub="후원 전체 활성 3,420명 · 다음 직급 49%"
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

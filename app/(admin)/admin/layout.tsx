import { AdminSidebar } from "@/components/shell/admin-sidebar";

// DB(서비스롤) 기반 → 정적 프리렌더 대신 요청 시 동적 렌더.
export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <AdminSidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

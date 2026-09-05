import { Topbar } from "@/components/shell/topbar";
import { requireAdminPage } from "@/lib/admin-guard";
import { OrdersExplorer } from "@/components/orders/orders-explorer";
import { listOrders } from "@/lib/queries/admin-finance";
import { currentCycle } from "@/lib/dates";

export const dynamic = "force-dynamic";

// 구독·주문 — 구독·파트너 멤버십·상품 구매 전체(실데이터). 결제는 회원 지갑 잔액 차감.
export default async function AdminOrdersPage() {
  const admin = await requireAdminPage("orders");
  const { rows, stats } = await listOrders(1000);
  return (
    <>
      <Topbar title="구독·주문" sub="구독 · 파트너 멤버십 · 상품 주문 · 지갑 잔액 결제(USDT)" uid={admin.display_name} />
      <OrdersExplorer rows={rows} stats={stats} cycle={currentCycle()} />
    </>
  );
}

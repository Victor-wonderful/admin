import { Topbar } from "@/components/shell/topbar";
import { OrdersExplorer } from "@/components/orders/orders-explorer";

export default function AdminOrdersPage() {
  return (
    <>
      <Topbar title="구독·주문" sub="전체 구독·상품 주문 · USDT 결제" uid="운영자" />
      <OrdersExplorer />
    </>
  );
}

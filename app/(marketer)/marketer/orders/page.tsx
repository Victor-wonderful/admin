import { OrdersView } from "@/components/orders/orders-view";
import { getMarketerViewerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketerOrdersPage() {
  const viewerId = await getMarketerViewerId();
  return <OrdersView memberId={viewerId} role="marketer" />;
}

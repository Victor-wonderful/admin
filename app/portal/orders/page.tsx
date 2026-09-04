import { OrdersView } from "@/components/orders/orders-view";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalOrdersPage() {
  const me = await requireMember();
  return <OrdersView memberId={me.id} role={me.role} />;
}

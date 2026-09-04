import { WalletView } from "@/components/wallet/wallet-view";
import { getMarketerViewerId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MarketerWalletPage() {
  const viewerId = await getMarketerViewerId();
  return <WalletView memberId={viewerId} role="marketer" />;
}

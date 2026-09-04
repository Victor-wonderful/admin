import { WalletView } from "@/components/wallet/wallet-view";
import { requireMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PortalWalletPage() {
  const me = await requireMember();
  return <WalletView memberId={me.id} role={me.role} />;
}

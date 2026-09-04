import { DepositModal } from "@/components/wallet/deposit-modal";
import { getDepositNetworks, isDemoDepositEnabled } from "@/lib/deposit-config";

// 서버 래퍼 — 회사 입금 주소(환경변수)와 개발용 테스트 입금 여부를 채워 입금 모달 버튼을 렌더한다.
export function DepositButton({
  memberId,
  className,
  children,
}: {
  memberId: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <DepositModal networks={getDepositNetworks()} memberId={memberId} demoEnabled={isDemoDepositEnabled()} className={className}>
      {children}
    </DepositModal>
  );
}

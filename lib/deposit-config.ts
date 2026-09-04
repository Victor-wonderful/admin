import "server-only";

// 회사 입금 지갑(체인별 1개). 회원은 이 주소로 USDT 를 보내고, 서버가 입금을 감지해 잔액에 반영한다(연동 예정).
// 주소는 환경변수로만 관리한다. 미설정이면 화면에 "준비 중"으로 표시된다.
export type DepositNetwork = {
  code: "TRC20" | "BEP20";
  label: string; // 화면 표시용
  chain: string; // 체인 이름
  address: string | null;
};

export function getDepositNetworks(): DepositNetwork[] {
  return [
    { code: "TRC20", label: "Tron (TRC20)", chain: "Tron", address: process.env.COMPANY_DEPOSIT_ADDRESS_TRC20?.trim() || null },
    { code: "BEP20", label: "BSC (BEP20)", chain: "BNB Smart Chain", address: process.env.COMPANY_DEPOSIT_ADDRESS_BEP20?.trim() || null },
  ];
}

// 개발 환경에서만 "테스트 입금 반영"(데모 잔액 증가)을 허용한다. 운영 빌드에서는 항상 false.
export function isDemoDepositEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}

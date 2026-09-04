-- 0026. 회원 본인 지갑 주소(체인별). 출금 목적지이자 입금 보낸 주소 식별에 사용.
-- 회사 입금 주소는 환경변수(COMPANY_DEPOSIT_ADDRESS_*)로 관리하고, wallets.deposit_address(시드 임의값)는 더 이상 화면에 쓰지 않는다.

alter table members add column if not exists payout_address_trc20 text;
alter table members add column if not exists payout_address_bep20 text;

create index if not exists members_payout_trc20_idx on members(lower(payout_address_trc20)) where payout_address_trc20 is not null;
create index if not exists members_payout_bep20_idx on members(lower(payout_address_bep20)) where payout_address_bep20 is not null;

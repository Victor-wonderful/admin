-- 0021_subscribe_and_upgrade.sql — 등록회원 → 마케터 한 번에 (구독+연회비 합산 결제)
-- subscribe_member($120) + upgrade_to_marketer($200) 를 한 트랜잭션(=함수)으로.
-- 함수 내부 예외는 전체 롤백 → 원자적(둘 다 또는 전무). 총 $320 필요.
create or replace function subscribe_and_upgrade(
  p_member uuid, p_sub numeric default 120, p_annual numeric default 200, p_as_of date default current_date
) returns text
language plpgsql as $$
begin
  perform subscribe_member(p_member, p_sub, p_as_of);      -- 등록 → 구독 (+구독료 차감)
  perform upgrade_to_marketer(p_member, p_annual, p_as_of); -- 구독 → 마케터 (+연회비 차감)
  return 'marketer';
end;
$$;

grant execute on function subscribe_and_upgrade(uuid, numeric, numeric, date) to service_role;

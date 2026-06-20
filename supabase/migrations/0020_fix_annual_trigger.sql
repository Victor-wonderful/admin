-- 0020_fix_annual_trigger.sql — 실시간 수당 트리거 annual_memberships 버그 수정
-- 버그: 0013 의 trg_settle_payment 가 `if tg_table_name='subscriptions' and coalesce(new.status,...)`
--   처럼 한 expression 에서 new.status 를 참조. SQL AND 는 단축평가를 보장하지 않아
--   annual_memberships(=status 컬럼 없음) INSERT 시 "record new has no field status" 로 실패.
--   → 연회비 결제/갱신(마케터 승급 포함)이 트리거 경유 시 깨짐.
-- 수정: 테이블별 중첩 IF 로 분기해 new.status 는 subscriptions 일 때만 접근.

create or replace function trg_settle_payment() returns trigger language plpgsql as $$
declare v_asof date;
begin
  v_asof := coalesce((new.paid_at at time zone 'UTC')::date, current_date);
  -- 구독 결제만: 결제 회원을 활성으로 즉시 반영(직급 카운트 정합). new.status 는 여기서만 접근.
  if tg_table_name = 'subscriptions' then
    if coalesce(new.status, 'active') = 'active' then
      update members set is_active_subscriber = true where id = new.member_id and is_active_subscriber = false;
    end if;
  end if;
  perform settle_payment_event(new.member_id, new.amount_usd, v_asof);
  return new;
end;
$$;

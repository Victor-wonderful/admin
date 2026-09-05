-- 0039_allocate_on_payment.sql — 매출 발생 즉시 60/20/10/10 배분 (Victor 확인 2026-09-05)
-- 종전: 실시간 리워드는 결제 순간 수당 풀에서 나가는데, 풀에 60% 를 넣는 allocate_revenue 는 관리자가 월 단위 수동 실행
--       → 배분 전에는 수당 풀이 마이너스로 보임.
-- 변경: 결제(구독/파트너 멤버십) 트리거에서 리워드 지급 뒤 해당 사이클 배분을 곧바로 재계산한다.
--       allocate_revenue 는 멱등(사이클 매출 합 → 배분표 upsert → 풀 잔액 = 배분 합 − 지급 합)이라 결제마다 불러도 안전.
--       관리자 매출현황의 "배분 실행" 버튼과 일일 크론은 안전망으로 유지.

create or replace function trg_settle_payment() returns trigger language plpgsql as $$
declare v_asof date; v_cycle text;
begin
  v_asof := coalesce((new.paid_at at time zone 'UTC')::date, current_date);
  v_cycle := to_char(coalesce(new.paid_at at time zone 'UTC', now() at time zone 'UTC'), 'YYYY-MM');
  -- 구독 결제만: 결제 회원을 활성으로 즉시 반영(직급 카운트 정합). new.status 는 여기서만 접근.
  if tg_table_name = 'subscriptions' then
    if coalesce(new.status, 'active') = 'active' then
      update members set is_active_subscriber = true where id = new.member_id and is_active_subscriber = false;
    end if;
  end if;
  -- 1) 매출 배분: 이 결제가 포함된 사이클을 60% 수당풀 / 20% 회사 / 10% 지분자 / 10% 예비비로 재계산
  perform allocate_revenue(v_cycle);
  -- 2) 실시간 리워드(초대 1·2대 + 직급 차액) — 수당 풀에서 지급
  perform settle_payment_event(new.member_id, new.amount_usd, v_asof);
  -- 3) 지급 반영 후 풀 잔액 재동기화(배분 합 − 지급 합)
  perform sync_pool_commission();
  return new;
end;
$$;

-- 0052. 포르투나 앱 이용 만료 시각 계산 + 슈퍼관리자 체험 연장.
-- 규칙(2026-09-06 Victor): 가입 후 2일 체험 → 이후엔 앱 구독(bot_sub, 월 120)이 있어야 이용. 파트너도 구독 없으면 동일.
-- 슈퍼관리자가 회원별로 체험을 연장할 수 있다(members.trial_until). 값 = greatest(가입+2일, 체험 연장 기한, 활성 구독 종료일 다음날 00:00).
-- 관리자 시스템이 이 값을 포르투나 앱 profiles.access_until 에 밀어 넣는다(lib/member-access.ts).

alter table members add column if not exists trial_until timestamptz;
comment on column members.trial_until is '슈퍼관리자가 연장한 체험 기한(없으면 가입+2일). 앱 이용 만료 계산에 포함';

create or replace function member_access_until(p_member uuid)
returns timestamptz
language sql stable as $$
  select greatest(
    m.created_at + interval '2 days',
    m.trial_until,
    (select max(s.period_end)::timestamptz + interval '1 day'
       from subscriptions s
      where s.member_id = m.id and s.status = 'active')
  )
  from members m
  where m.id = p_member;
$$;

grant execute on function member_access_until(uuid) to service_role;

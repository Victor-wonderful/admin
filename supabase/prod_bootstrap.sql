-- 운영 DB 초기 데이터(1회). `supabase db push` 로 0001~0050 마이그레이션을 적용한 뒤 실행한다.
-- 시드(seed.sql)는 개발용 1,200명 데모 데이터라 운영에는 절대 넣지 않는다. 운영에 필요한 최소 데이터만 여기 있다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여넣고
--            아래 "▼ 여기 세 값만 바꾼다" 의 이메일·이름·비밀번호를 고친 뒤 Run.
--            (psql 이 있으면 psql "<연결 문자열>" -f supabase/prod_bootstrap.sql 로도 된다.)
--
-- 하는 일:
--   1) 상품 카탈로그 4종(코드 고정: bot_sub / annual_fee / coin_visa / exchange_fee_share). 이미 있으면 건너뜀.
--   2) 루트 파트너(회사 계정) 1명 + 초대 코드 1개. 회원가입은 활성 초대 코드가 있어야만 가능하므로
--      첫 회원을 받으려면 이 계정이 반드시 필요하다. 이미 같은 이메일이 있으면 건너뜀.
--   3) 마지막에 초대 코드를 출력한다 → 가입 안내 링크(/signup?ref=코드)에 사용.

begin;

-- ▼ 여기 세 값만 바꾼다 ------------------------------------------------------
select set_config('boot.root_email',    'company@example.com', false),
       set_config('boot.root_name',     '포르투나',            false),
       set_config('boot.root_password', '8자이상비밀번호',      false);
-- ▲ ---------------------------------------------------------------------------

-- 1) 상품
insert into products(code, name, price_usd, billing, is_active, pool_eligible, counts_active, sort_order)
values
  ('bot_sub',            '포르투나 구독',      120.00, 'monthly', true, true, true,  10),
  ('annual_fee',         '파트너 멤버십',      200.00, 'yearly',  true, true, false, 20),
  ('coin_visa',          '코인 비자 카드',     null,   'event',   false, true, false, 30),
  ('exchange_fee_share', '거래소 수수료 분배', null,   'event',   false, true, false, 40)
on conflict (code) do nothing;

-- 2) 루트 파트너(회사 계정)
do $$
declare
  v_email    text := lower(trim(current_setting('boot.root_email')));
  v_name     text := trim(current_setting('boot.root_name'));
  v_password text := current_setting('boot.root_password');
  v_id uuid;
begin
  if v_email = 'company@example.com' or v_password = '8자이상비밀번호' then
    raise exception '▼ 표시된 세 값(이메일·이름·비밀번호)을 먼저 실제 값으로 바꾸세요';
  end if;
  if length(coalesce(v_password, '')) < 8 then raise exception '비밀번호는 8자 이상이어야 합니다'; end if;
  if length(coalesce(v_name, '')) < 1 then raise exception '이름이 비어 있습니다'; end if;

  select id into v_id from members where lower(email) = v_email;
  if v_id is null then
    insert into members(display_name, email, role, recommender_id, parent_id, password_hash)
    values (v_name, v_email, 'marketer', null, null,
            extensions.crypt(v_password, extensions.gen_salt('bf')))
    returning id into v_id;
    perform ensure_wallet(v_id);
    -- 회사 계정의 파트너 멤버십은 만료되지 않도록 100년.
    insert into annual_memberships(member_id, amount_usd, period_start, period_end, paid_at)
    values (v_id, 0, current_date, (current_date + interval '100 years')::date, now());
  end if;
  perform ensure_referral_code(v_id);
end $$;

commit;

-- 3) 결과 확인: 회사 계정의 초대 코드 + 상품 목록
select m.email, m.role, r.code as referral_code
from members m join referral_codes r on r.owner_id = m.id and r.is_active
where lower(m.email) = lower(trim(current_setting('boot.root_email')));
select code, name, price_usd, billing, is_active from products order by sort_order;

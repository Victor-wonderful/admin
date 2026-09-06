-- 운영 DB 초기 데이터(1회). `supabase db push` 로 0001~0050 마이그레이션을 적용한 뒤 실행한다.
-- 시드(seed.sql)는 개발용 1,200명 데모 데이터라 운영에는 절대 넣지 않는다. 운영에 필요한 최소 데이터만 여기 있다.
--
-- 실행 방법: Supabase 대시보드 → SQL Editor → New query → 이 파일 전체를 붙여넣고 Run.
--            고칠 값 없음. 회사 계정은 이메일·비밀번호 없이(로그인 불가) 만든다.
--
-- 하는 일:
--   1) 상품 카탈로그 4종(코드 고정: bot_sub / annual_fee / coin_visa / exchange_fee_share). 이미 있으면 건너뜀.
--   1-b) 시스템 지갑 5행(운영 + 풀 4개, 잔액 0). 이미 있으면 건너뜀.
--   2) 루트 파트너(회사 계정) 1명 + 초대 코드 1개. 회원가입은 활성 초대 코드가 있어야만 가능하므로
--      첫 회원을 받으려면 이 계정이 반드시 필요하다. 이미 같은 이메일이 있으면 건너뜀.
--      이메일·비밀번호 없이 만든다(로그인 불가). 추천 조직의 뿌리 역할만 한다.
--      나중에 로그인이 필요해지면 관리자 콘솔 → 회원 상세에서 이메일 지정 후 "비밀번호 재설정".
--   3) 마지막에 초대 코드를 출력한다 → 가입 안내 링크(/signup?ref=코드)에 사용.

begin;

-- 1) 상품
insert into products(code, name, price_usd, billing, is_active, pool_eligible, counts_active, sort_order)
values
  ('bot_sub',            '포르투나 구독',      120.00, 'monthly', true, true, true,  10),
  ('annual_fee',         '파트너 멤버십',      200.00, 'yearly',  true, true, false, 20),
  ('coin_visa',          '코인 비자 카드',     null,   'event',   false, true, false, 30),
  ('exchange_fee_share', '거래소 수수료 분배', null,   'event',   false, true, false, 40)
on conflict (code) do nothing;

-- 1-b) 시스템 지갑 행(운영 지갑 + 매출 배분 풀 4개). 결제 시 배분 갱신은 이 행들을 update 하므로 반드시 있어야 한다.
--      잔액은 0에서 시작. 운영 지갑 실제 잔액은 체인에서 읽어 화면에 보여준다.
insert into system_wallets(kind, label, balance_usd, network) values
  ('operating',       '운영 지갑',   0, 'TRC20'),
  ('pool_commission', '수당 풀',     0, null),
  ('pool_company',    '회사 수익',   0, null),
  ('pool_equity',     '지분자 배당', 0, null),
  ('pool_reserve',    '예비비',      0, null)
on conflict (kind) do nothing;

-- 2) 루트 파트너(회사 계정)
do $$
declare
  v_id uuid;
begin
  -- 뿌리(추천인 없음) 파트너가 이미 있으면 재사용
  select id into v_id from members where recommender_id is null and role = 'marketer' order by created_at limit 1;
  if v_id is null then
    insert into members(display_name, email, role, recommender_id, parent_id, password_hash)
    values ('포르투나', null, 'marketer', null, null, null)
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
select m.display_name, m.role, r.code as referral_code
from members m join referral_codes r on r.owner_id = m.id and r.is_active
where m.recommender_id is null and m.role = 'marketer';
select code, name, price_usd, billing, is_active from products order by sort_order;

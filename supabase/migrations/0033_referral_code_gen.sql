-- 0033. 초대 코드 자동 발급.
-- 규칙: 파트너(마케터)가 되는 순간 활성 초대 코드가 없으면 1개 발급. 형식 = 6자리, 대문자·숫자 조합,
--       혼동되는 글자(O·0·I·1) 제외, 충돌 시 재시도. 파트너 1명당 활성 코드 1개(기존 유니크 인덱스).
--       시드의 REF0~REF997 은 그대로 유효하다.

create or replace function generate_referral_code()
returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from referral_codes where upper(referral_codes.code) = v_code);
  end loop;
  return v_code;
end $$;

-- 활성 코드가 없으면 발급. 있으면 기존 코드 반환.
create or replace function ensure_referral_code(p_member uuid)
returns text
language plpgsql as $$
declare v_code text;
begin
  select code into v_code from referral_codes where owner_id = p_member and is_active limit 1;
  if v_code is not null then return v_code; end if;
  v_code := generate_referral_code();
  insert into referral_codes(code, owner_id, is_active) values (v_code, p_member, true);
  return v_code;
end $$;

-- 파트너 전환 시 초대 코드 발급
create or replace function upgrade_to_marketer(p_member uuid, p_amount numeric default 200, p_as_of date default current_date)
returns text
language plpgsql as $$
declare v_bal numeric; v_role member_role;
begin
  select role into v_role from members where id = p_member;
  if v_role <> 'subscriber' then raise exception '구독회원만 파트너로 전환할 수 있습니다 (현재 %)', v_role; end if;

  perform ensure_wallet(p_member);
  select balance_usd into v_bal from wallets where member_id = p_member for update;
  if v_bal < p_amount then raise exception '잔액 부족: 보유 % < 멤버십 %. 먼저 입금하세요.', v_bal, p_amount; end if;

  update wallets set balance_usd = balance_usd - p_amount, updated_at = now() where member_id = p_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, status)
    values (p_member, 'payment', p_amount, '파트너 멤버십 결제', 'completed');
  insert into annual_memberships(member_id, amount_usd, period_start, period_end, paid_at)
    values (p_member, p_amount, p_as_of, p_as_of + 365, now());   -- 실시간 수당 트리거 발화
  update members set role = 'marketer' where id = p_member;
  perform ensure_referral_code(p_member);
  return 'upgraded';
end $$;

-- 기존 파트너 중 코드 없는 회원 backfill
do $$
declare r record;
begin
  for r in select id from members m where role = 'marketer' and not exists (select 1 from referral_codes c where c.owner_id = m.id and c.is_active) loop
    perform ensure_referral_code(r.id);
  end loop;
end $$;

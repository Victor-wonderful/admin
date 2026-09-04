-- 0022. 회원 인증: 비밀번호(pgcrypto bcrypt) + 이메일/비밀번호 로그인 + 추천 코드 회원가입.
-- 세션은 앱 쿠키(ag_member)로 유지하고, 해시 생성·검증은 DB 안에서만 수행한다(앱은 해시를 읽지 않음).

alter table members add column if not exists password_hash text;

-- 로그인: 이메일+비밀번호 일치 시 (id, role) 1행, 아니면 0행.
create or replace function member_login(p_email text, p_password text)
returns table(id uuid, role member_role)
language sql stable as $$
  select m.id, m.role
  from members m
  where lower(m.email) = lower(trim(p_email))
    and m.password_hash is not null
    and m.password_hash = extensions.crypt(p_password, m.password_hash);
$$;

-- 회원가입: 추천 코드(referral_codes, 활성) 소유 마케터를 추천인으로 등록회원 생성.
-- 등록회원은 조직(후원)에 편입하지 않으므로 parent_id 는 null. 지갑은 즉시 생성.
create or replace function register_member(p_name text, p_email text, p_password text, p_ref_code text)
returns uuid
language plpgsql as $$
declare
  v_owner uuid;
  v_id    uuid;
  v_email text := lower(trim(p_email));
begin
  if length(coalesce(trim(p_name), '')) < 1 then raise exception 'NAME_REQUIRED'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_INVALID'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;

  select owner_id into v_owner
  from referral_codes
  where upper(code) = upper(trim(p_ref_code)) and is_active;
  if v_owner is null then raise exception 'REF_CODE_INVALID'; end if;

  if exists (select 1 from members where lower(email) = v_email) then
    raise exception 'EMAIL_TAKEN';
  end if;

  insert into members (display_name, email, role, recommender_id, parent_id, password_hash)
  values (trim(p_name), v_email, 'registered', v_owner, null,
          extensions.crypt(p_password, extensions.gen_salt('bf')))
  returning members.id into v_id;

  perform ensure_wallet(v_id);
  return v_id;
end $$;

-- 데모/시드 계정: 로그인 가능하도록 데모 이메일 + 개발용 공통 비밀번호(fortuna1234) 부여.
update members set email = 'marketer@fortuna.demo'   where id = 'aaaaaaaa-0000-0000-0000-000000000000' and email is null;
update members set email = 'subscriber@fortuna.demo' where id = 'aaaaaaaa-0000-0000-0000-00000000000b' and email is null;
update members set email = 'registered@fortuna.demo' where id = 'aaaaaaaa-0000-0000-0000-000000000138' and email is null;

do $$
declare h text := extensions.crypt('fortuna1234', extensions.gen_salt('bf'));
begin
  update members set password_hash = h where password_hash is null;
end $$;

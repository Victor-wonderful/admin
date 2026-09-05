-- 0046_member_admin_controls.sql — 관리자 회원 제어: 계정 정지 · 비밀번호 재설정(임시 비밀번호)
-- 정지된 회원은 로그인 시 'SUSPENDED' 예외(앱이 안내), 정지 시점의 활성 세션은 전부 종료(revoke_reason='suspended').

alter table members
  add column if not exists suspended_at   timestamptz,
  add column if not exists suspend_reason text;

-- 로그인: 비밀번호 일치 + 정지 아님. 정지 계정은 예외로 구분(비밀번호 불일치와 다른 안내).
create or replace function member_login(p_email text, p_password text)
returns table(id uuid, role member_role)
language plpgsql as $$
declare m members%rowtype;
begin
  select * into m from members
   where lower(members.email) = lower(trim(p_email))
     and members.password_hash is not null
     and members.password_hash = extensions.crypt(p_password, members.password_hash);
  if not found then return; end if;
  if m.suspended_at is not null then raise exception 'SUSPENDED'; end if;
  return query select m.id, m.role;
end $$;

-- 관리자 임시 비밀번호 발급(현재 비밀번호 확인 없음). 세션·미사용 재설정 토큰 전부 소진.
create or replace function admin_set_member_password(p_member uuid, p_new text)
returns void language plpgsql as $$
begin
  if length(coalesce(p_new, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  update members set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = p_member;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  update member_sessions set revoked_at = now(), revoke_reason = 'password_reset' where member_id = p_member and revoked_at is null;
  update member_password_resets set used_at = now() where member_id = p_member and used_at is null;
end $$;

-- 계정 정지/해제. 정지 시 활성 세션 전부 종료.
create or replace function admin_set_member_suspended(p_member uuid, p_suspended boolean, p_reason text)
returns void language plpgsql as $$
begin
  update members
     set suspended_at = case when p_suspended then now() else null end,
         suspend_reason = case when p_suspended then nullif(trim(coalesce(p_reason, '')), '') else null end
   where id = p_member;
  if not found then raise exception 'MEMBER_NOT_FOUND'; end if;
  if p_suspended then
    update member_sessions set revoked_at = now(), revoke_reason = 'suspended' where member_id = p_member and revoked_at is null;
  end if;
end $$;

grant execute on function admin_set_member_password(uuid, text), admin_set_member_suspended(uuid, boolean, text) to service_role;

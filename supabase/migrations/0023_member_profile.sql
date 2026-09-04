-- 0023. 프로필: 비밀번호 변경(현재 비밀번호 확인 후 bcrypt 재해시).

create or replace function change_member_password(p_member uuid, p_current text, p_new text)
returns void
language plpgsql as $$
declare v_hash text;
begin
  if length(coalesce(p_new, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  select password_hash into v_hash from members where id = p_member;
  if v_hash is null then raise exception 'MEMBER_NOT_FOUND'; end if;
  if v_hash <> extensions.crypt(p_current, v_hash) then raise exception 'CURRENT_PASSWORD_WRONG'; end if;
  update members set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = p_member;
end $$;

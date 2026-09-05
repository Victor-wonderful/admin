-- 0043_admin_password_reset.sql — 관리자 비밀번호 복구 두 경로
--  (1) 슈퍼관리자가 다른 관리자에게 임시 비밀번호 발급(reset_admin_password)
--  (2) 본인이 이메일 링크로 재설정(admin_password_resets 토큰 · 30분 · 1회용)
-- 두 경로 모두 성공 시 그 관리자의 활성 세션을 전부 끊고 잠금 카운터를 초기화한다.

-- (1) 임시 비밀번호 발급. p_by 는 활성 슈퍼관리자여야 하며 본인에게는 쓸 수 없다(내 계정에서 변경).
create or replace function reset_admin_password(p_admin uuid, p_new text, p_by uuid)
returns void language plpgsql as $$
declare v_by admins%rowtype;
begin
  select * into v_by from admins where id = p_by;
  if not found or not v_by.is_active or v_by.role <> 'super' then raise exception 'NOT_SUPER'; end if;
  if p_admin = p_by then raise exception 'SELF_RESET'; end if;
  if not exists (select 1 from admins where id = p_admin) then raise exception 'NOT_FOUND'; end if;
  if length(coalesce(p_new, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  update admins
     set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
         failed_attempts = 0, locked_until = null
   where id = p_admin;
  update admin_sessions set revoked_at = now(), revoke_reason = 'password_reset'
   where admin_id = p_admin and revoked_at is null;
  update admin_password_resets set used_at = now()
   where admin_id = p_admin and used_at is null;
end $$;

-- (2) 이메일 링크 토큰. 원문 토큰은 메일로만 나가고 DB 에는 sha256 만 저장.
create table if not exists admin_password_resets (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references admins(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists admin_password_resets_admin_idx on admin_password_resets(admin_id, created_at desc);

-- 요청. 등록·활성 관리자면 토큰을 저장하고 (admin_id, email, display_name) 반환, 아니면 빈 결과.
-- 호출 측은 결과와 무관하게 같은 안내를 보여 이메일 존재 여부를 노출하지 않는다.
-- 같은 계정에 1시간 내 3회를 넘기면 'RATE_LIMITED'.
create or replace function request_admin_password_reset(p_email text, p_token_hash text, p_ip text)
returns table(admin_id uuid, email text, display_name text)
language plpgsql as $$
declare a admins%rowtype; v_recent integer;
begin
  select * into a from admins where lower(admins.email) = lower(trim(p_email));
  if not found or not a.is_active then return; end if;
  select count(*) into v_recent from admin_password_resets r
   where r.admin_id = a.id and r.created_at > now() - interval '1 hour';
  if v_recent >= 3 then raise exception 'RATE_LIMITED'; end if;
  insert into admin_password_resets (admin_id, token_hash, expires_at, ip)
  values (a.id, p_token_hash, now() + interval '30 minutes', left(coalesce(p_ip, ''), 64));
  return query select a.id, a.email, a.display_name;
end $$;

-- 토큰 상태 확인(재설정 페이지 렌더용). 유효하면 (admin_id, email), 아니면 빈 결과.
create or replace function check_admin_password_reset(p_token_hash text)
returns table(admin_id uuid, email text)
language sql stable as $$
  select r.admin_id, a.email
    from admin_password_resets r join admins a on a.id = r.admin_id
   where r.token_hash = p_token_hash and r.used_at is null and r.expires_at > now() and a.is_active;
$$;

-- 완료. 토큰 검증 → 비밀번호 변경 → 토큰 소진(같은 계정의 다른 미사용 토큰도) → 세션 전부 끊기.
-- 예외: TOKEN_INVALID / TOKEN_USED / TOKEN_EXPIRED / PASSWORD_TOO_SHORT
create or replace function complete_admin_password_reset(p_token_hash text, p_new text)
returns table(admin_id uuid, email text)
language plpgsql as $$
declare r admin_password_resets%rowtype; v_email text;
begin
  select * into r from admin_password_resets where token_hash = p_token_hash;
  if not found then raise exception 'TOKEN_INVALID'; end if;
  if r.used_at is not null then raise exception 'TOKEN_USED'; end if;
  if r.expires_at <= now() then raise exception 'TOKEN_EXPIRED'; end if;
  if length(coalesce(p_new, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  select a.email into v_email from admins a where a.id = r.admin_id and a.is_active;
  if v_email is null then raise exception 'TOKEN_INVALID'; end if;
  update admins
     set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')),
         failed_attempts = 0, locked_until = null
   where id = r.admin_id;
  update admin_password_resets set used_at = now()
   where admin_password_resets.admin_id = r.admin_id and used_at is null;
  update admin_sessions set revoked_at = now(), revoke_reason = 'password_reset'
   where admin_sessions.admin_id = r.admin_id and revoked_at is null;
  return query select r.admin_id, v_email;
end $$;

grant all on table admin_password_resets to service_role;
grant execute on function reset_admin_password(uuid, text, uuid), request_admin_password_reset(text, text, text),
  check_admin_password_reset(text), complete_admin_password_reset(text, text) to service_role;

-- 0041_admin_auth.sql — 관리자 계정·세션·2단계 인증(TOTP)
-- 회원 인증(members/member_sessions)과 완전히 분리. 관리자는 공개 가입 없음(슈퍼관리자가 추가).
-- 로그인 = 이메일 + 비밀번호(bcrypt) → 세션(mfa_ok=false) → TOTP 6자리 확인 → mfa_ok=true.
-- 5회 연속 실패 시 15분 잠금. 관리자는 여러 기기 동시 로그인 허용.

create table if not exists admins (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  display_name    text not null,
  password_hash   text not null,
  role            text not null default 'super' check (role in ('super','settlement','ops','viewer')),
  is_active       boolean not null default true,
  totp_secret     text,                       -- base32. enabled=false 이면 등록 진행 중
  totp_enabled    boolean not null default false,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_by      uuid references admins(id),
  created_at      timestamptz not null default now()
);

create table if not exists admin_sessions (
  id            uuid primary key default gen_random_uuid(),
  admin_id      uuid not null references admins(id) on delete cascade,
  token_hash    text not null unique,
  mfa_ok        boolean not null default false,
  user_agent    text,
  ip            text,
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked_at    timestamptz,
  revoke_reason text
);
create index if not exists admin_sessions_admin_idx on admin_sessions(admin_id) where revoked_at is null;

-- 로그인 검증. 성공: (id, totp_enabled). 실패: 'INVALID' / 'LOCKED' / 'DISABLED' 예외.
create or replace function admin_login(p_email text, p_password text)
returns table(id uuid, totp_enabled boolean)
language plpgsql as $$
declare a admins%rowtype;
begin
  select * into a from admins where lower(email) = lower(trim(p_email));
  if not found then raise exception 'INVALID'; end if;
  if not a.is_active then raise exception 'DISABLED'; end if;
  if a.locked_until is not null and a.locked_until > now() then raise exception 'LOCKED'; end if;
  if a.password_hash <> extensions.crypt(p_password, a.password_hash) then
    update admins set failed_attempts = failed_attempts + 1,
      locked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else locked_until end
      where admins.id = a.id;
    if a.failed_attempts + 1 >= 5 then raise exception 'LOCKED'; end if;
    raise exception 'INVALID';
  end if;
  update admins set failed_attempts = 0, locked_until = null, last_login_at = now() where admins.id = a.id;
  return query select a.id, a.totp_enabled;
end $$;

create or replace function open_admin_session(p_admin uuid, p_token_hash text, p_user_agent text, p_ip text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into admin_sessions (admin_id, token_hash, user_agent, ip)
  values (p_admin, p_token_hash, left(p_user_agent, 300), left(p_ip, 64))
  returning admin_sessions.id into v_id;
  return v_id;
end $$;

-- 세션 조회(12시간 만료). 활성이면 (admin_id, mfa_ok).
create or replace function touch_admin_session(p_token_hash text, p_max_age interval default interval '12 hours')
returns table(admin_id uuid, mfa_ok boolean)
language plpgsql as $$
declare s admin_sessions%rowtype;
begin
  select * into s from admin_sessions where token_hash = p_token_hash;
  if not found or s.revoked_at is not null then return; end if;
  if s.created_at < now() - p_max_age then
    update admin_sessions set revoked_at = now(), revoke_reason = 'expired' where admin_sessions.id = s.id;
    return;
  end if;
  if s.last_seen_at < now() - interval '1 minute' then
    update admin_sessions set last_seen_at = now() where admin_sessions.id = s.id;
  end if;
  return query select s.admin_id, s.mfa_ok;
end $$;

create or replace function mark_admin_session_mfa(p_token_hash text)
returns void language sql as $$
  update admin_sessions set mfa_ok = true where token_hash = p_token_hash and revoked_at is null;
$$;

create or replace function close_admin_session(p_token_hash text)
returns void language sql as $$
  update admin_sessions set revoked_at = now(), revoke_reason = 'logout' where token_hash = p_token_hash and revoked_at is null;
$$;

-- 관리자 추가(슈퍼관리자가 호출). 임시 비밀번호는 호출 측에서 전달. 2FA 는 첫 로그인 때 등록.
create or replace function create_admin(p_email text, p_name text, p_password text, p_role text, p_by uuid)
returns uuid language plpgsql as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_INVALID'; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  if exists (select 1 from admins where email = v_email) then raise exception 'EMAIL_TAKEN'; end if;
  insert into admins (email, display_name, password_hash, role, created_by)
  values (v_email, trim(p_name), extensions.crypt(p_password, extensions.gen_salt('bf')), p_role, p_by)
  returning id into v_id;
  return v_id;
end $$;

create or replace function change_admin_password(p_admin uuid, p_current text, p_new text)
returns void language plpgsql as $$
declare v_hash text;
begin
  select password_hash into v_hash from admins where id = p_admin;
  if v_hash is null then raise exception 'NOT_FOUND'; end if;
  if v_hash <> extensions.crypt(p_current, v_hash) then raise exception 'CURRENT_PASSWORD_WRONG'; end if;
  if length(coalesce(p_new, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  update admins set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = p_admin;
end $$;

grant all on table admins, admin_sessions to service_role;
grant execute on function admin_login(text, text), open_admin_session(uuid, text, text, text), touch_admin_session(text, interval),
  mark_admin_session_mfa(text), close_admin_session(text), create_admin(text, text, text, text, uuid), change_admin_password(uuid, text, text) to service_role;

-- 초기 슈퍼관리자(로컬 개발용). 운영 배포 전 비밀번호 변경 필수.
insert into admins (email, display_name, password_hash, role)
values ('admin@fortuna.demo', '운영자', extensions.crypt('admin1234', extensions.gen_salt('bf')), 'super')
on conflict (email) do nothing;

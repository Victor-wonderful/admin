-- 0044_member_password_reset.sql — 회원 비밀번호 찾기(이메일 링크 · 30분 · 1회용)
-- 관리자용(0043)과 같은 구조. 완료 시 회원의 활성 세션을 전부 끊는다(revoke_reason='password_reset').
-- Fortuna 앱 계정 비밀번호 동기화는 앱 서버 액션에서 수행(DB 는 포털 해시만 갱신).

create table if not exists member_password_resets (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  token_hash  text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists member_password_resets_member_idx on member_password_resets(member_id, created_at desc);

-- 요청. 이메일이 등록된 회원(비밀번호 있는)이면 토큰을 저장하고 (member_id, email, display_name) 반환, 아니면 빈 결과.
-- 같은 계정에 1시간 내 3회를 넘기면 'RATE_LIMITED'.
create or replace function request_member_password_reset(p_email text, p_token_hash text, p_ip text)
returns table(member_id uuid, email text, display_name text)
language plpgsql as $$
declare m members%rowtype; v_recent integer;
begin
  select * into m from members where lower(members.email) = lower(trim(p_email)) and members.password_hash is not null;
  if not found then return; end if;
  select count(*) into v_recent from member_password_resets r
   where r.member_id = m.id and r.created_at > now() - interval '1 hour';
  if v_recent >= 3 then raise exception 'RATE_LIMITED'; end if;
  insert into member_password_resets (member_id, token_hash, expires_at, ip)
  values (m.id, p_token_hash, now() + interval '30 minutes', left(coalesce(p_ip, ''), 64));
  return query select m.id, m.email, m.display_name;
end $$;

-- 토큰 상태 확인(재설정 페이지 렌더용). 유효하면 (member_id, email).
create or replace function check_member_password_reset(p_token_hash text)
returns table(member_id uuid, email text)
language sql stable as $$
  select r.member_id, m.email
    from member_password_resets r join members m on m.id = r.member_id
   where r.token_hash = p_token_hash and r.used_at is null and r.expires_at > now();
$$;

-- 완료. 토큰 검증 → 비밀번호 변경 → 같은 회원의 미사용 토큰 소진 → 세션 전부 끊기.
-- 반환: (member_id, email, display_name) — 앱이 Fortuna 계정 동기화에 사용.
-- 예외: TOKEN_INVALID / TOKEN_USED / TOKEN_EXPIRED / PASSWORD_TOO_SHORT
create or replace function complete_member_password_reset(p_token_hash text, p_new text)
returns table(member_id uuid, email text, display_name text)
language plpgsql as $$
declare r member_password_resets%rowtype; m members%rowtype;
begin
  select * into r from member_password_resets where token_hash = p_token_hash;
  if not found then raise exception 'TOKEN_INVALID'; end if;
  if r.used_at is not null then raise exception 'TOKEN_USED'; end if;
  if r.expires_at <= now() then raise exception 'TOKEN_EXPIRED'; end if;
  if length(coalesce(p_new, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  select * into m from members where id = r.member_id;
  if not found then raise exception 'TOKEN_INVALID'; end if;
  update members set password_hash = extensions.crypt(p_new, extensions.gen_salt('bf')) where id = m.id;
  update member_password_resets set used_at = now()
   where member_password_resets.member_id = m.id and used_at is null;
  update member_sessions set revoked_at = now(), revoke_reason = 'password_reset'
   where member_sessions.member_id = m.id and revoked_at is null;
  return query select m.id, m.email, m.display_name;
end $$;

grant all on table member_password_resets to service_role;
grant execute on function request_member_password_reset(text, text, text), check_member_password_reset(text),
  complete_member_password_reset(text, text) to service_role;

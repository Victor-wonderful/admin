-- 0027. 서버 세션 테이블 + 1기기 제한.
-- 쿠키에는 무작위 토큰만 두고, 서버는 토큰 해시로 세션을 찾는다(회원 id 를 쿠키에 직접 넣던 방식 폐기).
-- 로그인 시 같은 회원의 다른 활성 세션을 모두 폐기 → 한 계정은 한 기기에서만 사용 가능.

create table if not exists member_sessions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  token_hash   text not null unique,          -- sha256(hex) of cookie token
  user_agent   text,
  ip           text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at   timestamptz,
  revoke_reason text                          -- 'logout' | 'other_device' | 'expired' | 'admin'
);
create index if not exists member_sessions_member_idx on member_sessions(member_id, created_at desc);
create index if not exists member_sessions_active_idx on member_sessions(member_id) where revoked_at is null;

grant all on table member_sessions to anon, authenticated, service_role;

-- 로그인: 새 세션 생성 + 같은 회원의 다른 활성 세션 폐기(other_device). 새 세션 id 반환.
create or replace function open_member_session(p_member uuid, p_token_hash text, p_user_agent text, p_ip text)
returns uuid
language plpgsql as $$
declare v_id uuid;
begin
  update member_sessions
     set revoked_at = now(), revoke_reason = 'other_device'
   where member_id = p_member and revoked_at is null;

  insert into member_sessions (member_id, token_hash, user_agent, ip)
  values (p_member, p_token_hash, left(p_user_agent, 300), left(p_ip, 64))
  returning id into v_id;
  return v_id;
end $$;

-- 세션 조회: 활성 세션이면 회원 id 와 함께 마지막 접속 시각 갱신(1분 단위로만 갱신해 쓰기 줄임).
create or replace function touch_member_session(p_token_hash text, p_max_age interval default interval '7 days')
returns table(member_id uuid, revoke_reason text)
language plpgsql as $$
declare s member_sessions%rowtype;
begin
  select * into s from member_sessions where token_hash = p_token_hash;
  if not found then return; end if;

  if s.revoked_at is null and s.created_at < now() - p_max_age then
    update member_sessions set revoked_at = now(), revoke_reason = 'expired' where id = s.id;
    s.revoked_at := now(); s.revoke_reason := 'expired';
  end if;

  if s.revoked_at is not null then
    return query select null::uuid, s.revoke_reason;
    return;
  end if;

  if s.last_seen_at < now() - interval '1 minute' then
    update member_sessions set last_seen_at = now() where id = s.id;
  end if;
  return query select s.member_id, null::text;
end $$;

-- 로그아웃: 해당 세션만 폐기.
create or replace function close_member_session(p_token_hash text)
returns void
language sql as $$
  update member_sessions set revoked_at = now(), revoke_reason = 'logout'
   where token_hash = p_token_hash and revoked_at is null;
$$;

-- 0024. Fortuna 제품 앱(Supabase Auth) 계정 연결.
-- 포털 회원가입/로그인/비밀번호 변경 시 Fortuna 쪽 auth.users 에 같은 이메일·비밀번호로 계정을 동기화하고 그 id 를 기록한다.

alter table members add column if not exists fortuna_user_id uuid;
create unique index if not exists members_fortuna_user_id_key on members(fortuna_user_id) where fortuna_user_id is not null;

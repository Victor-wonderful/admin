-- 0004_grants.sql — PostgREST 역할에 public 스키마 접근 권한 부여.
-- (이번 로컬 CLI 버전이 자동 grant 를 적용하지 않아 명시적으로 부여)
-- 프로토타입: service_role 키로만 서버에서 접근. TODO: 프로덕션 전 RLS 설계.

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

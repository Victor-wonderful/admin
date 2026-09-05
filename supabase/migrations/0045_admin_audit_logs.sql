-- 0045_admin_audit_logs.sql — 관리자 감사 로그
-- 관리자 콘솔에서 일어나는 행위를 한 줄씩 기록한다(앱 서버 액션에서 insert). DB 함수는 없음.
--  category: auth(인증) · permission(권한) · settlement(정산) · finance(자금) · member(회원) · catalog(상품·수당체계)
--  action  : 코드(예 login_failed, withdrawal_approve) — 화면에서 한글 라벨로 변환
--  risk    : 위험 액션(출금 승인·지급 실행·권한 변경 등) 플래그 — KPI 집계용
--  admin_* : 행위 시점 스냅샷(관리자 삭제·이름 변경 후에도 기록 유지). 로그인 실패는 admin_id null + 시도한 이메일

create table if not exists admin_audit_logs (
  id           bigserial primary key,
  at           timestamptz not null default now(),
  admin_id     uuid references admins(id) on delete set null,
  admin_name   text,
  admin_email  text,
  category     text not null check (category in ('auth','permission','settlement','finance','member','catalog')),
  action       text not null,
  target       text,
  target_id    text,
  ok           boolean not null default true,
  risk         boolean not null default false,
  ip           text,
  user_agent   text,
  meta         jsonb
);
create index if not exists admin_audit_logs_at_idx on admin_audit_logs(at desc);
create index if not exists admin_audit_logs_cat_idx on admin_audit_logs(category, at desc);
create index if not exists admin_audit_logs_admin_idx on admin_audit_logs(admin_id, at desc);

grant all on table admin_audit_logs to service_role;
grant usage, select on sequence admin_audit_logs_id_seq to service_role;

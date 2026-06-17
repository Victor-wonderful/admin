-- 0006_finance.sql — 결제·온체인 자금 레이어 (지갑/트랜잭션/출금/정산).
-- 프로토타입: service_role 서버 전용 접근. TODO: 프로덕션 전 RLS.

-- 회원 통합 지갑 (충전 + 수당 적립으로 채우고, 구독 결제 + 출금에 사용)
create table if not exists wallets (
  member_id uuid primary key references members(id) on delete cascade,
  balance_usd numeric(14, 2) not null default 0,
  deposit_address text not null,
  network text not null default 'TRC20',
  updated_at timestamptz not null default now()
);

-- 시스템 지갑 (운영 지갑 + 매출 배분 풀)
create table if not exists system_wallets (
  kind text primary key, -- operating | pool_commission | pool_company | pool_equity | pool_reserve
  label text not null,
  balance_usd numeric(14, 2) not null default 0,
  network text
);

-- 온체인 통합 원장 (입금/출금/결제/수당)
create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  tx_type text not null, -- deposit | withdrawal | payment | commission
  amount_usd numeric(14, 2) not null,
  fee_usd numeric(10, 2) not null default 0,
  network text,
  tx_hash text,
  status text not null default 'completed', -- completed | pending | sending | failed
  created_at timestamptz not null default now()
);

-- 출금 신청/승인 큐 (마케터 수당 온체인 송금)
create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  amount_usd numeric(14, 2) not null,
  fee_usd numeric(10, 2) not null default 1,
  to_address text not null,
  network text not null default 'TRC20',
  status text not null default 'pending', -- pending | approved | sending | completed | rejected
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  tx_hash text
);

-- 수당 정산 (사이클별 마케터 수당)
create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  cycle text not null, -- 'YYYY-MM'
  member_id uuid not null references members(id) on delete cascade,
  level_amount numeric(12, 2) not null default 0,
  rank_amount numeric(12, 2) not null default 0,
  share_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  status text not null default 'calculated', -- calculated | confirmed | paid | held
  created_at timestamptz not null default now(),
  unique (cycle, member_id)
);

create index if not exists idx_wtx_member on wallet_transactions (member_id);
create index if not exists idx_wtx_type_created on wallet_transactions (tx_type, created_at desc);
create index if not exists idx_wd_status on withdrawals (status, requested_at desc);
create index if not exists idx_settle_cycle on settlements (cycle, member_id);

-- 명시적 grant (0004 의 default privileges 로도 부여되나 안전하게 재부여)
grant all on table wallets, system_wallets, wallet_transactions, withdrawals, settlements
  to anon, authenticated, service_role;

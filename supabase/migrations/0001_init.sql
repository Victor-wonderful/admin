-- 0001_init.sql — 플랫폼 도메인 스키마 (회원·코드·상품·결제)
-- 3단계 회원 구조: registered -> subscriber -> marketer

create type member_role as enum ('registered', 'subscriber', 'marketer');

create table members (
  id              uuid primary key default gen_random_uuid(),
  display_name    text not null,
  email           text unique,
  role            member_role not null default 'registered',
  -- 두 개의 독립적인 부모 끈
  recommender_id  uuid references members(id) on delete set null, -- 직접추천(Unilevel): 수당 귀속(마케터만)
  parent_id       uuid references members(id) on delete set null, -- 후원(Placement): 조직 배치 위치
  joined_at       timestamptz not null default now(),
  is_active_subscriber boolean not null default false,            -- 파생값(직접 편집 금지, refresh 함수로만 갱신)
  created_at      timestamptz not null default now()
);
create index members_recommender_idx on members(recommender_id);
create index members_parent_idx      on members(parent_id);
create index members_active_idx      on members(is_active_subscriber);

-- R2. 1인 다중코드 제한(공코드): 마케터 1명당 활성 레퍼럴 코드 1개
create table referral_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  owner_id   uuid not null references members(id) on delete cascade,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index one_active_code_per_owner
  on referral_codes(owner_id) where is_active;

-- 3. 상품 확장 추상화 (봇 구독 / 연회비 / 코인비자 / 거래소 수수료 분배 ...)
create table products (
  id        uuid primary key default gen_random_uuid(),
  code      text unique not null,    -- 'bot_sub' | 'annual_fee' | 'coin_visa' | 'exchange_fee_share'
  name      text not null,
  price_usd numeric(10,2),
  billing   text not null            -- 'monthly' | 'yearly' | 'event'
);

-- $120/월 구독 원장 — is_active_subscriber 의 출처(source of truth)
create table subscriptions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  product_id   uuid references products(id),
  amount_usd   numeric(10,2) not null default 120.00,
  period_start date not null,
  period_end   date not null,
  paid_at      timestamptz not null default now(),
  status       text not null default 'active',  -- 'active' | 'expired'
  created_at   timestamptz not null default now()
);
create index subs_member_period_idx on subscriptions(member_id, period_end);

-- 마케터 연회비 $200/년
create table annual_memberships (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references members(id) on delete cascade,
  amount_usd   numeric(10,2) not null default 200.00,
  period_start date not null,
  period_end   date not null,
  paid_at      timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- 3. 상품 확장형 수익 이벤트(추후 수당 산정 입력)
create table revenue_events (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references members(id) on delete cascade,
  product_id  uuid not null references products(id),
  amount_usd  numeric(12,2) not null,
  occurred_at timestamptz not null default now()
);

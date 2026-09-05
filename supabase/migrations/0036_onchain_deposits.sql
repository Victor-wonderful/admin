-- 0036_onchain_deposits.sql — 온체인 입금 감지 원장 + 스캔 커서 + 회원 매칭/잔액 반영
-- 결정(2026-09-04): 회사 입금 주소(Tron TRC20 / BSC BEP20) 1개씩 공개 → 서버가 TronGrid/BscScan 으로 USDT 입금을 조회
--   → 보낸 주소(from)가 회원이 프로필에 등록한 지갑 주소와 일치하면 자동으로 내 지갑 잔액 반영
--   → 일치하지 않으면 '미확인'으로 남기고 관리자가 수동 매칭(회원 지정) 또는 무시.
-- 잔액 반영은 항상 credit_onchain_deposit 하나를 통해서만(중복 반영 방지: tx_hash unique + status 검사).

create table if not exists onchain_deposits (
  id            uuid primary key default gen_random_uuid(),
  network       text not null check (network in ('TRC20','BEP20')),
  tx_hash       text not null,
  from_address  text not null,
  to_address    text not null,
  amount_usd    numeric(18,6) not null check (amount_usd > 0),
  block_time    timestamptz not null,
  member_id     uuid references members(id) on delete set null,
  status        text not null default 'unmatched' check (status in ('unmatched','credited','ignored')),
  wallet_tx_id  uuid references wallet_transactions(id) on delete set null,
  detected_at   timestamptz not null default now(),
  credited_at   timestamptz,
  note          text,
  unique (network, tx_hash)
);
create index if not exists idx_onchain_deposits_status on onchain_deposits(status, block_time desc);
create index if not exists idx_onchain_deposits_member on onchain_deposits(member_id);

-- 네트워크별 스캔 커서(마지막으로 본 블록 시각·블록 번호). 재시작해도 이어서 조회.
create table if not exists deposit_scan_state (
  network        text primary key check (network in ('TRC20','BEP20')),
  last_block_time timestamptz,
  last_block      bigint,
  last_run_at     timestamptz,
  last_error      text,
  seen_count      integer not null default 0
);

-- 보낸 주소로 회원 찾기. BEP20(0x…)은 대소문자 무시, TRC20(T…)은 대소문자 구분(base58).
create or replace function find_member_by_payout_address(p_network text, p_address text)
returns uuid language sql stable as $$
  select id from members
  where case
    when p_network = 'TRC20' then payout_address_trc20 = p_address
    when p_network = 'BEP20' then lower(payout_address_bep20) = lower(p_address)
    else false end
  limit 1;
$$;

-- 감지된 입금 등록(멱등). 이미 있으면 기존 id 반환. 회원 자동 매칭까지 시도(잔액 반영은 하지 않음).
create or replace function upsert_onchain_deposit(
  p_network text, p_tx_hash text, p_from text, p_to text, p_amount numeric, p_block_time timestamptz
) returns uuid language plpgsql as $$
declare v_id uuid; v_member uuid;
begin
  select id into v_id from onchain_deposits where network = p_network and tx_hash = p_tx_hash;
  if v_id is not null then return v_id; end if;
  v_member := find_member_by_payout_address(p_network, p_from);
  insert into onchain_deposits(network, tx_hash, from_address, to_address, amount_usd, block_time, member_id)
  values (p_network, p_tx_hash, p_from, p_to, p_amount, p_block_time, v_member)
  returning id into v_id;
  return v_id;
end $$;

-- 잔액 반영. p_member 가 null 이면 자동 매칭된 회원(member_id)을 쓴다. 이미 반영/무시된 건은 무동작(멱등).
create or replace function credit_onchain_deposit(p_id uuid, p_member uuid default null)
returns text language plpgsql as $$
declare v_status text; v_member uuid; v_amount numeric; v_network text; v_hash text; v_tx uuid;
begin
  select status, coalesce(p_member, member_id), amount_usd, network, tx_hash
    into v_status, v_member, v_amount, v_network, v_hash
  from onchain_deposits where id = p_id for update;
  if v_status is null then raise exception '입금 건을 찾을 수 없습니다 (id=%)', p_id; end if;
  if v_status = 'credited' then return 'already'; end if;
  if v_member is null then raise exception '반영할 회원이 지정되지 않았습니다'; end if;
  if not exists (select 1 from members where id = v_member) then raise exception '회원을 찾을 수 없습니다'; end if;

  perform ensure_wallet(v_member);
  update wallets set balance_usd = balance_usd + v_amount, updated_at = now() where member_id = v_member;
  insert into wallet_transactions(member_id, tx_type, amount_usd, network, tx_hash, status)
    values (v_member, 'deposit', v_amount, v_network, v_hash, 'completed')
    returning id into v_tx;
  update onchain_deposits
    set status = 'credited', member_id = v_member, wallet_tx_id = v_tx, credited_at = now()
    where id = p_id;
  return 'credited';
end $$;

-- 회사 자금 이동 등 회원 입금이 아닌 건은 무시 처리(잔액 영향 없음). 반영된 건은 무시할 수 없다.
create or replace function ignore_onchain_deposit(p_id uuid, p_note text default null)
returns text language plpgsql as $$
declare v_status text;
begin
  select status into v_status from onchain_deposits where id = p_id for update;
  if v_status is null then raise exception '입금 건을 찾을 수 없습니다 (id=%)', p_id; end if;
  if v_status = 'credited' then raise exception '이미 잔액에 반영된 입금은 무시할 수 없습니다'; end if;
  update onchain_deposits set status = 'ignored', note = coalesce(p_note, note) where id = p_id;
  return 'ignored';
end $$;

grant execute on function find_member_by_payout_address(text, text), upsert_onchain_deposit(text, text, text, text, numeric, timestamptz),
  credit_onchain_deposit(uuid, uuid), ignore_onchain_deposit(uuid, text) to service_role;

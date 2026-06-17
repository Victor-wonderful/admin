-- finance-seed.sql — 0006 자금 테이블 파생 시드 (기존 members/subscriptions 기반). 멱등(재실행 가능).

truncate wallet_transactions, withdrawals, settlements, wallets, system_wallets cascade;

-- 시스템 지갑: 운영 지갑 + 매출 배분 풀 (합계 = 운영 잔액 128,400)
insert into system_wallets(kind, label, balance_usd, network) values
  ('operating', '운영 지갑', 128400, 'TRC20'),
  ('pool_commission', '수당 풀', 77040, null),
  ('pool_company', '회사 수익', 25680, null),
  ('pool_equity', '지분자 배당', 12840, null),
  ('pool_reserve', '예비비', 12840, null);

-- 회원 통합 지갑: 마케터=수당 누적 잔액, 구독회원=소액 충전 잔액
insert into wallets(member_id, balance_usd, deposit_address, network)
select id,
  case when role = 'marketer' then round((random() * 45000 + 500)::numeric, 2)
       else round((random() * 600)::numeric, 2) end,
  'TR' || substr(md5(id::text), 1, 8) || '…' || substr(md5(id::text), 28, 4),
  'TRC20'
from members
where role in ('marketer', 'subscriber');

-- 결제 트랜잭션 = 구독 결제 (잔액 차감)
insert into wallet_transactions(member_id, tx_type, amount_usd, network, tx_hash, status, created_at)
select member_id, 'payment', amount_usd, 'TRC20', 'TX' || substr(md5(id::text), 1, 8), 'completed', paid_at
from subscriptions
order by paid_at desc
limit 400;

-- 입금(충전) 트랜잭션 = 마케터 일부
insert into wallet_transactions(member_id, tx_type, amount_usd, network, tx_hash, status, created_at)
select id, 'deposit', 500, 'TRC20', 'TX' || substr(md5(id::text || 'd'), 1, 8), 'completed',
  now() - (random() * interval '20 days')
from members
where role = 'marketer'
limit 120;

-- 출금 신청/승인 큐 = 마케터 일부
insert into withdrawals(member_id, amount_usd, fee_usd, to_address, network, status, requested_at, processed_at, tx_hash)
select id,
  round((random() * 9000 + 1000)::numeric, 2), 1,
  'TX' || substr(md5(id::text), 1, 8) || '…' || substr(md5(id::text), 28, 4),
  'TRC20',
  st,
  now() - (random() * interval '10 days'),
  case when st in ('completed', 'sending') then now() - (random() * interval '5 days') else null end,
  case when st = 'completed' then 'TX' || substr(md5(id::text || 'w'), 1, 10) else null end
from (
  select id, (array['pending', 'approved', 'sending', 'completed', 'rejected'])[1 + floor(random() * 5)::int] st
  from members where role = 'marketer' order by md5(id::text) limit 40
) m;

-- 수당 정산 = 현재 사이클(2026-06) 마케터
insert into settlements(cycle, member_id, level_amount, rank_amount, share_amount, total_amount, status)
select '2026-06', id, x.l, x.r, x.s, x.l + x.r + x.s,
  (array['calculated', 'confirmed', 'paid', 'held'])[1 + floor(random() * 4)::int]
from members
cross join lateral (
  select round((random() * 2000)::numeric, 2) l,
         round((random() * 2500)::numeric, 2) r,
         round((random() * 900)::numeric, 2) s
) x
where role = 'marketer';

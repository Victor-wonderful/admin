-- reset_fresh.sql — 로컬 개발 DB를 "처음 시작" 상태로 초기화 (롤플레이·수동 테스트용)
--   유지: 규칙·설정 테이블(products, ranks, comp_settings, system_wallets), 본사 파트너 계정 marketer@fortuna.demo (id 고정, 로그인 세션 유지)
--   삭제: 그 외 모든 회원과 회원 파생 데이터(구독·멤버십·지갑·거래·정산·출금·입금·초대 코드·세션·후원 트리)
--   실행: npm run db:fresh   (되돌리려면 supabase db reset — seed.sql 로 데모 데이터 재생성)
-- 시드 전체를 되살리고 싶으면 `supabase db reset` 을 쓴다. 이 스크립트는 되돌릴 수 없다.

begin;

\set root '''aaaaaaaa-0000-0000-0000-000000000000'''

-- 1) 회원 파생 데이터 — 본사 계정 것 포함 전부 삭제(본사도 깨끗한 상태로 다시 세팅)
delete from onchain_deposits;
delete from deposit_scan_state;
delete from commission_payouts;
delete from revenue_allocations;
delete from revenue_events;
delete from settlements;
delete from withdrawals;
delete from wallet_transactions;
delete from product_purchases;
delete from annual_memberships;
delete from subscriptions;
delete from member_sessions where member_id <> :root;      -- 본사 로그인 세션은 유지
delete from referral_codes where owner_id <> :root;        -- 본사 초대 코드는 유지
delete from placement_closure where ancestor_id <> :root or descendant_id <> :root;

-- 2) 회원 삭제(본사 제외). 본사를 가리키는 추천·후원 참조가 남지 않도록 먼저 끊는다.
update members set recommender_id = null, parent_id = null where id <> :root;
delete from members where id <> :root;
delete from wallets where member_id <> :root;

-- 2-b) 운영 지갑·배분 풀 잔액도 0 (시드 금액 제거)
update system_wallets set balance_usd = 0;

-- 3) 본사 파트너 계정 초기화
update members
set display_name = '포르투나 본사', role = 'marketer', recommender_id = null, parent_id = null,
    is_active_subscriber = true, placement_slot = null, placed_at = null, placed_by = null,
    placement_locked = false, placement_note = null, auto_renew = true,
    payout_address_trc20 = null, payout_address_bep20 = null
where id = :root;
insert into placement_closure(ancestor_id, descendant_id, depth)
select :root, :root, 0 where not exists (select 1 from placement_closure where ancestor_id = :root and descendant_id = :root);
select ensure_wallet(:root);
update wallets set balance_usd = 0, updated_at = now() where member_id = :root;
-- 오늘부터 구독 30일 + 파트너 멤버십 1년 (결제 이력 없이 상태만)
insert into subscriptions(member_id, amount_usd, period_start, period_end, paid_at, status)
values (:root, 0, current_date, current_date + 30, now(), 'active');
insert into annual_memberships(member_id, amount_usd, period_start, period_end, paid_at)
values (:root, 0, current_date, current_date + 365, now());
select ensure_referral_code(:root);
select refresh_active_subscribers(current_date);

commit;

\pset format unaligned
select '회원' as t, count(*) from members
union all select '초대 코드(본사)', count(*) from referral_codes
union all select '구독', count(*) from subscriptions
union all select '지갑', count(*) from wallets
union all select '정산', count(*) from settlements
union all select '거래', count(*) from wallet_transactions;
select '본사 초대 코드: ' || code from referral_codes where owner_id = :root and is_active;

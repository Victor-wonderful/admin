-- share_commission_verify.sql — 공유수당(override) "휴면 아닌 정상" 증명 (실데이터·실임계치)
-- 실행: npm run test:share
--
-- 배경: 현재 시드에서 share_total=$0. 원인은 버그가 아니라 '자격 미달':
--   유일한 R3(override 보유) 마케터 = 루트 M0 인데, M0 가 본인 월구독을 안 내
--   is_active_subscriber=false → is_qualified_marketer=false → _rank 에서 제외.
-- 증명: M0 에게 활성 구독 1건만 부여(=자격 충족)하면, 실임계치(rank3=총활성600) 그대로
--   M0 가 R3 자격자가 되어 공유수당이 override(4%) × M0 후원 산하 볼륨 으로 정확히 산정된다.
-- BEGIN…ROLLBACK — 실제 시드 무손상. 임계치 변경 없음(실값 그대로).

\set ON_ERROR_STOP on
begin;

create temp table _fail (label text, got numeric, want numeric) on commit drop;
create function pg_temp.chk(p_label text, p_got numeric, p_want numeric) returns void
language plpgsql as $f$
begin
  if abs(coalesce(p_got, -999999) - p_want) <= 0.02 then
    raise notice 'PASS  % : %', rpad(p_label,26), p_got;
  else
    insert into _fail values (p_label, p_got, p_want);
    raise warning 'FAIL  % : %  (기대 %)  <<<', rpad(p_label,26), p_got, p_want;
  end if;
end;
$f$;

-- baseline 강제(롤백됨): M0 의 활성 구독을 만료 + 플래그 false 로 '비자격' 상태 — 커밋 상태와 무관하게 성립.
update subscriptions set period_end = date '2020-01-01'
where member_id = 'aaaaaaaa-0000-0000-0000-000000000000' and status = 'active';
update members set is_active_subscriber = false
where id = 'aaaaaaaa-0000-0000-0000-000000000000';

do $$
declare
  M0 uuid := 'aaaaaaaa-0000-0000-0000-000000000000';
  v_rank0 int; v_qual0 boolean;
  v_share_before numeric;
  v_expected_vol numeric; v_override numeric; v_expected_share numeric;
  v_rank1 int; v_qual1 boolean;
  v_share_after numeric; v_m0_share numeric;
begin
  -- 사전: M0 는 R3(카운트) 이지만 비자격
  select er.rank into v_rank0 from evaluate_rank(M0) er;
  v_qual0 := is_qualified_marketer(M0);
  raise notice '──── 사전 상태(M0) ────';
  perform pg_temp.chk('M0 카운트 직급', v_rank0, 3);
  perform pg_temp.chk('M0 자격(0=비자격)', case when v_qual0 then 1 else 0 end, 0);

  -- 현재 산정에서 share 합
  perform run_settlement('2026-06','2026-06-15');
  select coalesce(sum(share_amount),0) into v_share_before from settlements where cycle='2026-06';
  perform pg_temp.chk('현재 share_total($0)', v_share_before, 0);

  -- 기대값 선계산: M0 의 override 와 후원 산하 볼륨(=run_settlement 가 쓰는 V 정의)
  select er.rate_pct into v_override from evaluate_rank(M0) er;  -- R3 rate (참고)
  select rr.override_rate into v_override from ranks rr where rr.rank = 3;  -- override 4%
  -- M0 자격 시 산하 볼륨 합 (refresh 후 활성 기준). M0 구독 추가는 산하에 영향 없음.
  perform refresh_active_subscribers('2026-06-15');
  select coalesce(sum(
           (case when d.is_active_subscriber then 120 else 0 end)
         + (case when exists(select 1 from annual_memberships a
                  where a.member_id=d.id and date '2026-06-15' between a.period_start and a.period_end)
              then 200 else 0 end)), 0)
    into v_expected_vol
  from placement_closure pc join members d on d.id = pc.descendant_id
  where pc.ancestor_id = M0 and pc.depth >= 1;
  v_expected_share := round(v_override/100.0 * v_expected_vol, 2);
  raise notice '──── 기대 share (override 4%% × 산하볼륨) ────';
  raise notice 'override=%, 산하볼륨=%, 기대 M0 share=%', v_override, v_expected_vol, v_expected_share;

  -- 조치: M0 에게 활성 구독 1건 부여 → 자격 충족
  insert into subscriptions(member_id, amount_usd, period_start, period_end, paid_at, status)
  values (M0, 120, date '2026-06-01', date '2026-06-30', timestamptz '2026-06-10 00:00:00+00', 'active');

  select er.rank into v_rank1 from evaluate_rank(M0) er;
  v_qual1 := is_qualified_marketer(M0, '2026-06-15');
  raise notice '──── 구독 부여 후(M0) ────';
  perform pg_temp.chk('M0 직급(여전히 R3)', v_rank1, 3);
  perform pg_temp.chk('M0 자격(1=자격)', case when v_qual1 then 1 else 0 end, 1);

  -- 재산정 → share 발생 확인
  perform run_settlement('2026-06','2026-06-15');
  select coalesce(sum(share_amount),0) into v_share_after from settlements where cycle='2026-06';
  select coalesce(share_amount,0) into v_m0_share from settlements where cycle='2026-06' and member_id=M0;

  raise notice '──── 재산정 후 share ────';
  perform pg_temp.chk('share_total > 0', case when v_share_after > 0 then 1 else 0 end, 1);
  perform pg_temp.chk('M0 share = 4%%×산하볼륨', v_m0_share, v_expected_share);
  perform pg_temp.chk('share_total = M0 share', v_share_after, v_m0_share);
end;
$$;

do $$
declare n int;
begin
  select count(*) into n from _fail;
  if n = 0 then raise notice '✅ ALL PASS — 공유수당은 정상(휴면). M0 자격 충족 즉시 override 정확 산정';
  else raise exception '❌ % 건 FAIL', n; end if;
end;
$$;

rollback;

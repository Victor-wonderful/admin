-- 0014_member_ranks.sql — 마케터 직급 일괄 조회
-- evaluate_rank 는 회원 1명씩만 산정 → 회원 리스트/정산 화면에서 N+1 방지용 배치 함수.
-- 마케터만 대상(등록/구독회원은 직급 개념 없음). rank=0 은 '무직급'(자격 미달).

create or replace function member_ranks()
returns table(member_id uuid, rank int, label text)
language sql stable as $$
  select m.id, er.rank,
    case when er.rank > 0 then r.label else null end
  from members m
  cross join lateral evaluate_rank(m.id) er
  left join ranks r on r.rank = er.rank
  where m.role = 'marketer';
$$;

grant execute on function member_ranks() to anon, authenticated, service_role;

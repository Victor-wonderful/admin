-- legs.sql — 대실적/기타소실적 수동 검증용 참조 쿼리
-- 사용: psql "$DB_URL" -v m_id="'<marketer-uuid>'" -f supabase/sql/legs.sql
-- 또는 Studio SQL 에디터에서 :m_id 를 실제 uuid 로 치환.

-- 루트 마케터 id (시드는 인덱스 0 = aaaaaaaa-0000-0000-0000-000000000000)
\set m_id '\'aaaaaaaa-0000-0000-0000-000000000000\''

-- (a) 레그별 활성 구독자 수
select * from get_marketer_legs(:m_id) order by active_count desc;

-- (b) 대실적 / 기타소실적 / 총활성 / 레그수
select * from get_major_minor(:m_id);

-- (c) 대실적 라인 최하단 노드(스필오버 대상)
select lowest_node_of_major_leg(:m_id) as spillover_target;

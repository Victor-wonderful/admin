# MLM 보상 시스템 어드민 (프로토타입)

AI 트레이딩 봇 구독 기반 네트워크 마케팅의 **운영자 어드민 + 마케터 대시보드**.
직접추천(Unilevel)/후원(Placement) 두 계보도와 대실적·기타소실적 집계를 목/시드 데이터로 검증.

스택: **Next.js 16 (App Router) · Supabase(Postgres) 로컬 · Tailwind 4 · shadcn/ui · react-d3-tree**

## 실행

```bash
# 1) Supabase 로컬 스택 (Docker 필요). 포트는 553xx 로 리매핑됨.
npx supabase start

# 2) 스키마 + 시드 적용 (재현 가능)
npx supabase db reset

# 3) 개발 서버
npm run dev            # http://localhost:3000
```

- 환경변수: `.env.local` (로컬 Supabase URL + service-role 키). **service-role 키는 서버 전용** — `lib/supabase/server.ts` 에서만 사용. TODO: 프로덕션 전 RLS 전환.
- Supabase Studio: `npx supabase status` 의 STUDIO_URL.

## 화면

- `/marketer` — 요약 카드(대실적/기타소실적/총활성/직급), 사이드바의 "현재 마케터(목)" 셀렉터로 시점 전환
- `/marketer/genealogy` — [직접추천] 들여쓰기 트리 / [후원] react-d3-tree 조직도 (● 활성 / ○ 비활성)
- `/marketer/referral` — 마케터 1인 1코드 (R2)
- `/admin/members` — 3단계 회원 목록·필터, **월 만료 실행(데모)** 버튼
- `/admin/members/[id]` — 두 업라인, 구독 원장, 레그 분해, **직급 자격**, **스필오버 배치** 액션
- `/admin/ranks` — **수당체계/직급표**(직접추천수당·직급요율·차등배분 + 9등급 조건)
- `/admin/org` — 전체 후원 조직도, `/admin/products` — 상품(확장 추상화)

## 핵심 도메인 규칙

- 3단계: `registered → subscriber($120/월) → marketer(+연회비 $200)`
- 두 끈: `recommender_id`(수당 귀속, 마케터만 — R1) / `parent_id`(조직 배치, 스필오버)
- 보상: 대실적 = `MAX(leg active)`, 기타소실적 = `SUM(all) − MAX` (바이너리 아님, 라인 무제한)
- 카운팅: `is_active_subscriber = TRUE`(당월 구독 유지자)만. 월별 갱신 = `refresh_active_subscribers()`

## 수당체계 (직급 산정 — 금액 정산은 기준금 확정 후)

- 수당 3종: ① 직접추천수당(1대 25%/2대 9%) ② 직급수당(요율 5~53%, **차액차단**) ③ 직급 차등 누적배분(3~9직급, 중복수령)
- 직급 9등급. 기준 = 후원계보 포함 전체 활성 구독유저수. 1~3직급은 직접추천 수로도 인정. 5직급+는 기타소실적 30%+ 유지 필요.
- 산정 함수: `evaluate_rank(m_id)` (migration `0005_ranks.sql`), `ranks` 테이블에 요율·조건·배분요율 저장.
- ⚠️ 미결(확정 필요): 정산 **기준금**(%를 곱할 대상), 공코드 edge(미결제→익월 결제), 압축롤업/회복.
- 시드 기본 1,200명(직급 2~3 노출되도록). 규모 조절: `npx tsx supabase/scripts/generate-seed.ts 3000 > supabase/seed.sql`

## 구조

```
supabase/migrations/  0001 스키마 · 0002 closure · 0003 함수·트리거 · 0004 grants
supabase/scripts/generate-seed.ts   # 결정적 ~150명 시드 생성 -> seed.sql
supabase/sql/legs.sql               # 대실적/기타소실적 수동 검증 쿼리
lib/queries, lib/actions            # 데이터 접근 + 서버 액션
components/trees                     # UnilevelTree(커스텀) · PlacementTree(react-d3-tree)
```

> 시드 재생성: `npx tsx supabase/scripts/generate-seed.ts > supabase/seed.sql && npx supabase db reset`

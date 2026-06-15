/**
 * generate-seed.ts — 결정적(deterministic) 목 조직 생성기
 * 실행: npx tsx supabase/scripts/generate-seed.ts > supabase/seed.sql
 *
 * 생성 규칙:
 *  - 3단계 회원 혼합(registered/subscriber/marketer)
 *  - recommender 는 항상 마케터(R1), 소수 파워 추천인에 가중
 *  - parent(후원 배치)는 recommender 와 독립 → 스필오버로 recommender_id ≠ parent_id 확보
 *  - 하나의 대실적 라인이 조직의 50~60% 를 차지하도록 편향
 *  - subscriber/marketer 의 ~70% 는 당월(2026-06) 활성 구독
 */

// 직급(300/600/1500…) 자격이 실제로 나타나도록 규모를 키움. argv 로 조절 가능.
const N = Number(process.argv[2] ?? 1200);
const AS_OF = "2026-06-14";

// ---- 결정적 PRNG (mulberry32) ----
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260614);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

type Role = "registered" | "subscriber" | "marketer";
interface Member {
  idx: number;
  uuid: string;
  name: string;
  role: Role;
  recommender: number | null; // idx
  parent: number | null; // idx (placement)
  legRoot: number | null; // first-level leg root idx
}

const uuid = (i: number) =>
  `aaaaaaaa-0000-0000-0000-${i.toString(16).padStart(12, "0")}`;

const members: Member[] = [];
const marketers: number[] = []; // idx of marketers (eligible recommenders)
const placementChildren = new Map<number, number[]>();
const nodesByLeg = new Map<number, number[]>(); // legRoot -> node idxs

function roleName(role: Role, i: number) {
  const p = role === "marketer" ? "마케터" : role === "subscriber" ? "구독자" : "회원";
  return `${p}#${i}`;
}

function addMember(role: Role, recommender: number | null, parent: number | null) {
  const i = members.length;
  let legRoot: number | null = null;
  if (parent === null) legRoot = null; // M0 자신
  else if (parent === 0) legRoot = i; // M0 직속 → 새 레그 루트
  else legRoot = members[parent].legRoot === parent ? parent : members[parent].legRoot;

  const m: Member = { idx: i, uuid: uuid(i), name: roleName(role, i), role, recommender, parent, legRoot };
  members.push(m);
  if (role === "marketer") marketers.push(i);
  if (parent !== null) {
    if (!placementChildren.has(parent)) placementChildren.set(parent, []);
    placementChildren.get(parent)!.push(i);
  }
  if (legRoot !== null) {
    if (!nodesByLeg.has(legRoot)) nodesByLeg.set(legRoot, []);
    nodesByLeg.get(legRoot)!.push(i);
  }
  return i;
}

// 가중 추천인 선택(파워 추천인 = 초기 마케터)
function pickRecommender(): number {
  const weighted: number[] = [];
  for (const m of marketers) {
    let w = 1;
    if (m === 0) w = 5;
    else if (m <= 2) w = 5;
    else if (m <= 4) w = 3;
    for (let k = 0; k < w; k++) weighted.push(m);
  }
  return pick(weighted);
}

// ---- 1) 루트 + 1레벨 마케터 8명 ----
addMember("marketer", null, null); // M0 (idx 0)
const FIRST_LEVEL = 8;
for (let k = 0; k < FIRST_LEVEL; k++) addMember("marketer", 0, 0);
const DOMINANT_LEG = 1; // idx 1 = 첫 1레벨 마케터를 대실적 라인으로

// ---- 2) 나머지 회원 ----
while (members.length < N) {
  // 역할
  const r = rnd();
  const role: Role = r < 0.2 ? "registered" : r < 0.7 ? "subscriber" : "marketer";
  const recommender = pickRecommender();

  // 배치(placement) — recommender 와 독립
  const pr = rnd();
  let parent: number;
  if (pr < 0.55) {
    // 대실적 라인 깊숙이(뒤쪽=깊은 노드 선호)
    const pool = nodesByLeg.get(DOMINANT_LEG)!;
    const start = Math.floor(pool.length * 0.4);
    parent = pool[start + Math.floor(rnd() * (pool.length - start))];
  } else if (pr < 0.85) {
    parent = recommender; // 추천인 밑
  } else {
    parent = pick(marketers); // 다른 마케터 밑
  }
  addMember(role, recommender, parent);
}

// ---- SQL 출력 ----
const out: string[] = [];
out.push("-- 자동 생성된 시드 (generate-seed.ts). 직접 편집 금지.");
out.push("-- 상품");
out.push(`insert into products(id, code, name, price_usd, billing) values
  ('bbbbbbbb-0000-0000-0000-000000000001','bot_sub','AI 트레이딩 봇 구독',120.00,'monthly'),
  ('bbbbbbbb-0000-0000-0000-000000000002','annual_fee','마케터 연회비',200.00,'yearly'),
  ('bbbbbbbb-0000-0000-0000-000000000003','coin_visa','코인 비자 카드',null,'event'),
  ('bbbbbbbb-0000-0000-0000-000000000004','exchange_fee_share','거래소 수수료 분배',null,'event');`);

out.push("\n-- 회원 (부모 -> 자식 순서, recommender 는 마케터)");
for (const m of members) {
  const rec = m.recommender === null ? "null" : `'${uuid(m.recommender)}'`;
  const par = m.parent === null ? "null" : `'${uuid(m.parent)}'`;
  out.push(
    `insert into members(id, display_name, role, recommender_id, parent_id) values ('${m.uuid}','${m.name}','${m.role}',${rec},${par});`
  );
}

out.push("\n-- 레퍼럴 코드 (마케터 1인당 1개)");
for (const m of members.filter((x) => x.role === "marketer")) {
  out.push(`insert into referral_codes(code, owner_id) values ('REF${m.idx}','${m.uuid}');`);
}

out.push("\n-- 연회비 (마케터)");
for (const m of members.filter((x) => x.role === "marketer")) {
  out.push(
    `insert into annual_memberships(member_id, amount_usd, period_start, period_end) values ('${m.uuid}',200.00,'2026-01-01','2026-12-31');`
  );
}

out.push("\n-- 구독 ($120/월) — subscriber/marketer 의 ~70% 당월 활성, 나머지 만료");
const BOT = "bbbbbbbb-0000-0000-0000-000000000001";
for (const m of members.filter((x) => x.role !== "registered")) {
  const active = rnd() < 0.7;
  if (active) {
    out.push(
      `insert into subscriptions(member_id, product_id, amount_usd, period_start, period_end, status) values ('${m.uuid}','${BOT}',120.00,'2026-06-01','2026-06-30','active');`
    );
  } else {
    out.push(
      `insert into subscriptions(member_id, product_id, amount_usd, period_start, period_end, status) values ('${m.uuid}','${BOT}',120.00,'2026-05-01','2026-05-31','expired');`
    );
  }
}

out.push("\n-- 활성 플래그 확정");
out.push(`select refresh_active_subscribers('${AS_OF}');`);

// 통계 주석
const counts = { registered: 0, subscriber: 0, marketer: 0 } as Record<Role, number>;
members.forEach((m) => counts[m.role]++);
const legSizes = [...nodesByLeg.entries()].map(([k, v]) => `leg${k}:${v.length}`).join(", ");
out.unshift(
  `-- 총 ${members.length}명 | registered:${counts.registered} subscriber:${counts.subscriber} marketer:${counts.marketer}\n-- 레그 크기: ${legSizes}`
);

process.stdout.write(out.join("\n") + "\n");

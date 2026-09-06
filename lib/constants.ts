// 시드의 루트 파트너(M0). 파트너 대시보드 기본 시점.
export const ROOT_MARKETER_ID = "aaaaaaaa-0000-0000-0000-000000000000";

// 데모 시점 — 회원 등급별 포털(등록회원/구독회원). 로그인 회원 자리.
export const DEMO_REGISTERED_ID = "aaaaaaaa-0000-0000-0000-000000000138";
export const DEMO_SUBSCRIBER_ID = "aaaaaaaa-0000-0000-0000-00000000000b";

// 포르투나 제품 앱(체험/실사용). 등록회원 대시보드 히어로 등에서 새 탭으로 연결.
// 포르투나 앱 주소(회원 화면 "플랫폼 체험하기" 등). 2026-09-06 fortuan.org 도메인으로 전환.
// 환경변수 NEXT_PUBLIC_FORTUNA_APP_URL 로 바꿀 수 있고, 없으면 운영 주소를 쓴다.
export const FORTUNA_APP_URL = process.env.NEXT_PUBLIC_FORTUNA_APP_URL?.trim() || "https://fortuan.org/app";

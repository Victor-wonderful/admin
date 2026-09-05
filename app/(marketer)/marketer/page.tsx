import { redirect } from "next/navigation";

// /marketer 는 구 프로토타입 인덱스 — 파트너 대시보드로 통합.
export default function MarketerIndex() {
  redirect("/marketer/dashboard");
}

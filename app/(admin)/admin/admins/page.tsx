import { UserIcon, ShieldCheckIcon, ShieldAlertIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { AddAdminButton, AdminRowActions } from "@/components/admin/admins-manage";
import { getServerClient } from "@/lib/supabase/server";
import { ADMIN_ROLE_LABEL, type AdminRole } from "@/lib/admin-session";
import { requireAdminPage } from "@/lib/admin-guard";
import { ROLE_PAGES, ROLE_CAPS, CAPABILITY_LABEL, PAGE_LABEL } from "@/lib/admin-permissions";
import { toSeoulDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// 관리자·권한 — 실데이터. 역할 4종, 관리자 목록(2FA·마지막 로그인·IP), 추가/비활성화/2FA 재설정/비밀번호 초기화(슈퍼관리자).
type Tone = "crypto" | "green" | "info" | "neutral";
const CARD = "rounded-xl bg-card p-[18px] ring-1 ring-border shadow-[0_2px_12px_-3px_rgba(16,24,40,0.08)]";
const avatarTone: Record<Tone, string> = { crypto: "bg-crypto-soft text-crypto", green: "bg-green-50 text-green-700", info: "bg-info-soft text-info", neutral: "bg-n-100 text-n-500" };
// 역할 카드 — 설명은 고정, 권한 태그는 lib/admin-permissions 매트릭스에서 파생(화면과 실제 가드가 항상 일치).
const ROLE_META: Record<AdminRole, { tone: Tone; desc: string }> = {
  super: { tone: "crypto", desc: "모든 기능 · 설정 · 관리자 권한" },
  settlement: { tone: "green", desc: "정산·자금 처리 및 출금 승인 권한 · 나머지 조회" },
  ops: { tone: "info", desc: "회원·조직 운영 · 회원·주문·매출·상품 조회 (정산·자금 없음)" },
  viewer: { tone: "neutral", desc: "읽기 전용 · 수정/승인 불가" },
};
function rolePerms(r: AdminRole): string[] {
  const caps = ROLE_CAPS[r].map((c) => `실행: ${CAPABILITY_LABEL[c]}`);
  const pages = ROLE_PAGES[r].filter((p) => p !== "dashboard" && p !== "account" && p !== "audit");
  const view = r === "super" ? ["조회: 전체 화면"] : [`조회: ${pages.length}개 화면`];
  return [...caps, ...view];
}
const ROLE_PAGE_HINT = (r: AdminRole) => ROLE_PAGES[r].map((p) => PAGE_LABEL[p]).join(" · ");
const COLS = "grid-cols-[1.9fr_120px_84px_150px_130px_84px_430px]";

type AdminListRow = { id: string; email: string; display_name: string; role: AdminRole; is_active: boolean; totp_enabled: boolean; last_login_at: string | null; created_at: string };

export default async function AdminAdminsPage() {
  const me = await requireAdminPage("admins");
  const sb = getServerClient();
  const [{ data: admins }, { data: sessions }] = await Promise.all([
    sb.from("admins").select("id, email, display_name, role, is_active, totp_enabled, last_login_at, created_at").order("created_at"),
    sb.from("admin_sessions").select("admin_id, ip, last_seen_at").is("revoked_at", null).order("last_seen_at", { ascending: false }),
  ]);
  const rows = (admins ?? []) as AdminListRow[];
  const lastIp = new Map<string, string>();
  for (const s of (sessions ?? []) as Array<{ admin_id: string; ip: string | null }>) if (!lastIp.has(s.admin_id)) lastIp.set(s.admin_id, s.ip || "—");
  const canManage = me.role === "super";
  const roleCount = (r: AdminRole) => rows.filter((a) => a.role === r && a.is_active).length;

  return (
    <>
      <Topbar title="관리자·권한" sub="운영자 계정 · 역할 · 2단계 인증" uid={me.display_name} actions={<AddAdminButton disabled={!canManage} />} />

      <div className="flex-1 space-y-[18px] overflow-auto bg-canvas p-4 lg:p-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(ROLE_META) as AdminRole[]).map((r) => {
            const m = ROLE_META[r];
            return (
              <div key={r} className={cn(CARD, "space-y-3")}>
                <div className="flex items-center justify-between">
                  <Pill tone={m.tone}>{ADMIN_ROLE_LABEL[r]}</Pill>
                  <span className="flex items-center gap-1 text-[13px] font-semibold text-text-secondary"><UserIcon className="size-3.5 text-text-tertiary" /> {roleCount(r)}명</span>
                </div>
                <p className="text-xs leading-relaxed text-text-secondary">{m.desc}</p>
                <div className="flex flex-wrap gap-1.5" title={ROLE_PAGE_HINT(r)}>
                  {rolePerms(r).map((p) => <span key={p} className="rounded bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-text-secondary ring-1 ring-border">{p}</span>)}
                </div>
              </div>
            );
          })}
        </section>

        <Panel title="관리자 계정" sub={`총 ${rows.length}명 · 활성 ${rows.filter((a) => a.is_active).length}명 · 로그인 = 이메일 + 비밀번호 + 인증 앱 코드`} bodyClassName="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div className={cn("grid items-center gap-3 border-b pb-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary", COLS)}>
              <span>관리자</span><span>역할</span><span>2FA</span><span>마지막 로그인</span><span>접속 IP</span><span>상태</span><span className="text-right">관리</span>
            </div>
            {rows.map((a) => {
              const meta = ROLE_META[a.role];
              return (
                <div key={a.id} className={cn("grid items-center gap-3 border-b py-3.5 text-sm last:border-0", COLS, !a.is_active && "opacity-60")}>
                  <div className="flex items-center gap-2.5">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold", avatarTone[meta.tone])}>{a.display_name.slice(0, 1)}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold text-text-primary">{a.display_name}{a.id === me.id ? <span className="ml-1.5 text-[11px] font-medium text-text-tertiary">(나)</span> : null}</div>
                      <div className="truncate text-[11px] text-text-tertiary">{a.email}</div>
                    </div>
                  </div>
                  <span><Pill tone={meta.tone}>{ADMIN_ROLE_LABEL[a.role]}</Pill></span>
                  <span className={cn("inline-flex items-center gap-1 text-[12px] font-semibold", a.totp_enabled ? "text-green-700" : "text-warning")}>
                    {a.totp_enabled ? <ShieldCheckIcon className="size-3.5" /> : <ShieldAlertIcon className="size-3.5" />} {a.totp_enabled ? "등록" : "미등록"}
                  </span>
                  <span className="text-[12px] tabular-nums text-text-secondary">{a.last_login_at ? toSeoulDateTime(a.last_login_at) : "—"}</span>
                  <span className="text-[12px] tabular-nums text-text-tertiary">{lastIp.get(a.id) ?? "—"}</span>
                  <span><Pill tone={a.is_active ? "green" : "neutral"} dot={a.is_active}>{a.is_active ? "활성" : "비활성"}</Pill></span>
                  <AdminRowActions adminId={a.id} email={a.email} role={a.role} active={a.is_active} isSelf={a.id === me.id} canManage={canManage} />
                </div>
              );
            })}
          </div>
        </Panel>

        <div className="rounded-md bg-info-soft px-4 py-3 text-[12px] leading-relaxed text-info">
          공개 가입은 없습니다. 슈퍼관리자가 이메일·임시 비밀번호로 계정을 만들어 전달하면, 그 관리자가 첫 로그인 때 인증 앱(Google Authenticator 등)을 등록합니다. 5회 오입력 시 15분 잠금, 세션은 12시간 후 만료됩니다. 비밀번호를 잊은 관리자는 로그인 화면의 비밀번호 찾기(이메일 링크)로 직접 바꾸거나, 슈퍼관리자가 여기서 임시 비밀번호를 발급합니다. 초기 계정 admin@fortuna.demo 의 비밀번호는 운영 배포 전에 반드시 바꾸세요.
        </div>
      </div>
    </>
  );
}

import { KeyRoundIcon, ShieldCheckIcon, UserCogIcon, MonitorSmartphoneIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { AdminPasswordForm, AdminTotpRestartForm, AdminNameForm } from "@/components/admin/account-forms";
import { ADMIN_ROLE_LABEL, getCurrentAdmin, hashAdminToken } from "@/lib/admin-session";
import { SessionRevokeButton, RevokeOthersButton } from "@/components/admin/session-revoke-button";
import { requireAdminPage } from "@/lib/admin-guard";
import { getServerClient } from "@/lib/supabase/server";
import { toSeoulDateTime } from "@/lib/dates";
import { describeDevice } from "@/lib/queries/sessions";

export const dynamic = "force-dynamic";

// 내 계정 — 로그인한 관리자 본인의 정보, 비밀번호 변경, 인증 앱 재등록, 활성 세션(기기) 목록.
export default async function AdminAccountPage() {
  const me = await requireAdminPage("account");
  const sb = getServerClient();
  const cur = await getCurrentAdmin();
  const curHash = cur ? hashAdminToken(cur.token) : "";
  const { data: sessions } = await sb.from("admin_sessions").select("id, token_hash, user_agent, ip, created_at, last_seen_at").eq("admin_id", me.id).is("revoked_at", null).order("last_seen_at", { ascending: false });
  const rows = (sessions ?? []) as Array<{ id: string; token_hash: string; user_agent: string | null; ip: string | null; created_at: string; last_seen_at: string }>;

  const info: [string, React.ReactNode][] = [
    ["이메일", me.email],
    ["역할", <Pill key="r" tone="crypto">{ADMIN_ROLE_LABEL[me.role]}</Pill>],
    ["2단계 인증", me.totp_enabled ? <span className="inline-flex items-center gap-1 text-green-700"><ShieldCheckIcon className="size-3.5" /> 인증 앱 등록됨</span> : "미등록"],
    ["마지막 로그인", me.last_login_at ? toSeoulDateTime(me.last_login_at) : "—"],
  ];

  return (
    <>
      <Topbar title="내 계정" sub="관리자 본인 정보 · 비밀번호 · 인증 앱 · 로그인 기기" uid={me.display_name} />

      <div className="flex-1 space-y-4 overflow-auto bg-canvas p-7">
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="계정 정보" sub="역할은 슈퍼관리자가 관리자·권한 화면에서 바꿉니다 · 이메일(로그인 ID)은 변경 불가">
            <div className="mb-3 border-b pb-3"><AdminNameForm current={me.display_name} /></div>
            <div>
              {info.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                  <span className="text-text-secondary">{k}</span>
                  <span className="font-semibold text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="비밀번호 변경" sub="현재 비밀번호 확인 후 8자 이상의 새 비밀번호로 · 변경하면 다른 기기 로그인은 종료">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-crypto-soft text-crypto"><KeyRoundIcon className="size-5" /></span>
              <div className="max-w-[420px] flex-1"><AdminPasswordForm /></div>
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="인증 앱 다시 등록" sub="휴대폰을 바꿨거나 인증 앱을 지웠을 때 · 현재 비밀번호 확인 후 새 QR 을 등록합니다">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-green-50 text-green-700"><UserCogIcon className="size-5" /></span>
              <div className="max-w-[420px] flex-1"><AdminTotpRestartForm /></div>
            </div>
          </Panel>

          <Panel title="로그인 중인 기기" sub={`활성 세션 ${rows.length}개 · 12시간 후 자동 만료`} action={<RevokeOthersButton count={rows.filter((s) => s.token_hash !== curHash).length} />}>
            <div>
              {rows.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 border-b py-2.5 text-[13px] last:border-0">
                  <span className="flex items-center gap-2 text-text-primary"><MonitorSmartphoneIcon className="size-4 text-text-tertiary" /> {describeDevice(s.user_agent)}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-[12px] tabular-nums text-text-tertiary">{s.ip || "—"} · {toSeoulDateTime(s.last_seen_at)}</span>
                    <SessionRevokeButton sessionId={s.id} isCurrent={s.token_hash === curHash} />
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

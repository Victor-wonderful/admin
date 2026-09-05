import { UserRoundIcon, ShieldCheckIcon, WalletIcon } from "lucide-react";

import { Topbar } from "@/components/shell/topbar";
import { Panel } from "@/components/dashboard/panel";
import { Pill } from "@/components/ui/pill";
import { NicknameForm, PasswordForm, PayoutAddressForm } from "@/components/profile/profile-forms";
import type { MemberRow } from "@/lib/supabase/types";
import { toUid, uidInitials } from "@/lib/uid";
import { toSeoulDate } from "@/lib/dates";

const ROLE_LABEL = { registered: "등록회원", subscriber: "구독회원", marketer: "파트너" } as const;
const ROLE_TONE = { registered: "neutral", subscriber: "green", marketer: "crypto" } as const;

// 프로필·설정 — 전 등급 공용. 계정 정보(읽기) + 닉네임/비밀번호 변경.
export function ProfileView({ member }: { member: MemberRow }) {
  const uid = toUid(member.id);
  const rows: [string, string][] = [
    ["ID", member.email ?? "—"],
    ["회원 UID", uid],
    ["회원 구분", ROLE_LABEL[member.role]],
    ["초대한 파트너", member.recommender_id ? toUid(member.recommender_id) : "—"],
    ["가입일", toSeoulDate(member.joined_at)],
  ];

  return (
    <>
      <Topbar title="프로필·설정" sub="계정 정보 · 닉네임 · 비밀번호" uid={uid} />

      <div className="flex-1 space-y-4 overflow-auto p-7">
        <div className="flex items-center gap-4 rounded-xl bg-feature p-6 text-white shadow-[0_2px_12px_-3px_rgba(16,24,40,0.12)]">
          <span className="grid size-14 place-items-center rounded-full bg-white/15 text-lg font-bold">{uidInitials(member.id)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{member.display_name}</span>
              <Pill tone={ROLE_TONE[member.role]}>{ROLE_LABEL[member.role]}</Pill>
            </div>
            <div className="mt-0.5 text-sm text-white/70">{uid} · {member.email ?? "ID 미설정"}</div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Panel title="계정 정보" sub="ID(이메일)와 UID는 변경할 수 없습니다">
            <div>
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b py-2.5 text-[13px] last:border-0">
                  <span className="text-text-secondary">{k}</span>
                  <span className="font-semibold text-text-primary">{v}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="닉네임" sub="화면에 표시되는 이름">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-green-50 text-green-700">
                <UserRoundIcon className="size-5" />
              </span>
              <div className="flex-1">
                <NicknameForm current={member.display_name} />
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="내 지갑 주소" sub="출금을 받을 본인 지갑 주소 · 입금 시 이 주소에서 보내면 자동으로 내 잔액에 반영됩니다">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-info-soft text-info">
              <WalletIcon className="size-5" />
            </span>
            <div className="max-w-[520px] flex-1">
              <PayoutAddressForm trc20={member.payout_address_trc20 ?? ""} bep20={member.payout_address_bep20 ?? ""} />
            </div>
          </div>
        </Panel>

        <Panel title="비밀번호 변경" sub="현재 비밀번호 확인 후 8자 이상의 새 비밀번호로 변경">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-crypto-soft text-crypto">
              <ShieldCheckIcon className="size-5" />
            </span>
            <div className="max-w-[420px] flex-1">
              <PasswordForm />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

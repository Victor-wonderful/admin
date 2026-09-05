import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";

import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { AdminResetForm } from "@/components/admin/admin-auth-forms";
import { checkAdminPasswordReset } from "@/lib/actions/admin-auth";

export const dynamic = "force-dynamic";

// 메일 링크로 들어오는 새 비밀번호 설정 화면. 토큰이 죽어 있으면 다시 요청하도록 안내.
export default async function AdminResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const target = await checkAdminPasswordReset(token);
  if (!target) {
    return (
      <AdminAuthShell title="링크를 사용할 수 없습니다" sub="재설정 링크가 잘못되었거나 만료(30분)되었거나 이미 사용되었습니다">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-md bg-negative-soft px-3.5 py-3 text-xs leading-relaxed text-negative">
            <TriangleAlertIcon className="size-4 shrink-0" />
            <span>비밀번호 찾기에서 새 링크를 요청하세요. 이전 링크는 더 이상 동작하지 않습니다.</span>
          </div>
          <Link href="/admin-forgot" className="inline-flex w-full items-center justify-center rounded-md bg-brand py-2.5 text-sm font-bold text-white">새 링크 요청</Link>
          <Link href="/admin-login" className="block text-center text-[12px] font-semibold text-text-secondary underline-offset-2 hover:underline">로그인으로</Link>
        </div>
      </AdminAuthShell>
    );
  }
  return (
    <AdminAuthShell title="새 비밀번호 설정" sub={`${target.email} · 8자 이상`}>
      <AdminResetForm token={token} />
    </AdminAuthShell>
  );
}

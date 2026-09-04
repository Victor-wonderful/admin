import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/auth/auth-layout";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentMember, roleHome } from "@/lib/session";

export const dynamic = "force-dynamic";

// 회원가입 — 추천 링크(/signup?ref=CODE)로 들어오면 추천 코드를 미리 채운다.
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const member = await getCurrentMember();
  if (member) redirect(roleHome(member.role));

  const { ref } = await searchParams;

  return (
    <AuthLayout>
      <SignupForm refCode={ref?.trim().toUpperCase()} />
    </AuthLayout>
  );
}

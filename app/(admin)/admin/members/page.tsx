import Link from "next/link";
import { StatCard } from "@/components/cards/StatCard";
import { MemberTable } from "@/components/members/MemberTable";
import { RunExpiryButton } from "@/components/admin/RunExpiryButton";
import { listMembers, getMemberStats } from "@/lib/queries/members";
import { cn } from "@/lib/utils";

const ROLES = [
  { key: "", label: "전체" },
  { key: "registered", label: "회원" },
  { key: "subscriber", label: "구독자" },
  { key: "marketer", label: "마케터" },
];

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; active?: string }>;
}) {
  const { role, active } = await searchParams;
  const [all, rows, stats] = await Promise.all([
    listMembers(),
    listMembers({ role: role || undefined, activeOnly: active === "1" }),
    getMemberStats(),
  ]);

  const q = (r: string) => {
    const p = new URLSearchParams();
    if (r) p.set("role", r);
    if (active === "1") p.set("active", "1");
    const s = p.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <RunExpiryButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="전체" value={stats.total} />
        <StatCard title="활성 구독자" value={stats.active} accent="major" />
        <StatCard title="회원" value={stats.registered} />
        <StatCard title="구독자" value={stats.subscriber} />
        <StatCard title="마케터" value={stats.marketer} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ROLES.map((r) => (
          <Link
            key={r.key}
            href={`/admin/members${q(r.key)}`}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              (role || "") === r.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {r.label}
          </Link>
        ))}
        <Link
          href={`/admin/members?${new URLSearchParams({
            ...(role ? { role } : {}),
            ...(active === "1" ? {} : { active: "1" }),
          }).toString()}`}
          className={cn(
            "ml-2 rounded-full border px-3 py-1 text-sm",
            active === "1" ? "bg-emerald-600 text-white" : "hover:bg-muted"
          )}
        >
          활성만 {active === "1" ? "✓" : ""}
        </Link>
        <span className="ml-auto text-sm text-muted-foreground">{rows.length}명 표시</span>
      </div>

      <MemberTable members={rows} allMembers={all} />
    </div>
  );
}

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RoleBadge } from "@/components/trees/RoleBadge";
import type { MemberRow } from "@/lib/supabase/types";

export function MemberTable({ members, allMembers }: { members: MemberRow[]; allMembers?: MemberRow[] }) {
  const nameById = new Map((allMembers ?? members).map((m) => [m.id, m.display_name]));
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>회원</TableHead>
            <TableHead>단계</TableHead>
            <TableHead>활성</TableHead>
            <TableHead>추천인(수당)</TableHead>
            <TableHead>후원 부모(배치)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Link href={`/admin/members/${m.id}`} className="font-medium hover:underline">
                  {m.display_name}
                </Link>
              </TableCell>
              <TableCell>
                <RoleBadge role={m.role} />
              </TableCell>
              <TableCell>
                <span
                  className={
                    "inline-block h-2.5 w-2.5 rounded-full " +
                    (m.is_active_subscriber ? "bg-emerald-500" : "border border-zinc-400")
                  }
                />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {m.recommender_id ? nameById.get(m.recommender_id) ?? "—" : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {m.parent_id ? nameById.get(m.parent_id) ?? "—" : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

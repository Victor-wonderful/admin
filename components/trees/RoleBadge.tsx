import { Badge } from "@/components/ui/badge";
import type { MemberRole } from "@/lib/supabase/types";

const LABEL: Record<MemberRole, string> = {
  registered: "회원",
  subscriber: "구독자",
  marketer: "파트너",
};

export function RoleBadge({ role }: { role: MemberRole }) {
  const cls =
    role === "marketer"
      ? "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300"
      : role === "subscriber"
        ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300"
        : "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400";
  return (
    <Badge variant="outline" className={cls}>
      {LABEL[role]}
    </Badge>
  );
}

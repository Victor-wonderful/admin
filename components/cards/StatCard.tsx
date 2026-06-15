import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string | number;
  hint?: string;
  accent?: "major" | "minor" | "neutral";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-bold tabular-nums",
            accent === "major" && "text-emerald-600 dark:text-emerald-400",
            accent === "minor" && "text-sky-600 dark:text-sky-400"
          )}
        >
          {value}
        </div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

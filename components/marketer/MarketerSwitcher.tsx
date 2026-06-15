"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// 목(mock) "현재 마케터" 셀렉터 — ?as=<id> 로 전환. (실인증은 다음 단계)
export function MarketerSwitcher({
  marketers,
  defaultId,
}: {
  marketers: { id: string; name: string }[];
  defaultId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("as") ?? defaultId;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(params.toString());
    next.set("as", e.target.value);
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="px-3 py-2">
      <label className="mb-1 block text-xs text-muted-foreground">현재 마케터 (목)</label>
      <select
        value={current}
        onChange={onChange}
        className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
      >
        {marketers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  );
}

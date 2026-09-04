import * as React from "react";

// 인증 폼 공통 입력 필드.
export function Field({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      <input
        {...input}
        className="w-full rounded-md bg-card px-3.5 py-2.5 text-sm text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500"
      />
      {hint ? <span className="text-[11px] text-text-tertiary">{hint}</span> : null}
    </label>
  );
}

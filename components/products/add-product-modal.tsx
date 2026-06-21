"use client";

import * as React from "react";
import { PlusIcon, XIcon, ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-6 w-11 items-center rounded-full px-0.5 transition-colors",
        on ? "bg-brand" : "bg-n-300",
      )}
    >
      <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
    </button>
  );
}

const inputCls =
  "w-full rounded-md bg-card px-3 py-2 text-sm text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";
const labelCls = "text-xs font-medium text-text-secondary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function Select({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <select className={cn(inputCls, "appearance-none pr-9")}>{children}</select>
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-tertiary" />
    </div>
  );
}

export function AddProductModal() {
  const [open, setOpen] = React.useState(false);
  const [pool, setPool] = React.useState(true);
  const [counting, setCounting] = React.useState(true);
  const [active, setActive] = React.useState(true);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white"
      >
        <PlusIcon className="size-3.5" /> 상품 추가
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            {/* 헤더 */}
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">상품 추가</h2>
                <p className="mt-0.5 text-xs text-text-secondary">새 상품 · 구독 플랜 등록</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            {/* 본문 */}
            <div className="space-y-4 px-6 py-5">
              <Field label="상품명">
                <input className={inputCls} placeholder="예: Alpha Engine Pro" />
              </Field>

              <div className="flex gap-3">
                <Field label="상품 코드">
                  <input className={cn(inputCls, "font-mono")} placeholder="BOT-PRO" />
                </Field>
                <Field label="유형">
                  <Select>
                    <option>구독 (정기 결제)</option>
                    <option>연회비 (연 1회)</option>
                    <option>일회성 상품</option>
                  </Select>
                </Field>
              </div>

              <div className="flex gap-3">
                <Field label="가격">
                  <div className="relative">
                    <input className={cn(inputCls, "pr-14")} placeholder="120" inputMode="numeric" />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-text-tertiary">USDT</span>
                  </div>
                </Field>
                <Field label="결제 주기">
                  <Select>
                    <option>월 (Monthly)</option>
                    <option>년 (Yearly)</option>
                    <option>일회성</option>
                  </Select>
                </Field>
              </div>

              {/* 수당 · 카운팅 설정 */}
              <div className="space-y-3 rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                <div className="text-[11px] font-semibold tracking-wide text-text-tertiary">수당 · 카운팅 설정</div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">수당 풀 적용</div>
                    <div className="text-[11px] text-text-tertiary">수당 풀에 매출 비율 분배 · 수당 재원에 포함</div>
                  </div>
                  <Toggle on={pool} onClick={() => setPool((v) => !v)} />
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-3">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">활성 구독자 카운팅</div>
                    <div className="text-[11px] text-text-tertiary">구독 시 is_active_subscriber · 직급 자격에 반영</div>
                  </div>
                  <Toggle on={counting} onClick={() => setCounting((v) => !v)} />
                </div>
              </div>

              <Field label="설명">
                <textarea rows={3} className={cn(inputCls, "resize-none")} placeholder="상품 설명을 입력하세요..." />
              </Field>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-text-primary">즉시 판매 활성</span>
                <Toggle on={active} onClick={() => setActive((v) => !v)} />
              </div>
            </div>

            {/* 푸터 */}
            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
                취소
              </button>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white">
                <PlusIcon className="size-3.5" /> 상품 추가
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

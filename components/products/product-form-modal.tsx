"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XIcon, ChevronDownIcon, PencilIcon, Loader2Icon, CheckIcon } from "lucide-react";

import { createProduct, updateProduct, type ProductFormState } from "@/lib/actions/products";
import type { ProductRow } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

// 체크박스 기반 토글 — 폼 제출 시 name=on 으로 전달된다.
function Toggle({ name, defaultOn }: { name: string; defaultOn: boolean }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <label className="relative inline-flex cursor-pointer items-center">
      <input type="checkbox" name={name} checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
      <span className={cn("flex h-6 w-11 items-center rounded-full px-0.5 transition-colors", on ? "bg-brand" : "bg-n-300")}>
        <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
      </span>
    </label>
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

// 상품 추가/수정 모달 — product 가 있으면 수정, 없으면 추가. 저장은 서버 액션(DB 반영).
export function ProductFormModal({ product, trigger }: { product?: ProductRow; trigger?: React.ReactNode }) {
  const router = useRouter();
  const editing = Boolean(product);
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = useActionState<ProductFormState, FormData>(editing ? updateProduct : createProduct, undefined);

  React.useEffect(() => {
    if (state?.ok && open) {
      const t = setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state, open, router]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          editing
            ? "ml-auto inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary"
            : "inline-flex items-center gap-1.5 rounded-md bg-brand px-3.5 py-2 text-[13px] font-semibold text-white"
        }
      >
        {trigger ?? (editing ? <><PencilIcon className="size-3" /> 수정</> : <><PlusIcon className="size-3.5" /> 상품 추가</>)}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={() => setOpen(false)} />
          <form action={action} className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            {editing ? <input type="hidden" name="id" value={product!.id} /> : null}
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">{editing ? "상품 수정" : "상품 추가"}</h2>
                <p className="mt-0.5 text-xs text-text-secondary">{editing ? `${product!.code} · 저장 즉시 회원 화면에 반영` : "새 상품 · 구독 플랜 등록"}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <Field label="상품명">
                <input name="name" defaultValue={product?.name} className={inputCls} placeholder="예: 포르투나 Pro" required />
              </Field>

              <div className="flex gap-3">
                <Field label="상품 코드">
                  <input
                    name="code"
                    defaultValue={product?.code}
                    className={cn(inputCls, "font-mono")}
                    placeholder="pro_plan"
                    pattern="[a-z0-9_]{2,32}"
                    title="영문 소문자·숫자·밑줄 2~32자"
                    required
                    readOnly={editing && (product?.code === "bot_sub" || product?.code === "annual_fee")}
                  />
                </Field>
                <Field label="결제 주기">
                  <div className="relative">
                    <select name="billing" defaultValue={product?.billing ?? "monthly"} className={cn(inputCls, "appearance-none pr-9")}>
                      <option value="monthly">월 (구독)</option>
                      <option value="yearly">년 (연 1회)</option>
                      <option value="event">일회성</option>
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-text-tertiary" />
                  </div>
                </Field>
              </div>

              <div className="flex gap-3">
                <Field label="가격 (비우면 변동가)">
                  <div className="relative">
                    <input name="price_usd" defaultValue={product?.price_usd ?? ""} className={cn(inputCls, "pr-14")} placeholder="120" inputMode="decimal" />
                    <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-text-tertiary">USDT</span>
                  </div>
                </Field>
                <Field label="정렬 순서">
                  <input name="sort_order" defaultValue={product?.sort_order ?? 100} className={inputCls} inputMode="numeric" />
                </Field>
              </div>

              <div className="space-y-3 rounded-lg bg-surface-muted p-4 ring-1 ring-border">
                <div className="text-[11px] font-semibold tracking-wide text-text-tertiary">수당 · 카운팅 설정</div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">매출 배분 적용</div>
                    <div className="text-[11px] text-text-tertiary">켬: 이 상품 매출을 수당 풀·회사·지분·예비비 비율로 배분 · 끔: 배분 없이 회사 수익 100%</div>
                  </div>
                  <Toggle name="pool_eligible" defaultOn={product?.pool_eligible ?? true} />
                </div>
                <div className="flex items-center justify-between gap-3 border-t pt-3 opacity-60" title="상품 구매를 활성 구독자로 셀지는 아직 결정 전 · 정산 엔진이 이 값을 읽지 않습니다">
                  <div>
                    <div className="text-[13px] font-semibold text-text-primary">활성 구독자 카운팅 <span className="ml-1 rounded bg-n-100 px-1.5 py-0.5 text-[10px] font-semibold text-n-500">준비 중</span></div>
                    <div className="text-[11px] text-text-tertiary">상품 구매를 직급 자격(활성 구독자)에 셀지는 결정 대기 · 현재 엔진은 구독 결제만 카운팅</div>
                  </div>
                  <span className="pointer-events-none"><Toggle name="counts_active" defaultOn={product?.counts_active ?? false} /></span>
                </div>
              </div>

              <Field label="설명">
                <textarea name="description" defaultValue={product?.description ?? ""} rows={3} className={cn(inputCls, "resize-none")} placeholder="상품 설명을 입력하세요..." />
              </Field>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold text-text-primary">판매 활성</span>
                <Toggle name="is_active" defaultOn={product?.is_active ?? true} />
              </div>

              {state?.error ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div> : null}
              {state?.ok ? (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckIcon className="size-3.5" /> 저장했습니다
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button type="button" onClick={() => setOpen(false)} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
                취소
              </button>
              <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-brand px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
                {pending ? <Loader2Icon className="size-3.5 animate-spin" /> : editing ? <PencilIcon className="size-3.5" /> : <PlusIcon className="size-3.5" />}
                {editing ? "저장" : "상품 추가"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

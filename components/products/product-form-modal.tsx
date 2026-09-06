"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XIcon, PencilIcon, Loader2Icon, CheckIcon, ChevronDownIcon, RepeatIcon, CalendarIcon, ZapIcon } from "lucide-react";

import { createProduct, updateProduct, type ProductFormState } from "@/lib/actions/products";
import type { ProductRow } from "@/lib/supabase/types";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { cn } from "@/lib/utils";

// 상품 추가/수정 모달.
//  기본: 상품명 · 결제 주기(카드 3개) · 가격 · 설명 · 바로 판매 시작 — 이것만 채우면 등록된다.
//  고급 설정(접힘): 상품 코드(비우면 자동 생성) · 정렬 순서(비우면 맨 뒤) · 매출 배분 적용 · (수정 시) 활성 카운팅(준비 중)

// 체크박스 기반 토글 — 폼 제출 시 name=on 으로 전달된다.
function Toggle({ name, defaultOn, disabled }: { name: string; defaultOn: boolean; disabled?: boolean }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <label className={cn("relative inline-flex items-center", disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <input type="checkbox" name={name} checked={on} disabled={disabled} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
      <span className={cn("flex h-6 w-11 items-center rounded-full px-0.5 transition-colors", on ? "bg-brand" : "bg-n-300", disabled && "opacity-50")}>
        <span className={cn("size-5 rounded-full bg-white shadow-sm transition-transform", on && "translate-x-5")} />
      </span>
    </label>
  );
}

const inputCls =
  "w-full rounded-md bg-card px-3 py-2.5 text-sm text-text-primary ring-1 ring-border-strong outline-none placeholder:text-text-tertiary focus:ring-2 focus:ring-green-500";
const labelCls = "text-xs font-semibold text-text-secondary";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      {children}
      {hint ? <span className="text-[11px] text-text-tertiary">{hint}</span> : null}
    </label>
  );
}

const BILLING_OPTS = [
  { v: "monthly", l: "월 구독", d: "30일마다 잔액에서 자동 결제", icon: RepeatIcon },
  { v: "yearly", l: "연 1회", d: "1년 이용권 · 만료 전 갱신", icon: CalendarIcon },
  { v: "event", l: "일회성", d: "한 번 구매로 끝", icon: ZapIcon },
] as const;

export function ProductFormModal({ product, trigger }: { product?: ProductRow; trigger?: React.ReactNode }) {
  const router = useRouter();
  const editing = Boolean(product);
  const [open, setOpen] = React.useState(false);
  const [billing, setBilling] = React.useState<ProductRow["billing"]>(product?.billing ?? "monthly");
  const [advanced, setAdvanced] = React.useState(false);
  const [state, action, pending] = useActionState<ProductFormState, FormData>(editing ? updateProduct : createProduct, undefined);
  const close = React.useCallback(() => setOpen(false), []);
  useEscapeKey(open, close);

  React.useEffect(() => {
    if (state?.ok && open) {
      const t = setTimeout(() => {
        setOpen(false);
        router.refresh();
      }, 600);
      return () => clearTimeout(t);
    }
  }, [state, open, router]);

  const isPlan = editing && (product?.code === "bot_sub" || product?.code === "annual_fee");

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
          <div className="absolute inset-0 bg-[#0B0F14]/80" onClick={close} />
          <form action={action} className="relative z-10 max-h-[calc(100dvh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-xl bg-card shadow-[0_20px_40px_-8px_rgba(11,15,20,0.35)]">
            {editing ? <input type="hidden" name="id" value={product!.id} /> : null}
            <input type="hidden" name="billing" value={billing} />

            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-base font-bold text-text-primary">{editing ? "상품 수정" : "상품 추가"}</h2>
                <p className="mt-0.5 text-xs text-text-secondary">{editing ? `${product!.code} · 저장 즉시 회원 화면에 반영` : "이름 · 결제 주기 · 가격만 정하면 바로 등록됩니다"}</p>
              </div>
              <button type="button" onClick={close} className="grid size-7 place-items-center rounded-md text-text-tertiary hover:bg-surface-muted">
                <XIcon className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-auto px-6 py-5">
              <Field label="상품명">
                <input name="name" defaultValue={product?.name} className={inputCls} placeholder="예: 포르투나 Pro" autoFocus required />
              </Field>

              <div className="space-y-1.5">
                <span className={labelCls}>결제 주기</span>
                <div className="grid grid-cols-3 gap-2">
                  {BILLING_OPTS.map((o) => {
                    const on = billing === o.v;
                    return (
                      <button key={o.v} type="button" onClick={() => setBilling(o.v)} disabled={isPlan} className={cn("flex flex-col items-start gap-1 rounded-lg p-3 text-left ring-1 transition-colors disabled:opacity-60", on ? "bg-green-50 ring-green-500" : "bg-card ring-border-strong hover:bg-surface-muted")}>
                        <span className={cn("flex items-center gap-1.5 text-[13px] font-semibold", on ? "text-green-700" : "text-text-primary")}><o.icon className="size-3.5" /> {o.l}</span>
                        <span className="text-[11px] leading-snug text-text-tertiary">{o.d}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="가격" hint={editing ? "비우면 '변동가'로 표시되고 회원 화면에 노출되지 않습니다" : undefined}>
                <div className="relative">
                  <input name="price_usd" defaultValue={product?.price_usd ?? ""} className={cn(inputCls, "pr-16")} placeholder={billing === "monthly" ? "120" : billing === "yearly" ? "200" : "50"} inputMode="decimal" required={!editing} />
                  <span className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-medium text-text-tertiary">USDT</span>
                </div>
              </Field>

              <Field label="설명 (선택)">
                <textarea name="description" defaultValue={product?.description ?? ""} rows={2} className={cn(inputCls, "resize-none")} placeholder="회원 화면 상품 카드에 보이는 한 줄 설명" />
              </Field>

              <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-muted px-4 py-3 ring-1 ring-border">
                <div>
                  <div className="text-[13px] font-semibold text-text-primary">{editing ? "판매 중" : "바로 판매 시작"}</div>
                  <div className="text-[11px] text-text-tertiary">끄면 회원 화면에 보이지 않습니다 · 나중에 카드의 토글로도 바꿀 수 있습니다</div>
                </div>
                <Toggle name="is_active" defaultOn={product?.is_active ?? true} />
              </div>

              {/* 고급 설정 */}
              <div className="rounded-lg ring-1 ring-border">
                <button type="button" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[12px] font-semibold text-text-secondary hover:bg-surface-muted">
                  고급 설정 <span className="font-normal text-text-tertiary">· 코드 · 정렬 · 매출 배분</span>
                  <ChevronDownIcon className={cn("ml-auto size-4 text-text-tertiary transition-transform", advanced && "rotate-180")} />
                </button>
                <div className={cn("space-y-3 border-t px-4 py-3", !advanced && "hidden")}>
                  <div className="flex gap-3">
                    <Field label="상품 코드" hint={isPlan ? "회원 화면 연동 플랜 · 변경 불가" : "비우면 자동 생성 · 영문 소문자·숫자·밑줄"}>
                      <input name="code" defaultValue={product?.code} className={cn(inputCls, "font-mono")} placeholder="자동 생성" pattern="[a-z0-9_]{2,32}" title="영문 소문자·숫자·밑줄 2~32자" readOnly={isPlan} />
                    </Field>
                    <Field label="정렬 순서" hint="작을수록 앞 · 비우면 맨 뒤">
                      <input name="sort_order" defaultValue={product?.sort_order ?? ""} className={inputCls} inputMode="numeric" placeholder="자동" />
                    </Field>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t pt-3">
                    <div>
                      <div className="text-[13px] font-semibold text-text-primary">매출 배분 적용</div>
                      <div className="text-[11px] text-text-tertiary">켬: 수당 풀·회사·지분·예비비 비율로 배분 · 끔: 회사 수익 100%</div>
                    </div>
                    <Toggle name="pool_eligible" defaultOn={product?.pool_eligible ?? true} />
                  </div>
                  {editing ? (
                    <div className="flex items-center justify-between gap-3 border-t pt-3 opacity-60" title="상품 구매를 활성 구독자로 셀지는 결정 전 · 정산 엔진이 이 값을 읽지 않습니다">
                      <div>
                        <div className="text-[13px] font-semibold text-text-primary">활성 구독자 카운팅 <span className="ml-1 rounded bg-n-100 px-1.5 py-0.5 text-[10px] font-semibold text-n-500">준비 중</span></div>
                        <div className="text-[11px] text-text-tertiary">결정 대기 · 현재 엔진은 구독 결제만 카운팅</div>
                      </div>
                      <Toggle name="counts_active" defaultOn={product?.counts_active ?? false} disabled />
                    </div>
                  ) : null}
                </div>
              </div>

              {state?.error ? <div className="rounded-md bg-negative-soft px-3 py-2 text-xs font-medium text-negative">{state.error}</div> : null}
              {state?.ok ? (
                <div className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                  <CheckIcon className="size-3.5" /> 저장했습니다
                </div>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t px-6 py-4">
              <button type="button" onClick={close} className="rounded-md bg-card px-4 py-2 text-[13px] font-medium text-text-secondary ring-1 ring-border-strong">
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

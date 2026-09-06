import * as React from "react";

import { cn } from "@/lib/utils";

// 모바일 카드에서 이 열이 놓일 자리.
//  title  — 카드 첫 줄 왼쪽(굵게)         value — 카드 첫 줄 오른쪽(금액 등)
//  meta   — 제목 아래 회색 한 줄(· 로 연결)  row   — "라벨 … 값" 형태의 자체 줄
//  hidden — 모바일에서 생략
type MobileSlot = "title" | "value" | "meta" | "row" | "hidden";

export type DataColumn<T> = {
  key: string;
  label: string;
  cell: (row: T) => React.ReactNode;
  /** 데스크톱 grid track (기본 auto) */
  width?: string;
  align?: "left" | "right";
  mobile?: MobileSlot;
};

/**
 * 목록을 한 벌의 정의로 두 가지 레이아웃으로 렌더한다.
 *  - lg 이상: 기존과 같은 표(헤더 + grid 행)
 *  - lg 미만: 행 하나가 카드 한 장 (가로 스크롤 없이 읽힌다)
 * 폰에서 표를 가로로 미는 것을 없애기 위한 Phase 1 기본 도구.
 */
export function DataList<T>({
  columns,
  rows,
  rowKey,
  empty = "내역이 없습니다.",
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: React.ReactNode;
  className?: string;
}) {
  const template = columns.map((c) => c.width ?? "auto").join(" ");
  const slot = (c: DataColumn<T>) => c.mobile ?? "row";

  const titleCols = columns.filter((c) => slot(c) === "title");
  const valueCols = columns.filter((c) => slot(c) === "value");
  const metaCols = columns.filter((c) => slot(c) === "meta");
  const rowCols = columns.filter((c) => slot(c) === "row");

  if (rows.length === 0) {
    return <div className="py-8 text-center text-sm text-text-tertiary">{empty}</div>;
  }

  return (
    <div className={className}>
      {/* 데스크톱 — 표 */}
      <div className="hidden lg:block">
        <div
          className="grid items-center gap-3 border-b py-2.5 text-[11px] font-semibold tracking-wide text-text-tertiary uppercase"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span key={c.key} className={cn(c.align === "right" && "text-right")}>
              {c.label}
            </span>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={rowKey(r, i)}
            className="grid items-center gap-3 border-b py-3 text-sm last:border-0"
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <span key={c.key} className={cn("min-w-0", c.align === "right" && "text-right")}>
                {c.cell(r)}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* 모바일 — 행 하나가 카드 한 장 */}
      <div className="lg:hidden">
        {rows.map((r, i) => (
          <div key={rowKey(r, i)} className="space-y-1.5 border-b py-3 last:border-0">
            {titleCols.length > 0 || valueCols.length > 0 ? (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  {titleCols.map((c) => (
                    <div key={c.key} className="text-[14px] font-semibold text-text-primary">
                      {c.cell(r)}
                    </div>
                  ))}
                  {metaCols.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-text-tertiary">
                      {metaCols.map((c, mi) => (
                        <React.Fragment key={c.key}>
                          {mi > 0 ? <span aria-hidden>·</span> : null}
                          <span className="min-w-0">{c.cell(r)}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : null}
                </div>
                {valueCols.length > 0 ? (
                  <div className="shrink-0 space-y-1 text-right">
                    {valueCols.map((c) => (
                      <div key={c.key} className="text-[14px] font-bold">
                        {c.cell(r)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {rowCols.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="shrink-0 text-text-secondary">{c.label}</span>
                <span className="min-w-0 text-right">{c.cell(r)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

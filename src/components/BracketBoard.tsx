"use client";

import { forwardRef } from "react";
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  BracketLayout,
  HEADER_H,
  roundLabel,
} from "@/lib/bracket";

interface BracketBoardProps {
  layout: BracketLayout;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}

const BracketBoard = forwardRef<HTMLDivElement, BracketBoardProps>(
  function BracketBoard({ layout, values, onChange }, ref) {
    const { columns, segments, width, height, numRounds } = layout;

    return (
      <div
        ref={ref}
        className="relative bg-white"
        style={{ width, height, minWidth: width, minHeight: height }}
      >
        <svg
          width={width}
          height={height}
          className="absolute left-0 top-0 pointer-events-none"
        >
          {segments.map((s, i) => (
            <line
              key={i}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#334155"
              strokeWidth={1.5}
            />
          ))}
        </svg>

        {columns.map((col, colIdx) =>
          col.length === 0 ? null : (
            <div
              key={colIdx}
              className="absolute top-0 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500"
              style={{
                left: col[0].x,
                width: BOX_WIDTH,
                top: (HEADER_H - 16) / 2,
              }}
            >
              {roundLabel(colIdx, numRounds, col[0].isChampion)}
            </div>
          )
        )}

        {layout.boxes.map((box) => {
          const isEditable = !box.isBye;
          const value =
            values[box.id] ?? (box.isBye ? "BYE" : "");
          return (
            <div
              key={box.id}
              className="absolute"
              style={{
                left: box.x,
                top: box.y - BOX_HEIGHT / 2,
                width: BOX_WIDTH,
                height: BOX_HEIGHT,
              }}
            >
              <input
                type="text"
                disabled={!isEditable}
                value={value}
                onChange={(e) => onChange(box.id, e.target.value)}
                placeholder={
                  box.isLeaf && !box.isBye ? `Player ${box.seed}` : ""
                }
                className={[
                  "h-full w-full rounded-[3px] border px-2 text-[13px] outline-none transition-colors",
                  box.isChampion
                    ? "border-amber-400 bg-amber-50 font-bold text-amber-900 text-center focus:border-amber-500"
                    : box.isBye
                    ? "border-slate-200 bg-slate-100 text-center italic text-slate-400"
                    : "border-slate-400 bg-white text-slate-800 focus:border-red-500 focus:ring-1 focus:ring-red-500",
                ].join(" ")}
              />
            </div>
          );
        })}
      </div>
    );
  }
);

export default BracketBoard;

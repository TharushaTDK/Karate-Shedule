"use client";

import { forwardRef } from "react";
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  BracketLayout,
  COL_GAP,
  HEADER_H,
  MARGIN,
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
          const value = values[box.id] ?? (box.isBye ? "BYE" : "");
          const isRedRow = box.row % 2 === 0;
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
                className={[
                  "h-full w-full rounded-none border px-2 text-[13px] outline-none transition-colors",
                  box.isChampion
                    ? "border-slate-600 bg-white text-slate-800 focus:border-slate-500 focus:ring-1 focus:ring-slate-400"
                    : box.isBye
                    ? "border-slate-300 bg-slate-100 text-center italic text-slate-400"
                    : isRedRow
                    ? "border-slate-600 bg-gradient-to-r from-red-400 to-white text-slate-900 focus:border-red-600 focus:ring-1 focus:ring-red-600"
                    : "border-slate-600 bg-gradient-to-r from-sky-400 to-white text-slate-900 focus:border-sky-600 focus:ring-1 focus:ring-sky-600",
                ].join(" ")}
              />
            </div>
          );
        })}

        <ResultsPanel layout={layout} />
      </div>
    );
  }
);

function ResultsPanel({ layout }: { layout: BracketLayout }) {
  const champion = layout.boxes.find((b) => b.isChampion);
  if (!champion) return null;

  const panelX = champion.x + BOX_WIDTH + COL_GAP;
  const panelW = Math.max(140, layout.width - panelX - MARGIN);

  const resultsRows = 6;
  const resultRowH = 24;
  const resultsTop = champion.y + 60;
  const resultsHeight = resultsRows * resultRowH;

  const refereesTop = resultsTop + resultsHeight + 50;
  const labelColW = 68;
  const refCellW = (panelW - labelColW) / 3;

  return (
    <>
      <div
        className="absolute border border-slate-600 bg-white"
        style={{ left: panelX, top: resultsTop, width: panelW, height: resultsHeight }}
      >
        {Array.from({ length: resultsRows }).map((_, i) => (
          <div
            key={i}
            className={i === 0 ? "" : "border-t border-slate-600"}
            style={{ height: resultRowH }}
          />
        ))}
      </div>

      <div
        className="absolute border border-slate-600 bg-white text-[11px] text-slate-800"
        style={{ left: panelX, top: refereesTop, width: panelW }}
      >
        <div className="flex">
          <div
            className="flex items-center border-r border-slate-600 bg-slate-300 px-1.5 font-semibold"
            style={{ width: labelColW, height: 26 }}
          >
            Referees
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 2 ? "" : "border-r border-slate-600"}
              style={{ width: refCellW, height: 26 }}
            />
          ))}
        </div>
        <div className="flex border-t border-slate-600">
          <div style={{ width: labelColW, height: 26 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 2 ? "" : "border-r border-slate-600"}
              style={{ width: refCellW, height: 26 }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export default BracketBoard;

"use client";

import { forwardRef } from "react";
import {
  BOX_HEIGHT,
  BOX_WIDTH,
  BracketLayout,
  COL_GAP,
  HEADER_H,
  MARGIN,
  REFEREE_ROWS,
  REFEREE_ROW_H,
  REFEREES_GAP,
  RESULT_LABEL_W,
  RESULT_PLACES,
  RESULT_ROW_H,
  RESULTS_TOP_GAP,
  roundLabel,
} from "@/lib/bracket";

interface BracketBoardProps {
  layout: BracketLayout;
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
}

// Shrinks the font size as the typed name gets longer so it keeps fitting
// on one line inside the fixed-width box instead of being clipped. Uses an
// offscreen canvas to measure the actual rendered text width rather than a
// character-count guess, so it fits precisely down to the readability floor.
const BASE_FONT_SIZE = 13;
const MIN_FONT_SIZE = 7;
const BOX_PADDING_X = 6; // matches the input's px-1.5
const BOX_BORDER_X = 1;
const AVAILABLE_TEXT_WIDTH = BOX_WIDTH - 2 * (BOX_PADDING_X + BOX_BORDER_X);

let measureCtx: CanvasRenderingContext2D | null | undefined;
let cachedFontFamily: string | undefined;
function getFontFamily(): string {
  if (cachedFontFamily === undefined) {
    cachedFontFamily =
      typeof document === "undefined"
        ? "sans-serif"
        : getComputedStyle(document.body).fontFamily || "sans-serif";
  }
  return cachedFontFamily;
}

function measureTextWidth(text: string, fontPx: number): number {
  if (typeof document === "undefined") return 0;
  if (measureCtx === undefined) {
    measureCtx = document.createElement("canvas").getContext("2d");
  }
  if (!measureCtx) return 0;
  measureCtx.font = `${fontPx}px ${getFontFamily()}`;
  return measureCtx.measureText(text).width;
}

function fitFontSize(text: string): number {
  if (!text) return BASE_FONT_SIZE;
  const widthAtBase = measureTextWidth(text, BASE_FONT_SIZE);
  if (widthAtBase <= 0 || widthAtBase <= AVAILABLE_TEXT_WIDTH) return BASE_FONT_SIZE;
  const scaled = (AVAILABLE_TEXT_WIDTH / widthAtBase) * BASE_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.floor(scaled * 10) / 10);
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
                style={{ fontSize: box.isBye ? undefined : fitFontSize(value) }}
                className={[
                  "h-full w-full rounded-none border px-1.5 outline-none transition-colors",
                  box.isBye ? "text-[13px]" : "",
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

  const resultsTop = champion.y + RESULTS_TOP_GAP;
  const resultsHeight = RESULT_PLACES.length * RESULT_ROW_H;

  const refereesTop = resultsTop + resultsHeight + REFEREES_GAP;
  const refCellW = (panelW - RESULT_LABEL_W) / 3;

  return (
    <>
      <div
        className="absolute border border-slate-600 bg-white text-[11px] text-slate-800"
        style={{ left: panelX, top: resultsTop, width: panelW, height: resultsHeight }}
      >
        {RESULT_PLACES.map((place, i) => (
          <div
            key={i}
            className={["flex", i === 0 ? "" : "border-t border-slate-600"].join(" ")}
            style={{ height: RESULT_ROW_H }}
          >
            <div
              className="flex items-center border-r border-slate-600 bg-slate-100 px-1.5 font-semibold"
              style={{ width: RESULT_LABEL_W }}
            >
              {place}
            </div>
            <div className="flex-1" />
          </div>
        ))}
      </div>

      <div
        className="absolute border border-[#7a7a7a] bg-white text-[11px] text-slate-800"
        style={{ left: panelX, top: refereesTop, width: panelW }}
      >
        <div className="flex">
          <div
            className="flex items-center border-r border-[#7a7a7a] bg-[#c0c0c0] px-1.5 font-semibold"
            style={{ width: RESULT_LABEL_W, height: REFEREE_ROW_H }}
          >
            Referees
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={i === 2 ? "" : "border-r border-[#7a7a7a]"}
              style={{ width: refCellW, height: REFEREE_ROW_H }}
            />
          ))}
        </div>
        {Array.from({ length: REFEREE_ROWS - 1 }).map((_, rowIdx) => (
          <div key={rowIdx} className="flex border-t border-[#7a7a7a]">
            <div
              className="border-r border-[#7a7a7a]"
              style={{ width: RESULT_LABEL_W, height: REFEREE_ROW_H }}
            />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={i === 2 ? "" : "border-r border-[#7a7a7a]"}
                style={{ width: refCellW, height: REFEREE_ROW_H }}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export default BracketBoard;

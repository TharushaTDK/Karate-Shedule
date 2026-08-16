"use client";

import { forwardRef, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
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
  baseFontSize?: number;
  isExporting?: boolean;
}

// Shrinks the font size as the typed name gets longer so it keeps fitting
// inside the fixed-size box instead of spilling outside it. Text wraps onto
// additional lines (like pressing Enter) as it grows, and the font shrinks
// only as far as needed so the wrapped block still fits the box height.
// Uses an offscreen canvas to measure real rendered text width rather than
// a character-count guess, so both the wrap points and the fit are precise.
// The starting point (baseFontSize) is user-adjustable via the toolbar
// dropdown; this just keeps long names from overflowing that chosen size.
export const DEFAULT_FONT_SIZE = 13;
export const MIN_FONT_SIZE_OPTION = 8;
export const MAX_FONT_SIZE_OPTION = 20;
const MIN_FONT_SIZE = 7;
const BOX_PADDING_X = 6; // matches px-1.5
const BOX_PADDING_Y = 2; // matches py-0.5
const BOX_BORDER_X = 1;
const BOX_BORDER_Y = 1;
const AVAILABLE_TEXT_WIDTH = BOX_WIDTH - 2 * (BOX_PADDING_X + BOX_BORDER_X);
const AVAILABLE_TEXT_HEIGHT = BOX_HEIGHT - 2 * (BOX_PADDING_Y + BOX_BORDER_Y);
const LINE_HEIGHT_RATIO = 1.4;
// Matches the ratio that was already rendering cleanly in html2canvas for a
// single full-height box (38px box / ~13.5px font ≈ 2.8) — see
// fitSingleLineFontSize.
const EXPORT_SAFE_MAX_FONT_SIZE = BOX_HEIGHT / 2.8;

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

// Simulates greedy word-wrap at a given font size and returns the actual
// wrapped lines the live (CSS-wrapped) editor will show. Words that are
// themselves wider than the box (e.g. one long unbroken name) are
// hard-broken character by character, matching the box's `overflow-wrap:
// anywhere` CSS. Used to decide how far fitFontSize needs to shrink text so
// the wrapped block still fits the box height, and to size the live
// EditableCell's centering padding.
function wrapTextIntoLines(text: string, fontPx: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const spaceWidth = measureTextWidth(" ", fontPx);
  const lines: string[] = [];
  let current = "";
  let currentWidth = 0;

  function flush() {
    if (current) lines.push(current);
    current = "";
    currentWidth = 0;
  }

  for (const word of words) {
    let remaining = word;
    let wordWidth = measureTextWidth(remaining, fontPx);

    while (wordWidth > maxWidth && remaining.length > 1) {
      let fitLen = remaining.length - 1;
      while (
        fitLen > 1 &&
        measureTextWidth(remaining.slice(0, fitLen), fontPx) > maxWidth
      ) {
        fitLen--;
      }
      flush();
      lines.push(remaining.slice(0, fitLen));
      remaining = remaining.slice(fitLen);
      wordWidth = measureTextWidth(remaining, fontPx);
    }

    const neededWidth =
      currentWidth === 0 ? wordWidth : currentWidth + spaceWidth + wordWidth;
    if (neededWidth <= maxWidth) {
      current = currentWidth === 0 ? remaining : `${current} ${remaining}`;
      currentWidth = neededWidth;
    } else {
      flush();
      current = remaining;
      currentWidth = wordWidth;
    }
  }
  flush();

  return lines.length ? lines : [""];
}

function countWrappedLines(text: string, fontPx: number, maxWidth: number): number {
  return wrapTextIntoLines(text, fontPx, maxWidth).length;
}

function fitFontSize(text: string, baseFontSize: number): number {
  if (!text) return baseFontSize;
  for (let size = baseFontSize; size > MIN_FONT_SIZE; size -= 0.5) {
    const lines = countWrappedLines(text, size, AVAILABLE_TEXT_WIDTH);
    const totalHeight = lines * size * LINE_HEIGHT_RATIO;
    if (totalHeight <= AVAILABLE_TEXT_HEIGHT) {
      return Math.round(size * 10) / 10;
    }
  }
  return MIN_FONT_SIZE;
}

// Shrinks font size to keep text on a single unwrapped line — used for the
// exported/static render, which (unlike the live editor) can't reliably
// wrap text across multiple lines. See the comment where this is called.
function fitSingleLineFontSize(text: string, baseFontSize: number): number {
  // html2canvas centers the input's text vertically as roughly
  // (boxHeight - fontSize) / 2 from the top, without reserving extra room
  // for the font's ascent above that — so a font close to the box's full
  // height clips its own ascenders/descenders. Capping how large the font
  // is allowed to get (independent of the width-based shrinking below)
  // keeps enough headroom regardless of the user's chosen base size.
  const startSize = Math.min(baseFontSize, EXPORT_SAFE_MAX_FONT_SIZE);
  if (!text) return startSize;
  for (let size = startSize; size > MIN_FONT_SIZE; size -= 0.5) {
    if (measureTextWidth(text, size) <= AVAILABLE_TEXT_WIDTH) {
      return Math.round(size * 10) / 10;
    }
  }
  return MIN_FONT_SIZE;
}

interface EditableCellProps {
  value: string;
  onChange: (value: string) => void;
  className: string;
  style: CSSProperties;
}

// A contentEditable div instead of an <input>, so long names can wrap onto
// extra lines within the box instead of overflowing it. Kept effectively
// "controlled" without fighting the caret: the DOM is only overwritten when
// `value` changes from something other than what this cell itself just
// emitted (e.g. on mount, or when a PDF import replaces the data).
function EditableCell({ value, onChange, className, style }: EditableCellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (lastEmittedRef.current !== value && el.innerText !== value) {
      el.innerText = value;
    }
    lastEmittedRef.current = value;
  }, [value]);

  function handleInput(e: React.FormEvent<HTMLDivElement>) {
    const text = (e.currentTarget.innerText || "").replace(/\n/g, " ");
    lastEmittedRef.current = text;
    onChange(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // Wrapping is automatic; don't let Enter insert a literal line break.
    if (e.key === "Enter") e.preventDefault();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain").replace(/\s+/g, " ").trim();
    document.execCommand("insertText", false, text);
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="false"
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      className={className}
      style={style}
    />
  );
}

const BracketBoard = forwardRef<HTMLDivElement, BracketBoardProps>(
  function BracketBoard(
    { layout, values, onChange, baseFontSize = DEFAULT_FONT_SIZE, isExporting = false },
    ref
  ) {
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
          const fontSize = box.isBye
            ? baseFontSize
            : fitFontSize(value, baseFontSize);
          const lineHeightPx =
            Math.round(fontSize * LINE_HEIGHT_RATIO * 100) / 100;
          const staticLines = value
            ? wrapTextIntoLines(value, fontSize, AVAILABLE_TEXT_WIDTH)
            : [""];
          const textBlockHeight = staticLines.length * lineHeightPx;
          const centeringPaddingTop = Math.max(
            0,
            (AVAILABLE_TEXT_HEIGHT - textBlockHeight) / 2
          );
          // html2canvas (used for PDF export) only applies text-align and
          // vertical centering to genuine <input>/<textarea> elements — a
          // plain <div> (or contentEditable) is always painted flush
          // top-left regardless of CSS, and its own multi-line wrapping is
          // unreliable too. So for export we fall back to a single
          // full-height <input readOnly>, matching how a single-line value
          // already rendered correctly there, and just shrink the font
          // enough to keep the (unwrapped) text on that one line — the
          // wrapped multi-line view stays live-editor only, where the DOM
          // renders it correctly already.
          const exportFontSize = box.isBye
            ? baseFontSize
            : fitSingleLineFontSize(value, baseFontSize);
          const editableTextStyle: CSSProperties = {
            fontSize,
            // A unitless line-height (e.g. "1.15") is real browsers' cue to
            // scale it off the element's own font-size; kept explicit in px
            // here too so the live view matches the export pixel-for-pixel.
            lineHeight: `${lineHeightPx}px`,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            paddingTop: centeringPaddingTop,
          };
          return (
            <div
              key={box.id}
              className={[
                "absolute rounded-none border transition-colors",
                box.isChampion
                  ? "border-slate-600 bg-white text-slate-800 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-400"
                  : box.isBye
                  ? "border-slate-300 bg-slate-100 italic text-slate-400"
                  : isRedRow
                  ? "border-slate-600 bg-gradient-to-r from-red-400 to-white text-slate-900 focus-within:border-red-600 focus-within:ring-1 focus-within:ring-red-600"
                  : "border-slate-600 bg-gradient-to-r from-sky-400 to-white text-slate-900 focus-within:border-sky-600 focus-within:ring-1 focus-within:ring-sky-600",
              ].join(" ")}
              style={{
                left: box.x,
                top: box.y - BOX_HEIGHT / 2,
                width: BOX_WIDTH,
                height: BOX_HEIGHT,
                boxSizing: "border-box",
                overflow: "hidden",
                paddingLeft: BOX_PADDING_X,
                paddingRight: BOX_PADDING_X,
                paddingBottom: BOX_PADDING_Y,
                paddingTop: BOX_PADDING_Y,
                textAlign: "center",
              }}
            >
              {isEditable && !isExporting ? (
                <EditableCell
                  value={value}
                  onChange={(v) => onChange(box.id, v)}
                  className="w-full cursor-text outline-none"
                  style={editableTextStyle}
                />
              ) : (
                <input
                  readOnly
                  tabIndex={-1}
                  value={value || " "}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    fontSize: exportFontSize,
                    fontFamily: "inherit",
                    color: "inherit",
                    textAlign: "center",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    padding: 0,
                    margin: 0,
                    pointerEvents: "none",
                  }}
                />
              )}
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

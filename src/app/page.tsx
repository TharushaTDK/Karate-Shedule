"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import SetupForm, { SetupValues } from "@/components/SetupForm";
import BracketBoard from "@/components/BracketBoard";
import { generateBracket } from "@/lib/bracket";
import { exportElementsToPdf } from "@/lib/exportPdf";
import logo from "@/Assets/Logo.png";

type Stage = "setup" | "bracket";

type BracketData = {
  id: string;
  title: string;
  values: Record<string, string>;
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export default function Home() {
  const [stage, setStage] = useState<Stage>("setup");
  const [numPlayers, setNumPlayers] = useState(16);
  const [brackets, setBrackets] = useState<BracketData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(1);

  const exportRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstPageRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const autoFitRef = useRef(true);

  const layout = useMemo(() => generateBracket(numPlayers), [numPlayers]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  function fitToScreen() {
    const main = mainRef.current;
    const card = firstPageRef.current;
    if (!main || !card) return;

    const currentZoom = zoomRef.current || 1;
    const rect = card.getBoundingClientRect();
    const trueWidth = rect.width / currentZoom;
    const trueHeight = rect.height / currentZoom;
    if (trueWidth <= 0 || trueHeight <= 0) return;

    const cs = getComputedStyle(main);
    const padX = parseFloat(cs.paddingLeft || "0") + parseFloat(cs.paddingRight || "0");
    const padY = parseFloat(cs.paddingTop || "0") + parseFloat(cs.paddingBottom || "0");
    const availW = main.clientWidth - padX;
    const availH = main.clientHeight - padY;
    if (availW <= 0 || availH <= 0) return;

    const fit = Math.min(availW / trueWidth, availH / trueHeight);
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit));
    autoFitRef.current = true;
    setZoom(Math.round(clamped * 100) / 100);
  }

  // Fit the page to the screen whenever we arrive at the bracket view
  // (or the bracket size changes), so the full page is visible right away.
  useLayoutEffect(() => {
    if (stage === "bracket") {
      fitToScreen();
    }
  }, [stage, layout]);

  useEffect(() => {
    if (stage !== "bracket") return;
    let timeout: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (autoFitRef.current) fitToScreen();
      }, 150);
    }
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener("resize", onResize);
    };
  }, [stage]);

  function handleGenerate(setup: SetupValues) {
    setNumPlayers(setup.numPlayers);
    setBrackets([{ id: crypto.randomUUID(), title: setup.title, values: {} }]);
    setStage("bracket");
  }

  function handleValueChange(bracketId: string, id: string, value: string) {
    setBrackets((prev) =>
      prev.map((b) =>
        b.id === bracketId ? { ...b, values: { ...b.values, [id]: value } } : b
      )
    );
  }

  function handleTitleChange(bracketId: string, title: string) {
    setBrackets((prev) =>
      prev.map((b) => (b.id === bracketId ? { ...b, title } : b))
    );
  }

  function handleDuplicate() {
    setBrackets((prev) => {
      if (prev.length === 0) return prev;
      const lastBracket = prev[prev.length - 1];
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: lastBracket.title,
          values: {}, // Do not duplicate data, provide empty template
        },
      ];
    });
  }

  function handleReset() {
    if (
      !window.confirm(
        "Start a new bracket? Any names you've entered will be lost."
      )
    ) {
      return;
    }
    setBrackets([]);
    setStage("setup");
  }

  function handleZoomIn() {
    autoFitRef.current = false;
    setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }

  function handleZoomOut() {
    autoFitRef.current = false;
    setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }

  async function handleDownload() {
    if (!exportRef.current || isExporting) return;

    setIsExporting(true);

    const previousZoom = zoom;
    setZoom(1);

    // Wait a moment for React to re-render the DOM, replacing <input> with <div>
    // and for the zoom reset to take effect before capturing.
    await new Promise(resolve => setTimeout(resolve, 150));

    const elements = Array.from(exportRef.current.querySelectorAll('.bracket-page')) as HTMLElement[];
    if (elements.length === 0) {
      setIsExporting(false);
      return;
    }

    try {
      const firstTitle = brackets[0]?.title || "karate-bracket";
      const filename = `${firstTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}.pdf`;
      await exportElementsToPdf(elements, filename || "bracket.pdf");
    } catch (err) {
      console.error(err);
      window.alert("Something went wrong while generating the PDF.");
    } finally {
      setIsExporting(false);
      setZoom(previousZoom);
    }
  }

  if (stage === "setup") {
    return <SetupForm onSubmit={handleGenerate} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur sm:gap-3 sm:px-8 sm:py-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:px-3 sm:py-2 sm:text-sm"
          >
            ← New Bracket
          </button>
          <button
            onClick={handleDuplicate}
            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:px-3 sm:py-2 sm:text-sm"
          >
            + Add Page
          </button>
          <div className="hidden text-sm text-slate-500 sm:block">
            <span className="font-semibold text-slate-700">
              {layout.numPlayers}
            </span>{" "}
            players &middot;{" "}
            <span className="font-semibold text-slate-700">
              {layout.size}
            </span>{" "}
            draw slots &middot;{" "}
            <span className="font-semibold text-slate-700">
              {brackets.length}
            </span>{" "}
            pages
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-red-700/25 transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {isExporting ? "Preparing PDF…" : "Download PDF"}
        </button>
      </header>

      <main ref={mainRef} className="relative flex-1 overflow-auto p-4 sm:p-8 bg-slate-200">
        <div
          ref={exportRef}
          className="flex flex-col gap-10 items-start sm:items-center"
          style={{ zoom }}
        >
          {brackets.map((bracket, index) => (
            <div
              key={bracket.id}
              ref={index === 0 ? firstPageRef : undefined}
              className="bracket-page relative isolate inline-block min-w-full overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.15),0_10px_30px_rgba(0,0,0,0.15)] sm:min-w-0 bg-white"
            >
              <div className="border-b border-slate-400 bg-slate-300 px-4 py-2.5">
                {isExporting ? (
                  <div className="w-full bg-transparent text-left text-sm font-bold uppercase tracking-wide text-slate-800 sm:text-base py-[1px]">
                    {bracket.title || "Draw title"}
                  </div>
                ) : (
                  <input
                    value={bracket.title}
                    onChange={(e) => handleTitleChange(bracket.id, e.target.value)}
                    placeholder="Draw title"
                    className="w-full bg-transparent text-left text-sm font-bold uppercase tracking-wide text-slate-800 outline-none sm:text-base"
                  />
                )}
              </div>
              <img
                src={logo.src}
                alt=""
                className="absolute right-4 top-14 z-20 h-12 w-12 object-contain sm:right-6 sm:top-16 sm:h-16 sm:w-16"
              />
              <div className="p-6">
                <BracketBoard
                  layout={layout}
                  values={bracket.values}
                  onChange={(id, value) => handleValueChange(bracket.id, id, value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-4 right-4 z-30 flex items-center gap-1 rounded-lg border border-slate-300 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur sm:bottom-6 sm:right-6">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="flex h-7 w-7 items-center justify-center rounded-md text-base font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <button
            onClick={fitToScreen}
            title="Fit to screen"
            className="min-w-[3.5rem] rounded-md px-2 py-1 text-center text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex h-7 w-7 items-center justify-center rounded-md text-base font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
      </main>
    </div>
  );
}

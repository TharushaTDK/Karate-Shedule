"use client";

import { useMemo, useRef, useState } from "react";
import SetupForm, { SetupValues } from "@/components/SetupForm";
import BracketBoard from "@/components/BracketBoard";
import { generateBracket } from "@/lib/bracket";
import { exportElementsToPdf } from "@/lib/exportPdf";

type Stage = "setup" | "bracket";

type BracketData = {
  id: string;
  title: string;
  values: Record<string, string>;
};

export default function Home() {
  const [stage, setStage] = useState<Stage>("setup");
  const [numPlayers, setNumPlayers] = useState(16);
  const [brackets, setBrackets] = useState<BracketData[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => generateBracket(numPlayers), [numPlayers]);

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
          values: { ...lastBracket.values },
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

  async function handleDownload() {
    if (!exportRef.current || isExporting) return;
    
    setIsExporting(true);
    
    // Wait a moment for React to re-render the DOM, replacing <input> with <div>
    await new Promise(resolve => setTimeout(resolve, 100));

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
    }
  }

  if (stage === "setup") {
    return <SetupForm onSubmit={handleGenerate} />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            ← New Bracket
          </button>
          <button
            onClick={handleDuplicate}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
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
          className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-red-700/25 transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isExporting ? "Preparing PDF…" : "Download PDF"}
        </button>
      </header>

      <main className="flex-1 overflow-auto p-4 sm:p-8 bg-slate-50">
        <div ref={exportRef} className="flex flex-col gap-8 items-center">
          {brackets.map((bracket) => (
            <div key={bracket.id} className="bracket-page inline-block min-w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200 sm:min-w-0 bg-white">
              <div className="border-b border-sky-300 bg-sky-100 px-6 py-3">
                {isExporting ? (
                  <div className="w-full bg-transparent text-center text-sm font-bold uppercase tracking-wide text-slate-800 sm:text-base py-[1px]">
                    {bracket.title || "Draw title"}
                  </div>
                ) : (
                  <input
                    value={bracket.title}
                    onChange={(e) => handleTitleChange(bracket.id, e.target.value)}
                    placeholder="Draw title"
                    className="w-full bg-transparent text-center text-sm font-bold uppercase tracking-wide text-slate-800 outline-none sm:text-base"
                  />
                )}
              </div>
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
      </main>
    </div>
  );
}

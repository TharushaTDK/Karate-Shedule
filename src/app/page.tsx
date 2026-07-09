"use client";

import { useMemo, useRef, useState } from "react";
import SetupForm, { SetupValues } from "@/components/SetupForm";
import BracketBoard from "@/components/BracketBoard";
import { generateBracket } from "@/lib/bracket";
import { exportElementToPdf } from "@/lib/exportPdf";

type Stage = "setup" | "bracket";

export default function Home() {
  const [stage, setStage] = useState<Stage>("setup");
  const [title, setTitle] = useState("");
  const [numPlayers, setNumPlayers] = useState(16);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isExporting, setIsExporting] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => generateBracket(numPlayers), [numPlayers]);

  function handleGenerate(setup: SetupValues) {
    setTitle(setup.title);
    setNumPlayers(setup.numPlayers);
    setValues({});
    setStage("bracket");
  }

  function handleValueChange(id: string, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function handleReset() {
    if (
      !window.confirm(
        "Start a new bracket? Any names you've entered will be lost."
      )
    ) {
      return;
    }
    setValues({});
    setStage("setup");
  }

  async function handleDownload() {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const filename = `${(title || "karate-bracket")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}.pdf`;
      await exportElementToPdf(exportRef.current, filename || "bracket.pdf");
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
          <div className="hidden text-sm text-slate-500 sm:block">
            <span className="font-semibold text-slate-700">
              {layout.numPlayers}
            </span>{" "}
            players &middot;{" "}
            <span className="font-semibold text-slate-700">
              {layout.size}
            </span>{" "}
            draw slots
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

      <main className="flex-1 overflow-auto p-4 sm:p-8">
        <div className="inline-block min-w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-slate-200 sm:min-w-0">
          <div ref={exportRef} className="bg-white">
            <div className="border-b border-sky-300 bg-sky-100 px-6 py-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Draw title"
                className="w-full bg-transparent text-center text-sm font-bold uppercase tracking-wide text-slate-800 outline-none sm:text-base"
              />
            </div>
            <div className="p-6">
              <BracketBoard
                layout={layout}
                values={values}
                onChange={handleValueChange}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

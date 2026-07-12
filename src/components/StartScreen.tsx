"use client";

import { useRef, useState } from "react";
import logo from "@/Assets/Logo.png";

interface StartScreenProps {
  onImport: (file: File) => Promise<void>;
  onCreateNew: () => void;
}

export default function StartScreen({ onImport, onCreateNew }: StartScreenProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handlePickFile() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setError(null);
    try {
      await onImport(file);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while reading that PDF."
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-slate-900 px-6 py-7 text-white sm:px-8">
          <div className="flex items-start gap-4">
            <img
              src={logo.src}
              alt="Club logo"
              className="h-14 w-14 flex-shrink-0 object-contain sm:h-16 sm:w-16"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
                Kumite Draw Builder
              </p>
              <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                Welcome back
              </h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-red-100/90">
            Continue editing a bracket you already downloaded, or start a
            fresh draw.
          </p>
        </div>

        <div className="space-y-4 px-8 py-8">
          <button
            type="button"
            onClick={handlePickFile}
            disabled={isImporting}
            className="w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-700/25 transition-colors hover:bg-red-800 active:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isImporting ? "Reading PDF…" : "Import a downloaded PDF"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={onCreateNew}
            disabled={isImporting}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Create a new bracket
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Only PDFs downloaded from this app can be re-imported and edited —
        other PDFs will be rejected.
      </p>
    </div>
  );
}

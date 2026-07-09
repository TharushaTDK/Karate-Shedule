"use client";

import { useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS, nextPowerOfTwo } from "@/lib/bracket";

export interface SetupValues {
  title: string;
  numPlayers: number;
}

interface SetupFormProps {
  onSubmit: (values: SetupValues) => void;
}

export default function SetupForm({ onSubmit }: SetupFormProps) {
  const [title, setTitle] = useState(
    "DRAW #01 MALE KUMITE L-0 (6-7 YEARS -25KG)"
  );
  const [numPlayersInput, setNumPlayersInput] = useState("16");
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(numPlayersInput);
  const isValid =
    Number.isFinite(parsed) &&
    parsed >= MIN_PLAYERS &&
    parsed <= MAX_PLAYERS &&
    Number.isInteger(parsed);
  const bracketSize = isValid ? nextPowerOfTwo(parsed) : null;
  const byes = isValid && bracketSize ? bracketSize - parsed : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      setError(
        `Enter a whole number of players between ${MIN_PLAYERS} and ${MAX_PLAYERS}.`
      );
      return;
    }
    setError(null);
    onSubmit({ title: title.trim() || "KARATE KUMITE DRAW", numPlayers: parsed });
  }

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center px-4 py-16">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-slate-900 px-8 py-7 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-100">
            Kumite Draw Builder
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Create a Karate Tournament Bracket
          </h1>
          <p className="mt-2 text-sm text-red-100/90">
            Enter the number of competitors and we&apos;ll generate the
            elimination sheet — ready for names and a one-page PDF export.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-8 py-8">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Draw title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="e.g. DRAW #01 MALE KUMITE L-0 (6-7 YEARS -25KG)"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Number of players
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={MIN_PLAYERS}
              max={MAX_PLAYERS}
              value={numPlayersInput}
              onChange={(e) => setNumPlayersInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="e.g. 10"
            />
            {isValid ? (
              <p className="mt-2 text-xs text-slate-500">
                Bracket size:{" "}
                <span className="font-semibold text-slate-700">
                  {bracketSize}
                </span>{" "}
                slots
                {byes ? (
                  <>
                    {" "}
                    &middot;{" "}
                    <span className="font-semibold text-slate-700">
                      {byes}
                    </span>{" "}
                    bye{byes === 1 ? "" : "s"} distributed evenly
                  </>
                ) : (
                  <> &middot; no byes needed</>
                )}
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-400">
                Any number works — byes fill the rest of the draw
                automatically.
              </p>
            )}
            {error && (
              <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-red-700 px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-red-700/25 transition-colors hover:bg-red-800 active:bg-red-900"
          >
            Generate Bracket
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Works for any number of competitors — the sheet always renders as a
        single-page PDF.
      </p>
    </div>
  );
}

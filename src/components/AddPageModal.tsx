"use client";

import { useState } from "react";
import { MAX_PLAYERS, MIN_PLAYERS, nextPowerOfTwo } from "@/lib/bracket";
import { SetupValues } from "./SetupForm";

interface AddPageModalProps {
  defaultTitle: string;
  defaultNumPlayers: number;
  onSubmit: (values: SetupValues) => void;
  onCancel: () => void;
}

export default function AddPageModal({
  defaultTitle,
  defaultNumPlayers,
  onSubmit,
  onCancel,
}: AddPageModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [numPlayersInput, setNumPlayersInput] = useState(String(defaultNumPlayers));
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(numPlayersInput);
  const isValid =
    Number.isFinite(parsed) &&
    parsed >= MIN_PLAYERS &&
    parsed <= MAX_PLAYERS &&
    Number.isInteger(parsed);
  const bracketSize = isValid ? nextPowerOfTwo(parsed) : null;

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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-base font-bold text-slate-800">Add a new page</h2>
          <p className="mt-1 text-xs text-slate-500">
            Each page is its own draw — set the topic and number of players
            for this one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Draw title
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="e.g. DRAW #02 FEMALE KUMITE L-0 (8-9 YEARS -30KG)"
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

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-red-700/25 transition-colors hover:bg-red-800 active:bg-red-900"
            >
              Add Page
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

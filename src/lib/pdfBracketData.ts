// Downloaded bracket PDFs are rasterized images (see exportPdf.ts), so the
// visual page itself can't be parsed back into editable fields. Instead, we
// embed the original structured data (titles, player counts, entered names)
// as a hidden payload in the PDF's metadata when it's exported, and read it
// back out when the same file is re-imported.

import { PDFDocument } from "pdf-lib";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/bracket";

const MAGIC_PREFIX = "KKB1:"; // Karate Kumite Bracket, payload version 1

export interface BracketPdfPage {
  title: string;
  numPlayers: number;
  values: Record<string, string>;
}

interface BracketPdfPayload {
  magic: "karate-kumite-bracket";
  version: 1;
  brackets: BracketPdfPage[];
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isValidPage(value: unknown): value is BracketPdfPage {
  if (!value || typeof value !== "object") return false;
  const page = value as Record<string, unknown>;
  if (typeof page.title !== "string") return false;
  if (
    typeof page.numPlayers !== "number" ||
    !Number.isInteger(page.numPlayers) ||
    page.numPlayers < MIN_PLAYERS ||
    page.numPlayers > MAX_PLAYERS
  ) {
    return false;
  }
  if (!page.values || typeof page.values !== "object") return false;
  return Object.values(page.values as Record<string, unknown>).every(
    (v) => typeof v === "string"
  );
}

/**
 * Takes the raw bytes of an already-rendered PDF (from jsPDF) and returns
 * new PDF bytes with the bracket data embedded in the metadata. The visual
 * content of the PDF is left untouched.
 */
export async function embedBracketData(
  pdfBytes: ArrayBuffer,
  brackets: BracketPdfPage[]
): Promise<Uint8Array> {
  const payload: BracketPdfPayload = {
    magic: "karate-kumite-bracket",
    version: 1,
    brackets,
  };
  const doc = await PDFDocument.load(pdfBytes);
  doc.setKeywords([MAGIC_PREFIX + utf8ToBase64(JSON.stringify(payload))]);
  return doc.save();
}

/**
 * Reads a PDF file's bytes and, if it was produced by this app, returns the
 * original bracket pages. Returns null if the file has no embedded bracket
 * data (e.g. it's an unrelated PDF) or the data is corrupted.
 */
export async function extractBracketData(
  fileBytes: ArrayBuffer
): Promise<BracketPdfPage[] | null> {
  try {
    const doc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
    const keywords = doc.getKeywords();
    if (!keywords || !keywords.startsWith(MAGIC_PREFIX)) return null;

    const json = base64ToUtf8(keywords.slice(MAGIC_PREFIX.length));
    const payload = JSON.parse(json) as Partial<BracketPdfPayload>;

    if (
      payload.magic !== "karate-kumite-bracket" ||
      !Array.isArray(payload.brackets) ||
      payload.brackets.length === 0 ||
      !payload.brackets.every(isValidPage)
    ) {
      return null;
    }

    return payload.brackets;
  } catch {
    return null;
  }
}

export function downloadBytes(
  bytes: Uint8Array,
  filename: string,
  mimeType: string
) {
  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

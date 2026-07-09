// Single-elimination karate kumite bracket generation & layout.
//
// Given a number of entered players, we round up to the next power of two
// (the bracket "size"). Extra slots become BYEs. BYEs are distributed using
// the standard tournament seeding order so they are spread evenly across the
// draw instead of clumped at the bottom.

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 128;

export const BOX_WIDTH = 176;
export const BOX_HEIGHT = 38;
export const LEAF_GAP = 12;
export const COL_GAP = 60;
export const MARGIN = 28;
export const HEADER_H = 36;

export interface BracketBox {
  id: string;
  col: number;
  row: number;
  x: number;
  y: number;
  isBye: boolean;
  isChampion: boolean;
  isLeaf: boolean;
  seed?: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface BracketLayout {
  numPlayers: number;
  size: number;
  numRounds: number;
  columns: BracketBox[][];
  boxes: BracketBox[];
  segments: Segment[];
  width: number;
  height: number;
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard bracket seeding order: for a given size, returns the seed number
 * (1..size) that should occupy each leaf slot left-to-right, so that seeds
 * are spread apart as evenly as possible (seed 1 and 2 can only meet in the
 * final, etc). This is what lets us scatter BYEs fairly.
 */
export function generateSeedOrder(size: number): number[] {
  if (size <= 1) return [1];
  let seeds = [1, 2];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(n + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

export function generateBracket(numPlayersRaw: number): BracketLayout {
  const numPlayers = Math.min(
    MAX_PLAYERS,
    Math.max(MIN_PLAYERS, Math.floor(numPlayersRaw) || MIN_PLAYERS)
  );
  const size = nextPowerOfTwo(numPlayers);
  const numRounds = Math.log2(size);
  const seedOrder = generateSeedOrder(size);

  const rowHeight = BOX_HEIGHT + LEAF_GAP;
  const leafYs: number[] = Array.from(
    { length: size },
    (_, i) => MARGIN + HEADER_H + BOX_HEIGHT / 2 + i * rowHeight
  );

  const columns: BracketBox[][] = [];

  const leafCol: BracketBox[] = seedOrder.map((seed, i) => ({
    id: `r0-${i}`,
    col: 0,
    row: i,
    x: MARGIN,
    y: leafYs[i],
    isBye: seed > numPlayers,
    isChampion: false,
    isLeaf: true,
    seed,
  }));
  columns.push(leafCol);

  let prevYs = leafYs;
  for (let r = 1; r <= numRounds; r++) {
    const count = size / Math.pow(2, r);
    const ys: number[] = [];
    const col: BracketBox[] = [];
    for (let i = 0; i < count; i++) {
      const y = (prevYs[2 * i] + prevYs[2 * i + 1]) / 2;
      ys.push(y);
      col.push({
        id: `r${r}-${i}`,
        col: r,
        row: i,
        x: MARGIN + r * (BOX_WIDTH + COL_GAP),
        y,
        isBye: false,
        isChampion: false,
        isLeaf: false,
      });
    }
    columns.push(col);
    prevYs = ys;
  }

  // Extra standalone "Champion" box mirroring the final match winner,
  // matching the trailing box seen in the reference draw sheet.
  const champCol: BracketBox[] = [
    {
      id: "champion",
      col: numRounds + 1,
      row: 0,
      x: MARGIN + (numRounds + 1) * (BOX_WIDTH + COL_GAP),
      y: prevYs[0],
      isBye: false,
      isChampion: true,
      isLeaf: false,
    },
  ];
  columns.push(champCol);

  const segments: Segment[] = [];
  for (let r = 0; r < numRounds; r++) {
    const src = columns[r];
    const dst = columns[r + 1];
    for (let i = 0; i < dst.length; i++) {
      const top = src[2 * i];
      const bottom = src[2 * i + 1];
      const target = dst[i];
      const midX = top.x + BOX_WIDTH + COL_GAP / 2;

      segments.push({ x1: top.x + BOX_WIDTH, y1: top.y, x2: midX, y2: top.y });
      segments.push({
        x1: bottom.x + BOX_WIDTH,
        y1: bottom.y,
        x2: midX,
        y2: bottom.y,
      });
      segments.push({ x1: midX, y1: top.y, x2: midX, y2: bottom.y });
      segments.push({ x1: midX, y1: target.y, x2: target.x, y2: target.y });
    }
  }
  // Stub connecting the final match box straight into the champion box.
  const finalBox = columns[numRounds][0];
  const champBox = columns[numRounds + 1][0];
  segments.push({
    x1: finalBox.x + BOX_WIDTH,
    y1: finalBox.y,
    x2: champBox.x,
    y2: champBox.y,
  });

  const boxes = columns.flat();
  const width = champCol[0].x + BOX_WIDTH + MARGIN;
  const height =
    MARGIN * 2 + HEADER_H + size * BOX_HEIGHT + (size - 1) * LEAF_GAP;

  return {
    numPlayers,
    size,
    numRounds,
    columns,
    boxes,
    segments,
    width,
    height,
  };
}

export function roundLabel(
  colIndex: number,
  numRounds: number,
  isChampion: boolean
): string {
  if (isChampion) return "Champion";
  const remaining = numRounds - colIndex;
  if (remaining <= 0) return "";
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Semi Final";
  if (remaining === 3) return "Quarter Final";
  return `Round ${colIndex + 1}`;
}

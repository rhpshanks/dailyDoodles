// Deterministic doodle engine. Every calendar date (PKT) maps to exactly one
// page of clickable regions, rebuilt identically anywhere from the date alone.
//
// schedule.json is the approved queue: an entry pins what a given day will
// show, so a later change to the default rules below cannot silently reshape
// an upcoming page. Days with no entry fall back to these defaults, which is
// why an empty or stale queue can never leave a day blank.
//
// Entries for dates that have already passed must never be added or edited:
// finished pages are re-rendered from their date for the book and the PDF, so
// changing an old day would rewrite art someone already colored.

import scheduleJson from "../../data/schedule.json";

export type QueueEntry = {
  seed?: string;
  kind?: DoodleKind;
  palette?: string;
  title?: string;
  note?: string;
};

const SCHEDULE = scheduleJson as Record<string, QueueEntry>;

export function scheduledEntry(date: string): QueueEntry | undefined {
  return SCHEDULE[date];
}

export type Region = {
  d: string; // svg path data
  color: string; // target fill color
  need: number; // clicks required to fully fill this region
};

export type Decor = { d: string };

export type DoodleKind = "mandala" | "patchwork";

export type Doodle = {
  date: string;
  dayNo: number;
  title: string;
  weekend: boolean;
  kind: DoodleKind;
  paletteName: string;
  regions: Region[];
  decor: Decor[];
  clickBudget: number;
  viewBox: string;
  strokeWidth: number;
};

// Day zero: 2026-08-01, so the launch day 2026-08-02 is doodle No. 1.
const EPOCH_UTC = Date.UTC(2026, 7, 1);
export const BLANK_BOOK_THRESHOLD = 100;
export const PKT_OFFSET_MS = 5 * 3600 * 1000;
const DAY_MS = 86400000;
const TAU = Math.PI * 2;

export function todayKeyPkt(now = Date.now()): string {
  return new Date(now + PKT_OFFSET_MS).toISOString().slice(0, 10);
}

export function msToNextMidnightPkt(now = Date.now()): number {
  return DAY_MS - ((now + PKT_OFFSET_MS) % DAY_MS);
}

export function dayNoFor(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_UTC) / DAY_MS);
}

export function isWeekend(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function isValidDateKey(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function shortDayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const names = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return names[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function longDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) {
    h ^= date.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Palette = { name: string; colors: string[] };

const PALETTES: Palette[] = [
  {
    name: "Marigold Court",
    colors: ["#3441C8", "#E9A13B", "#C94F2E", "#33715B", "#E3CFA3", "#7A3E8F"],
  },
  {
    name: "Monsoon",
    colors: ["#23538F", "#4E8FB3", "#A7C7CE", "#E0B94F", "#31694F", "#D97B5A"],
  },
  {
    name: "Rose Garden",
    colors: ["#B03A5B", "#E58AA3", "#E8C26E", "#5E7D4F", "#32506B", "#EAD8C4"],
  },
  {
    name: "Lantern Night",
    colors: ["#1F3A6E", "#3F6BB0", "#E2A23C", "#C3572F", "#6E4F86", "#DCC9A2"],
  },
  {
    name: "Sea Glass",
    colors: ["#2E7F76", "#7FBFAE", "#E2D8A9", "#3E5D8F", "#C96A45", "#98B562"],
  },
];

const ADJ = [
  "Quiet",
  "Golden",
  "Marigold",
  "Indigo",
  "Monsoon",
  "Bazaar",
  "Lantern",
  "Garden",
  "Morning",
  "Velvet",
  "Paper",
  "Saffron",
];
const NOUN = [
  "Bloom",
  "Wheel",
  "Garland",
  "Compass",
  "Courtyard",
  "Tile",
  "Petal",
  "Window",
  "Meadow",
  "Kite",
  "Lattice",
  "Halo",
];

function pt(r: number, a: number): string {
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
}

function annularSector(r1: number, r2: number, a0: number, a1: number, scallop: number): string {
  const mid = (a0 + a1) / 2;
  const outerEdge =
    scallop > 0
      ? `Q ${pt(r2 + scallop, mid)} ${pt(r2, a0)}`
      : `A ${r2} ${r2} 0 0 0 ${pt(r2, a0)}`;
  return (
    `M ${pt(r1, a0)} ` +
    `A ${r1} ${r1} 0 0 1 ${pt(r1, a1)} ` +
    `L ${pt(r2, a1)} ` +
    outerEdge +
    " Z"
  );
}

function wedge(r: number, a0: number, a1: number): string {
  return `M 0 0 L ${pt(r, a0)} A ${r} ${r} 0 0 1 ${pt(r, a1)} Z`;
}

function circlePath(r: number): string {
  return `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`;
}

function buildMandala(rng: () => number, colors: string[]): { regions: Omit<Region, "need">[]; decor: Decor[] } {
  const regions: Omit<Region, "need">[] = [];
  const decor: Decor[] = [];
  const R = 300;
  const r0 = 42;

  const k1 = 1 + Math.floor(rng() * 3);
  const k2 = 1 + Math.floor(rng() * 2);
  const base = Math.floor(rng() * 6);

  // Center disc: 8 wedges.
  const cw = 8;
  const cro = rng() * TAU;
  for (let s = 0; s < cw; s++) {
    const a0 = cro + (s / cw) * TAU;
    const a1 = cro + ((s + 1) / cw) * TAU;
    regions.push({ d: wedge(r0, a0, a1), color: colors[(s * k2 + base + 3) % 6] });
  }

  // 7 rings with growing sector counts. Minimum total: 110 regions.
  const options: [number, number][] = [
    [10, 12],
    [12, 14],
    [14, 16],
    [16, 18],
    [18, 20],
    [20, 22],
    [22, 24],
  ];
  const weights: number[] = [];
  let wsum = 0;
  for (let i = 0; i < 7; i++) {
    const w = 0.75 + rng() * 0.5;
    weights.push(w);
    wsum += w;
  }
  const span = R - r0;
  let r = r0;
  for (let ring = 0; ring < 7; ring++) {
    const width = (weights[ring] / wsum) * span;
    const r1 = r;
    const r2 = ring === 6 ? R : r + width;
    r = r2;
    const [lo, hi] = options[ring];
    const sectors = rng() < 0.5 ? lo : hi;
    const ro = rng() * TAU;
    const scallop = ring > 1 && rng() < 0.45 ? Math.min(14, width * 0.35) : 0;
    for (let s = 0; s < sectors; s++) {
      const a0 = ro + (s / sectors) * TAU;
      const a1 = ro + ((s + 1) / sectors) * TAU;
      regions.push({
        d: annularSector(r1, r2, a0, a1, scallop),
        color: colors[(ring * k1 + s * k2 + base) % 6],
      });
    }
  }

  decor.push({ d: circlePath(r0 + 1.5) });
  decor.push({ d: circlePath(R + 7) });
  return { regions, decor };
}

function buildPatchwork(rng: () => number, colors: string[]): { regions: Omit<Region, "need">[]; decor: Decor[] } {
  const regions: Omit<Region, "need">[] = [];
  const decor: Decor[] = [];
  const n = 12;
  const size = 640;
  const cell = size / n;
  const band = 1 + Math.floor(rng() * 3);
  const base = Math.floor(rng() * 6);

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const x0 = x * cell;
      const y0 = y * cell;
      let c = (x + y * band + base) % 6;
      if (rng() < 0.12) c = (c + 3) % 6;
      regions.push({
        d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} h ${cell.toFixed(1)} v ${cell.toFixed(1)} h ${(-cell).toFixed(1)} Z`,
        color: colors[c],
      });

      // Stroke-only motif on top of the tile (not clickable).
      const m = Math.floor(rng() * 4);
      const cx = x0 + cell / 2;
      const cy = y0 + cell / 2;
      const q = cell * 0.32;
      if (m === 0) {
        decor.push({
          d: `M ${x0.toFixed(1)} ${(y0 + cell).toFixed(1)} A ${cell.toFixed(1)} ${cell.toFixed(1)} 0 0 1 ${(x0 + cell).toFixed(1)} ${y0.toFixed(1)}`,
        });
      } else if (m === 1) {
        decor.push({
          d: `M ${(cx - q).toFixed(1)} ${cy.toFixed(1)} A ${q.toFixed(1)} ${q.toFixed(1)} 0 1 1 ${(cx + q).toFixed(1)} ${cy.toFixed(1)} A ${q.toFixed(1)} ${q.toFixed(1)} 0 1 1 ${(cx - q).toFixed(1)} ${cy.toFixed(1)}`,
        });
      } else if (m === 2) {
        decor.push({
          d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} L ${(x0 + cell).toFixed(1)} ${(y0 + cell).toFixed(1)}`,
        });
      } else {
        decor.push({
          d: `M ${cx.toFixed(1)} ${(cy - q).toFixed(1)} L ${(cx + q).toFixed(1)} ${cy.toFixed(1)} L ${cx.toFixed(1)} ${(cy + q).toFixed(1)} L ${(cx - q).toFixed(1)} ${cy.toFixed(1)} Z`,
        });
      }
    }
  }
  return { regions, decor };
}

export function buildDoodle(date: string): Doodle {
  const entry = SCHEDULE[date];
  const rng = mulberry32(hashSeed(entry?.seed ?? date));
  const dayNo = dayNoFor(date);
  const weekend = isWeekend(date);
  const kind: DoodleKind = entry?.kind ?? (dayNo % 2 === 0 ? "patchwork" : "mandala");

  // These rolls happen whether or not the entry overrides them, so pinning a
  // title never reshuffles the geometry that follows.
  const rolledPalette = PALETTES[Math.floor(rng() * PALETTES.length)];
  const rolledTitle = `${ADJ[Math.floor(rng() * ADJ.length)]} ${NOUN[Math.floor(rng() * NOUN.length)]}`;
  const palette = (entry?.palette && PALETTES.find((p) => p.name === entry.palette)) || rolledPalette;
  const title = entry?.title ?? rolledTitle;

  const built =
    kind === "mandala" ? buildMandala(rng, palette.colors) : buildPatchwork(rng, palette.colors);

  const minBudget = weekend ? 1000 : 100;
  const need = Math.max(1, Math.ceil(minBudget / built.regions.length));
  const regions: Region[] = built.regions.map((r) => ({ ...r, need }));

  return {
    date,
    dayNo,
    title,
    weekend,
    kind,
    paletteName: palette.name,
    regions,
    decor: built.decor,
    clickBudget: regions.length * need,
    viewBox: kind === "mandala" ? "-322 -322 644 644" : "-6 -6 652 652",
    strokeWidth: kind === "mandala" ? 1.8 : 2.2,
  };
}

// Standalone SVG string, used for PDF pages and small static previews.
export function doodleSvg(
  doodle: Doodle,
  fills: number[] | null,
  opts: { background?: string } = {},
): string {
  const bg = opts.background ?? "#FFFFFF";
  const [vx, vy, vw, vh] = doodle.viewBox.split(" ").map(Number);
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${doodle.viewBox}" width="1200" height="1200">`,
  );
  parts.push(`<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="${bg}"/>`);
  for (let i = 0; i < doodle.regions.length; i++) {
    const r = doodle.regions[i];
    const done = fills != null && (fills[i] ?? 0) >= r.need;
    parts.push(
      `<path d="${r.d}" fill="${done ? r.color : "#FFFFFF"}" stroke="#262219" stroke-width="${doodle.strokeWidth}" stroke-linejoin="round"/>`,
    );
  }
  for (const dec of doodle.decor) {
    parts.push(
      `<path d="${dec.d}" fill="none" stroke="#262219" stroke-width="${doodle.strokeWidth * 0.7}" stroke-linecap="round"/>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}

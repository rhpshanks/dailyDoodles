// Browser-backed book storage. Replaces what used to be a server database:
// sessions here are anonymous and per-device anyway, so keeping the book in
// localStorage loses nothing a visitor could otherwise reach.

import {
  BLANK_BOOK_THRESHOLD,
  buildDoodle,
  isValidDateKey,
  isWeekend,
  msToNextMidnightPkt,
  todayKeyPkt,
} from "./doodle/engine";

// Points rules: 10 weekday page, 30 weekend page, +5 per consecutive day
// (capped at 20), 5 for finishing an older page late.
const POINTS_WEEKDAY = 10;
const POINTS_WEEKEND = 30;
const POINTS_LATE = 5;
const STREAK_STEP = 5;
const STREAK_CAP = 20;

const KEY = "dd-book-v1";

type PageRecord = { fills: number[]; clicks: number; completedAt: string | null };

type Book = {
  points: number;
  streak: number;
  lastCompletedDate: string | null;
  pages: Record<string, PageRecord>;
};

const EMPTY: Book = { points: 0, streak: 0, lastCompletedDate: null, pages: {} };

export type DoodleState = {
  today: string;
  msLeft: number;
  points: number;
  streak: number;
  blankUnlocked: boolean;
  todayFills: number[] | null;
  todayCompletedAt: string | null;
  completed: { date: string; completedAt: string }[];
  unfinished: { date: string; clicks: number; fills: number[] }[];
};

// Private-mode browsers throw on localStorage access, so every touch is
// guarded; the site still colors, it just cannot keep the book.
function read(): Book {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY, pages: {} };
    const parsed = JSON.parse(raw) as Partial<Book>;
    return {
      points: typeof parsed.points === "number" ? parsed.points : 0,
      streak: typeof parsed.streak === "number" ? parsed.streak : 0,
      lastCompletedDate: parsed.lastCompletedDate ?? null,
      pages: parsed.pages && typeof parsed.pages === "object" ? parsed.pages : {},
    };
  } catch {
    return { ...EMPTY, pages: {} };
  }
}

function write(book: Book): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(book));
  } catch {
    // Storage is full or blocked: coloring continues, saving does not.
  }
}

function prevDateKey(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - 86400000).toISOString().slice(0, 10);
}

export function loadState(): DoodleState {
  const book = read();
  const today = todayKeyPkt();
  const todayPage = book.pages[today] ?? null;

  const entries = Object.entries(book.pages).sort((a, b) => b[0].localeCompare(a[0]));

  return {
    today,
    msLeft: msToNextMidnightPkt(),
    points: book.points,
    streak: book.streak,
    blankUnlocked: book.points >= BLANK_BOOK_THRESHOLD,
    todayFills: todayPage && todayPage.completedAt == null ? todayPage.fills : null,
    todayCompletedAt: todayPage?.completedAt ?? null,
    completed: entries
      .filter(([, p]) => p.completedAt != null)
      .map(([date, p]) => ({ date, completedAt: p.completedAt as string })),
    unfinished: entries
      .filter(([date, p]) => p.completedAt == null && date !== today)
      .map(([date, p]) => ({ date, clicks: p.clicks, fills: p.fills })),
  };
}

export function saveProgress(date: string, fills: number[], clicks: number): void {
  if (!isValidDateKey(date) || date > todayKeyPkt()) return;
  const book = read();
  const existing = book.pages[date];
  // A finished page is never overwritten by a late partial save.
  if (existing?.completedAt) return;
  book.pages[date] = { fills, clicks, completedAt: null };
  write(book);
}

export type CompletionResult = {
  awarded: number;
  points: number;
  streak: number;
  blankUnlocked: boolean;
};

export function completeDoodle(
  date: string,
  fills: number[],
  clicks: number,
): CompletionResult {
  const today = todayKeyPkt();
  if (!isValidDateKey(date) || date > today) throw new Error("That page is not open yet.");

  const doodle = buildDoodle(date);
  if (fills.length !== doodle.regions.length) throw new Error("Page mismatch.");
  for (let i = 0; i < doodle.regions.length; i++) {
    if ((fills[i] ?? 0) < doodle.regions[i].need) {
      throw new Error("The page is not fully colored yet.");
    }
  }

  const book = read();
  if (book.pages[date]?.completedAt) {
    return {
      awarded: 0,
      points: book.points,
      streak: book.streak,
      blankUnlocked: book.points >= BLANK_BOOK_THRESHOLD,
    };
  }

  let awarded: number;
  let streak = book.streak;
  if (date === today) {
    awarded = isWeekend(date) ? POINTS_WEEKEND : POINTS_WEEKDAY;
    streak = book.lastCompletedDate === prevDateKey(today) ? book.streak + 1 : 1;
    awarded += Math.min(STREAK_STEP * (streak - 1), STREAK_CAP);
    book.streak = streak;
    book.lastCompletedDate = today;
  } else {
    awarded = POINTS_LATE;
  }

  book.points += awarded;
  book.pages[date] = { fills, clicks, completedAt: new Date().toISOString() };
  write(book);

  return {
    awarded,
    points: book.points,
    streak: book.streak,
    blankUnlocked: book.points >= BLANK_BOOK_THRESHOLD,
  };
}

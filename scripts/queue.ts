// The approved-queue keeper (SOP section 6, steps 1 to 4).
//
// `topup`  pins the next HORIZON days into src/data/schedule.json, recording
//          the kind, palette and title each day will show. Pinned days are
//          immune to later changes in the engine's default rules.
// `status` prints the queue without writing anything.
//
// Past days are never written. Finished pages are re-rendered from their date
// for the coloring book and the PDF, so editing an old entry would rewrite art
// someone already colored.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  buildDoodle,
  isWeekend,
  longDateLabel,
  shortDayLabel,
  todayKeyPkt,
  type QueueEntry,
} from "../src/lib/doodle/engine.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCHEDULE_PATH = resolve(HERE, "../src/data/schedule.json");

// Days kept pinned ahead of today. The SOP asks for 7; 14 leaves room for a
// missed run without the queue ever dipping below the required week.
const HORIZON = 14;
const SOP_MINIMUM_AHEAD = 7;

type Schedule = Record<string, QueueEntry>;

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86400000).toISOString().slice(0, 10);
}

function readSchedule(): Schedule {
  try {
    return JSON.parse(readFileSync(SCHEDULE_PATH, "utf8")) as Schedule;
  } catch {
    return {};
  }
}

function writeSchedule(schedule: Schedule): void {
  const sorted: Schedule = {};
  for (const key of Object.keys(schedule).sort()) sorted[key] = schedule[key];
  writeFileSync(SCHEDULE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function describe(date: string) {
  const d = buildDoodle(date);
  return {
    date,
    day: shortDayLabel(date),
    no: d.dayNo,
    kind: d.kind,
    palette: d.paletteName,
    title: d.title,
    shapes: d.regions.length,
    budget: d.clickBudget,
    minimum: isWeekend(date) ? 1000 : 100,
  };
}

function topup(): number {
  const schedule = readSchedule();
  const today = todayKeyPkt();
  let added = 0;

  for (let i = 0; i < HORIZON; i++) {
    const date = addDays(today, i);
    if (schedule[date]) continue;

    // buildDoodle resolves the day through the engine's defaults (there is no
    // entry yet), and those resolved values become the pinned entry.
    const d = buildDoodle(date);
    schedule[date] = {
      seed: date,
      kind: d.kind,
      palette: d.paletteName,
      title: d.title,
    };
    added++;
    const row = describe(date);
    console.log(
      `  + ${date} ${row.day}  No.${String(row.no).padEnd(4)} ${row.kind.padEnd(9)} ` +
        `${row.palette.padEnd(15)} ${row.title.padEnd(18)} ${row.budget} taps`,
    );
  }

  if (added > 0) writeSchedule(schedule);
  return added;
}

function status(): void {
  const schedule = readSchedule();
  const today = todayKeyPkt();
  const ahead = Object.keys(schedule).filter((d) => d >= today).sort();

  console.log(`Today (PKT): ${today}  ${longDateLabel(today)}`);
  console.log(`Pinned from today onward: ${ahead.length} day(s)\n`);
  console.log("date        day  no    kind       palette          title              taps   min   ok");

  let failures = 0;
  for (const date of ahead) {
    const r = describe(date);
    const ok = r.budget >= r.minimum;
    if (!ok) failures++;
    console.log(
      `${r.date}  ${r.day}  ${String(r.no).padEnd(5)} ${r.kind.padEnd(10)} ` +
        `${r.palette.padEnd(16)} ${r.title.padEnd(18)} ${String(r.budget).padEnd(6)} ` +
        `${String(r.minimum).padEnd(5)} ${ok ? "PASS" : "FAIL"}`,
    );
  }

  if (failures > 0) {
    console.error(`\n${failures} day(s) fall below the SOP click minimum.`);
    process.exit(1);
  }
  if (ahead.length < SOP_MINIMUM_AHEAD) {
    console.error(
      `\nQueue is short: ${ahead.length} day(s) pinned, SOP requires ${SOP_MINIMUM_AHEAD}.`,
    );
    process.exit(1);
  }
  console.log("\nQueue healthy: every pinned day meets its click minimum.");
}

const command = process.argv[2] ?? "status";
if (command === "topup") {
  console.log("Topping up the approved queue...");
  const added = topup();
  console.log(added === 0 ? "Queue already full, nothing added." : `Pinned ${added} new day(s).`);
} else if (command === "status") {
  status();
} else {
  console.error(`Unknown command: ${command}. Use "topup" or "status".`);
  process.exit(1);
}

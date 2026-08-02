# Daily Doodle

A keepsake daily coloring ritual. One new page appears every midnight, and you
color it by tapping shapes: each shape already knows its color, so there is
nothing to pick and nothing to aim precisely at.

## How it works

- **One page a day.** The page swaps at 00:00 Pakistan time, the same page for
  everyone. Nothing is fetched: the day's artwork is generated from the date
  itself, so every visitor on a given day gets the identical doodle.
- **Tap to fill.** Every shape carries a pre-decided color. Weekday pages need
  at least 100 taps; Saturday and Sunday pages need at least 1000, spread as
  several taps per shape.
- **Your book.** A finished page saves immediately and joins your coloring
  book, downloadable as an A4 PDF.
- **Points and the Blank Book.** 10 points for a weekday page, 30 for a weekend
  page, plus a streak bonus capped at 20. At 100 points the Blank Book unlocks:
  the same pages as plain line art, made to print and color by hand.
- **Sound is off by default.** Turning it on adds soft taps, a finishing chime,
  and a quiet rain-like bed, all synthesized in the browser with no audio files.

## The daily queue

`src/data/schedule.json` is the approved queue. Each entry pins what a given
day will show, so a later change to the engine's default rules cannot reshape a
page that was already planned.

A GitHub Actions job (`.github/workflows/daily-doodle.yml`) runs at 00:00
Pakistan time every night. It tops the queue up to 14 days ahead, checks that
every pinned day still meets its click minimum, and commits the result, which
triggers a redeploy. Runs are idempotent, so a late or repeated run pins exactly
what a punctual one would.

```bash
npm run queue:status   # show the queue and check it against the SOP minimums
npm run queue:topup    # pin any missing days up to 14 ahead
```

Two rules keep the archive trustworthy:

- **Days with no entry still work.** They fall back to the date-seeded
  defaults, so a missed run or an empty queue can never leave a day blank.
- **Past entries are never written.** Finished pages are re-rendered from their
  date for the coloring book and the PDF, so editing an old day would rewrite
  art someone already colored.

To curate an upcoming day, edit its entry by hand and commit. Any of `kind`
(`mandala` or `patchwork`), `palette`, `title`, `seed`, and a free-text `note`
can be set; anything left out falls back to the default for that date. Weekend
click minimums are always derived from the date, so they cannot be overridden
away.

## Running it

```bash
npm install
npm run dev
```

Build for production with `npm run build`; the output lands in `dist/`.

## Deploying

It is a static single-page app, so any static host serves it. On Vercel, import
the repository and accept the detected Vite settings (build `npm run build`,
output `dist`). No environment variables and no database are needed.

## Where things live

| Path | What |
|---|---|
| `src/lib/doodle/engine.ts` | Generates each date's artwork, palettes, and click budget |
| `src/lib/storage.ts` | Progress, points and streaks, kept in the browser |
| `src/components/doodle-canvas/` | The coloring surface and the small page previews |
| `src/components/pdf.ts` | Builds the colored book and the printable Blank Book |
| `src/components/sound.ts` | The synthesized tap, chime, and ambience kit |
| `design-brief.md` | The visual direction the interface was built to |

Progress lives in the visitor's own browser, so there is no account, no sign-up,
and nothing collected.

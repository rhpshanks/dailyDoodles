import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { BlankBookCta } from "./components/blank-book-cta";
import { DoodleCanvas, DoodleThumb } from "./components/doodle-canvas/doodle-canvas";
import { DownloadBookCta } from "./components/download-book-cta";
import { ProgressRing } from "./components/progress-ring";
import { sound } from "./components/sound";
import { SoundToggle } from "./components/sound-toggle";
import { completeDoodle, loadState, saveProgress, type DoodleState } from "./lib/storage";
import {
  BLANK_BOOK_THRESHOLD,
  buildDoodle,
  dayNoFor,
  longDateLabel,
  shortDayLabel,
} from "./lib/doodle/engine";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const cb = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  }, []);
  return reduced;
}

function burstConfetti(colors: string[]) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:60";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const g = canvas.getContext("2d");
  if (!g) {
    canvas.remove();
    return;
  }
  const pieces = Array.from({ length: 90 }, () => ({
    x: canvas.width * (0.2 + Math.random() * 0.6),
    y: -20 - Math.random() * canvas.height * 0.3,
    s: 5 + Math.random() * 7,
    vy: 2.2 + Math.random() * 3.4,
    vx: -1.4 + Math.random() * 2.8,
    rot: Math.random() * Math.PI,
    vr: -0.12 + Math.random() * 0.24,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const started = performance.now();
  const tick = (now: number) => {
    const t = now - started;
    g.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      g.globalAlpha = Math.max(0, 1 - t / 1700);
      g.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.62);
      g.restore();
    }
    if (t < 1700) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(tick);
}

export function App() {
  const [state, setState] = useState<DoodleState>(() => loadState());
  const [activeDate, setActiveDate] = useState<string>(state.today);
  const [fills, setFills] = useState<number[]>(
    () => state.todayFills ?? buildDoodle(state.today).regions.map(() => 0),
  );
  const [completedNow, setCompletedNow] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [msLeft, setMsLeft] = useState<number>(state.msLeft);
  const reduced = useReducedMotion();

  const clicksRef = useRef(0);
  const heroRef = useRef<HTMLElement | null>(null);

  // Fills live in a ref as the source of truth, with state mirroring them for
  // render. Doing the tap work inside a setState updater would run it twice
  // under StrictMode and double-count every click.
  const fillsRef = useRef<number[]>(fills);
  const applyFills = useCallback((next: number[]) => {
    fillsRef.current = next;
    setFills(next);
  }, []);

  const doodle = useMemo(() => buildDoodle(activeDate), [activeDate]);
  const today = state.today;
  const isToday = activeDate === today;
  const todayDone = state.todayCompletedAt != null || (isToday && completedNow);
  const activeDone =
    (isToday && todayDone) || (!isToday && state.completed.some((c) => c.date === activeDate));

  const showFills = activeDone ? doodle.regions.map((r) => r.need) : fills;
  const doneClicks = useMemo(() => {
    let n = 0;
    for (let i = 0; i < doodle.regions.length; i++) {
      n += Math.min(showFills[i] ?? 0, doodle.regions[i].need);
    }
    return n;
  }, [showFills, doodle]);
  const pct = doneClicks / doodle.clickBudget;

  const completedDates = useMemo(() => state.completed.map((c) => c.date), [state]);
  const fanCards = useMemo(
    () => completedDates.slice(0, 6).map((date) => ({ date, doodle: buildDoodle(date) })),
    [completedDates],
  );
  const openShelf = useMemo(
    () => state.unfinished.slice(0, 5).map((u) => ({ ...u, dayNo: dayNoFor(u.date) })),
    [state],
  );
  const ghostB = useMemo(() => buildDoodle("2026-08-01"), []);

  const reload = useCallback(() => {
    const next = loadState();
    setState(next);
    setMsLeft(next.msLeft);
    setActiveDate(next.today);
    setCompletedNow(false);
    clicksRef.current = 0;
    applyFills(next.todayFills ?? buildDoodle(next.today).regions.map(() => 0));
  }, [applyFills]);

  // Countdown to the next page, which swaps the board at midnight.
  useEffect(() => {
    const iv = window.setInterval(() => {
      setMsLeft((prev) => {
        const next = prev - 30000;
        if (next <= 0) {
          reload();
          return loadState().msLeft;
        }
        return next;
      });
    }, 30000);
    return () => window.clearInterval(iv);
  }, [reload]);

  const finish = useCallback(
    (fillsNow: number[]) => {
      try {
        const res = completeDoodle(activeDate, fillsNow, clicksRef.current);
        sound.chime();
        if (!reduced) burstConfetti(doodle.regions.slice(0, 24).map((r) => r.color));
        setCompletedNow(true);
        setState(loadState());
        setToast(
          res.awarded > 0 ? `Saved to your book. +${res.awarded} points.` : "Saved to your book.",
        );
      } catch {
        setToast("The page is colored but did not save. Your browser may be blocking storage.");
      }
    },
    [activeDate, doodle, reduced],
  );

  const handleFill = useCallback(
    (i: number) => {
      const prev = fillsRef.current;
      const need = doodle.regions[i].need;
      const cur = prev[i] ?? 0;
      if (cur >= need) return;

      const next = prev.slice();
      while (next.length < doodle.regions.length) next.push(0);
      next[i] = cur + 1;
      clicksRef.current += 1;
      applyFills(next);

      sound.pop(cur);
      if (!reduced && "vibrate" in navigator) navigator.vibrate(6);

      if (doodle.regions.every((r, k) => (next[k] ?? 0) >= r.need)) {
        finish(next);
      } else {
        saveProgress(activeDate, next, clicksRef.current);
      }
    },
    [doodle, activeDate, finish, reduced, applyFills],
  );

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const openUnfinished = (date: string, savedFills: number[]) => {
    const d = buildDoodle(date);
    setActiveDate(date);
    applyFills(d.regions.map((_, i) => savedFills[i] ?? 0));
    setCompletedNow(false);
    clicksRef.current = 0;
    heroRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
  };

  const backToToday = () => {
    setActiveDate(state.today);
    setCompletedNow(false);
    clicksRef.current = 0;
    applyFills(state.todayFills ?? buildDoodle(state.today).regions.map(() => 0));
  };

  const hours = Math.floor(msLeft / 3600000);
  const minutes = Math.floor((msLeft % 3600000) / 60000);
  const fanAngles = [-8, 5, -3, 9, -6, 3];

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6 md:px-10">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="" className="h-9 w-9 object-contain" />
          <span className="text-lg font-semibold tracking-tight">Daily Doodle</span>
        </div>
        <a
          href="#book"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-dd-ink"
        >
          My book
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-200 group-hover:translate-y-0.5 motion-reduce:transition-none"
          >
            ↓
          </span>
        </a>
      </header>

      {/* Hero: the canvas is the product */}
      <section
        ref={heroRef}
        className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-10 md:px-10 lg:grid-cols-[5fr_7fr] lg:gap-14 lg:pt-16"
        style={{ backgroundImage: "url(/assets/paper.jpg)", backgroundSize: "cover" }}
      >
        <div>
          <h1 className="text-4xl font-semibold leading-none tracking-tighter md:text-6xl">
            Today&#39;s doodle.
            <br />
            One click at a time.
          </h1>
          <p className="mt-5 max-w-[42ch] text-base leading-relaxed text-dd-muted">
            A new page every midnight. Tap a shape, watch the color soak in, keep what you make.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <ProgressRing pct={pct} />
            <span className="border border-dd-hairline px-3 py-1.5 font-ddmono text-xs tracking-[0.12em] text-dd-ink">
              {shortDayLabel(activeDate)} No. {doodle.dayNo}
            </span>
            {doodle.weekend ? (
              <span className="font-ddmono text-xs tracking-[0.08em] text-dd-blue">
                weekend page: {doodle.regions[0]?.need ?? 1} taps fill each shape
              </span>
            ) : null}
          </div>
          <div className="mt-6 space-y-1 font-ddmono text-xs text-dd-muted">
            <p>{doodle.title}</p>
            <p>
              new page in {hours}h {minutes}m
            </p>
            {!isToday ? (
              <button type="button" onClick={backToToday} className="text-dd-blue">
                This is an old page. Back to today ↩
              </button>
            ) : null}
            {activeDone ? <p className="text-dd-blue">Finished. Saved to your book.</p> : null}
          </div>
        </div>
        {/* Edge to edge on phones: every extra pixel makes the small shapes
            in the densest ring easier to hit. */}
        <div className="mx-auto w-[calc(100%+3rem)] max-w-[560px] -translate-x-6 sm:w-full sm:translate-x-0">
          <DoodleCanvas
            doodle={doodle}
            fills={showFills}
            completed={activeDone}
            onFill={handleFill}
          />
        </div>
      </section>

      {/* Three quiet steps */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-24 md:px-10 lg:grid-cols-[5fr_7fr]">
        <div>
          <h2 className="text-3xl font-semibold tracking-tighter md:text-5xl">Three quiet steps</h2>
          <p className="mt-5 max-w-[36ch] text-base leading-relaxed text-dd-muted">
            A gentle rhythm: a little color, a little calm, and something worth keeping.
          </p>
        </div>
        <div className="space-y-12">
          {[
            {
              n: "01",
              img: "/assets/spot-tap.png",
              title: "Tap a shape",
              copy: "Pick any shape that calls to you. Tap it, no precision needed.",
              offset: "lg:ml-0",
            },
            {
              n: "02",
              img: "/assets/spot-fill.png",
              title: "Watch it fill",
              copy: "Color soaks in with a soft pop. Big shapes take a few taps.",
              offset: "lg:ml-16",
            },
            {
              n: "03",
              img: "/assets/spot-keep.png",
              title: "Keep the page",
              copy: "Finish the page and it lands in your book, ready to print.",
              offset: "lg:ml-32",
            },
          ].map((s) => (
            <div key={s.n} className={`flex items-start gap-6 ${s.offset}`}>
              <span className="mt-1 h-16 w-px shrink-0 bg-dd-blue" aria-hidden="true" />
              <span className="mt-1 font-ddmono text-sm text-dd-blue">{s.n}</span>
              <img src={s.img} alt="" className="h-20 w-20 shrink-0 object-contain" />
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-dd-muted">{s.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* My coloring book */}
      <section id="book" className="mx-auto max-w-6xl px-6 py-24 text-center md:px-10">
        <p className="font-ddmono text-xs uppercase tracking-[0.22em] text-dd-blue">My book</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tighter md:text-5xl">
          My coloring book
        </h2>
        <p className="mx-auto mt-5 max-w-[52ch] text-base leading-relaxed text-dd-muted">
          Every finished page lands here with its date. Download the whole book as a PDF whenever
          you like.
        </p>

        {fanCards.length > 0 ? (
          <div className="mt-14 flex flex-wrap items-center justify-center">
            {fanCards.map(({ date, doodle: d }, i) => (
              <div
                key={date}
                className="-mx-4 w-44 bg-white p-3 pb-2 shadow-[0_10px_28px_rgba(38,34,25,0.14)] md:w-52"
                style={{ rotate: `${fanAngles[i % fanAngles.length]}deg` }}
              >
                <DoodleThumb doodle={d} fills={d.regions.map((r) => r.need)} className="w-full" />
                <div className="mt-2 flex items-center justify-between font-ddmono text-[10px] text-dd-muted">
                  <span>DAY {d.dayNo}</span>
                  <span>{longDateLabel(date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-auto mt-14 w-56 border-[1.5px] border-dashed border-dd-hairline bg-white/60 p-4">
            <DoodleThumb doodle={doodle} fills={null} className="w-full opacity-35" />
            <p className="mt-3 font-ddmono text-[11px] text-dd-muted">
              Finish today&#39;s doodle and the shelf starts here.
            </p>
          </div>
        )}

        {openShelf.length > 0 ? (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <span className="font-ddmono text-xs text-dd-muted">Still open:</span>
            {openShelf.map((u) => (
              <button
                key={u.date}
                type="button"
                onClick={() => openUnfinished(u.date, u.fills)}
                className="border border-dd-hairline bg-white px-3 py-1.5 font-ddmono text-xs text-dd-ink transition-colors hover:border-dd-blue hover:text-dd-blue motion-reduce:transition-none"
              >
                No. {u.dayNo} · finish it
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-12 flex flex-col items-center gap-3">
          {fanCards.length > 0 ? (
            <DownloadBookCta dates={completedDates} />
          ) : (
            <p className="font-ddmono text-xs text-dd-muted">
              Your first finished page starts the book.
            </p>
          )}
          <p className="font-ddmono text-[11px] text-dd-muted">one page per day · PDF, A4</p>
        </div>
      </section>

      {/* Points and the Blank Book */}
      <section
        id="points"
        className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-24 md:px-10 lg:grid-cols-[7fr_5fr]"
        style={{ backgroundImage: "url(/assets/paper.jpg)", backgroundSize: "cover" }}
      >
        <div>
          <div className="flex flex-wrap items-end gap-4">
            <span className="font-ddmono text-[96px] leading-none tracking-tight md:text-[150px]">
              {state.points}
            </span>
            <span className="pb-3 font-ddmono text-base text-dd-muted md:pb-6">
              / {BLANK_BOOK_THRESHOLD} points
            </span>
            {state.streak > 1 ? (
              <span className="pb-3 font-ddmono text-xs uppercase tracking-[0.14em] text-dd-blue md:pb-6">
                streak {state.streak}
              </span>
            ) : null}
          </div>
          <div className="mt-6 h-[2px] w-full max-w-md bg-dd-hairline">
            <div
              className="h-full bg-dd-blue"
              style={{
                width: `${Math.min(100, (state.points / BLANK_BOOK_THRESHOLD) * 100)}%`,
                transition: "width 500ms ease",
              }}
            />
          </div>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-dd-muted">
            Each finished page earns points: 10 on weekdays, 30 on weekend pages, plus a streak
            bonus. At {BLANK_BOOK_THRESHOLD}, the Blank Book unlocks: the same pages, uncolored,
            made to print and color by hand.
          </p>
          <div className="mt-8">
            <BlankBookCta
              points={state.points}
              unlocked={state.blankUnlocked}
              dates={completedDates}
            />
          </div>
        </div>
        <div className="relative mx-auto hidden h-72 w-64 lg:block" aria-hidden="true">
          <div className="absolute left-10 top-6 w-52 rotate-6 bg-white p-3 opacity-45 shadow-[0_8px_22px_rgba(38,34,25,0.10)]">
            <DoodleThumb doodle={doodle} fills={null} className="w-full" />
          </div>
          <div className="absolute left-0 top-0 w-52 -rotate-3 bg-white p-3 opacity-70 shadow-[0_8px_22px_rgba(38,34,25,0.12)]">
            <DoodleThumb doodle={ghostB} fills={null} className="w-full" />
          </div>
        </div>
      </section>

      <footer className="border-t border-dd-hairline">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-10 md:px-10">
          <div>
            <p className="font-ddmono text-xs tracking-[0.3em] text-dd-ink">DAILY DOODLE</p>
            <p className="mt-2 text-sm text-dd-muted">A keepsake daily coloring ritual.</p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <SoundToggle />
            <p className="font-ddmono text-[11px] text-dd-muted">
              new page at midnight PKT · No. {dayNoFor(today)} today
            </p>
          </div>
        </div>
      </footer>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 border border-dd-ink bg-white px-5 py-3 text-sm text-dd-ink shadow-[0_12px_30px_rgba(38,34,25,0.18)]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

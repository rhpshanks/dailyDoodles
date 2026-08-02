import { useState } from "react";

import { downloadBook } from "./pdf";
import { BLANK_BOOK_THRESHOLD } from "../lib/doodle/engine";

type Props = { points: number; unlocked: boolean; dates: string[] };

// A printable ticket with a perforated stub. Locked: the stub counts the
// points still needed. Unlocked: hovering "tears" the stub away slightly and
// a click builds the printable line-art PDF.
export function BlankBookCta({ points, unlocked, dates }: Props) {
  const [busy, setBusy] = useState(false);
  const left = Math.max(0, BLANK_BOOK_THRESHOLD - points);
  const noPages = dates.length === 0;

  return (
    <button
      type="button"
      disabled={!unlocked || busy || noPages}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadBook(dates, true);
        } finally {
          setBusy(false);
        }
      }}
      className="dd-ticket group inline-flex items-stretch text-left disabled:cursor-not-allowed"
      aria-label={
        unlocked
          ? "Download the Blank Book PDF for printing"
          : `Blank Book locked, ${left} points to go`
      }
    >
      <span
        className={`flex items-center gap-3 border-[1.5px] border-dashed px-6 py-4 text-base font-medium transition-colors duration-200 motion-reduce:transition-none ${
          unlocked
            ? "border-dd-blue bg-white text-dd-blue group-hover:bg-dd-blue group-hover:text-white"
            : "border-dd-hairline bg-transparent text-dd-muted"
        }`}
      >
        {unlocked ? (
          <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden="true">
            <path
              d="M3 6h11v8.5H3zM5.5 6V3.5h6V6M5.5 11h6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="17" height="17" viewBox="0 0 17 17" aria-hidden="true">
            <path
              d="M4.5 8V5.5a4 4 0 0 1 8 0V8M3.5 8h10v6.5h-10z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {busy ? "Making the PDF..." : "Print the Blank Book"}
      </span>
      <span
        className={`-ml-px flex items-center border-[1.5px] border-dashed px-4 py-4 font-ddmono text-xs transition-transform duration-200 motion-reduce:transition-none ${
          unlocked
            ? "border-dd-blue bg-white text-dd-blue group-hover:translate-x-1 group-hover:rotate-2"
            : "border-dd-hairline text-dd-muted"
        }`}
      >
        {unlocked ? (noPages ? "finish a page" : "PDF") : `${left} pts to go`}
      </span>
    </button>
  );
}

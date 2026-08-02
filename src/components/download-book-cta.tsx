import { useState } from "react";

import { downloadBook } from "./pdf";

type Props = { dates: string[] };

// The one boxed CTA on the page (board 3): a thin ink box whose corner
// dog-ears like a page being lifted, then the box fills white on hover.
export function DownloadBookCta({ dates }: Props) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div>
      <button
        type="button"
        disabled={busy || dates.length === 0}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          try {
            await downloadBook(dates, false);
          } catch {
            setFailed(true);
          } finally {
            setBusy(false);
          }
        }}
        className="dd-bookcta group relative inline-flex items-center gap-3 border-[1.5px] border-dd-ink bg-transparent px-7 py-4 text-base font-medium text-dd-ink transition-colors duration-200 hover:bg-white active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
          <path
            d="M9 2v9m0 0 3.5-3.5M9 11 5.5 7.5M3 15h12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {busy ? "Making your PDF..." : "Download my book"}
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 h-0 w-0 border-b-[14px] border-l-[14px] border-b-transparent border-l-dd-hairline transition-all duration-200 group-hover:border-b-[20px] group-hover:border-l-[20px] group-hover:border-l-dd-blue motion-reduce:transition-none"
          style={{ transform: "rotate(180deg)" }}
        />
      </button>
      {failed ? (
        <p className="mt-2 text-sm text-dd-muted">The PDF did not build. Try once more.</p>
      ) : null}
    </div>
  );
}

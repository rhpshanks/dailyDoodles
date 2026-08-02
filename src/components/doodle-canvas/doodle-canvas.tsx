import { memo, useMemo } from "react";

import type { Doodle } from "../../lib/doodle/engine";
import "./doodle-canvas.css";

type CanvasProps = {
  doodle: Doodle;
  fills: number[];
  completed: boolean;
  onFill: (index: number) => void;
};

// The live coloring surface. Each region is a real SVG path; a pointer-down
// anywhere inside it counts, so taps stay easy on phones and desktops alike.
export function DoodleCanvas({ doodle, fills, completed, onFill }: CanvasProps) {
  return (
    <svg
      viewBox={doodle.viewBox}
      className={`dd-canvas ${completed ? "dd-canvas-done" : ""}`}
      role="img"
      aria-label={`${doodle.title}, coloring page No. ${doodle.dayNo}`}
    >
      {doodle.regions.map((r, i) => {
        const count = fills[i] ?? 0;
        const done = count >= r.need;
        const fo = done ? 1 : count / r.need;
        return (
          <path
            key={`${i}-${count}`}
            d={r.d}
            className={`dd-region ${count > 0 ? "dd-just" : ""} ${done ? "dd-done" : ""}`}
            style={
              {
                fill: r.color,
                "--fo": fo,
              } as React.CSSProperties
            }
            stroke="#262219"
            strokeWidth={doodle.strokeWidth}
            strokeLinejoin="round"
            onPointerDown={(e) => {
              e.preventDefault();
              if (!done && !completed) onFill(i);
            }}
          />
        );
      })}
      {doodle.decor.map((dec, i) => (
        <path
          key={`dec-${i}`}
          d={dec.d}
          className="dd-decor"
          fill="none"
          stroke="#262219"
          strokeWidth={doodle.strokeWidth * 0.7}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

type ThumbProps = {
  doodle: Doodle;
  fills: number[] | null; // null renders the blank line-art page
  className?: string;
};

// Small static preview used by the book fan, ghost pages and unfinished shelf.
export const DoodleThumb = memo(function DoodleThumb({ doodle, fills, className }: ThumbProps) {
  const paths = useMemo(
    () =>
      doodle.regions.map((r, i) => ({
        d: r.d,
        fill: fills != null && (fills[i] ?? 0) >= r.need ? r.color : "#FFFFFF",
      })),
    [doodle, fills],
  );
  return (
    <svg viewBox={doodle.viewBox} className={className} aria-hidden="true">
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.fill}
          stroke="#262219"
          strokeWidth={doodle.strokeWidth}
          strokeLinejoin="round"
        />
      ))}
      {doodle.decor.map((dec, i) => (
        <path
          key={`d-${i}`}
          d={dec.d}
          fill="none"
          stroke="#262219"
          strokeWidth={doodle.strokeWidth * 0.7}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
});

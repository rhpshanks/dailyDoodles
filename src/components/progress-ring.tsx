type RingProps = { pct: number; size?: number };

// Thin ultramarine progress ring with a mono percentage, as on the hero board.
export function ProgressRing({ pct, size = 92 }: RingProps) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#DFDACE" strokeWidth="5" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#3441C8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-ddmono text-lg text-dd-blue">
        {Math.floor(clamped * 100)}%
      </span>
    </div>
  );
}

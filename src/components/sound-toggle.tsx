import { useEffect, useState } from "react";

import { sound } from "./sound";

// Small pill switch for the sound kit (soft pops + rain ambience). Off by
// default; the choice persists. The three bars sway only while sound is on.
export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("dd-sound") === "on";
    if (saved) setOn(true);
    // Ambience may only start from a user gesture, so a saved "on" state
    // arms the flag and the first click anywhere wakes the audio kit.
    sound.enabled = saved;
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    sound.setEnabled(next);
    window.localStorage.setItem("dd-sound", next ? "on" : "off");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-ddmono text-[11px] uppercase tracking-[0.14em] transition-colors duration-200 motion-reduce:transition-none ${
        on ? "border-dd-blue text-dd-blue" : "border-dd-hairline text-dd-muted"
      }`}
    >
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[7, 11, 5].map((h, i) => (
          <span
            key={i}
            className={`w-[2px] rounded-sm ${on ? "bg-dd-blue dd-wave" : "bg-dd-muted"}`}
            style={{ height: h, animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      Sound {on ? "on" : "off"}
    </button>
  );
}

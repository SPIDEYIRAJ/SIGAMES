import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isAmbientEnabled, setAmbientEnabled } from "@/lib/ambient";

/** Floating console-room ambience toggle. The audio starts from this click. */
export default function AmbientSound() {
  const [on, setOn] = useState(isAmbientEnabled);

  useEffect(() => {
    const sync = () => setOn(isAmbientEnabled());
    window.addEventListener("storage", sync);
    window.addEventListener("si-games-ambient-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("si-games-ambient-change", sync);
    };
  }, []);

  return (
    <button
      type="button"
      className={`ambient-toggle ${on ? "is-on" : ""}`}
      aria-pressed={on}
      aria-label={on ? "Turn ambient sound off" : "Turn ambient sound on"}
      title={on ? "Ambient sound on" : "Ambient sound off"}
      onClick={() => {
        const next = !on;
        setOn(next);
        setAmbientEnabled(next);
      }}
    >
      {on ? <Volume2 size={15} /> : <VolumeX size={15} />}
      <span className="ambient-toggle-label">AMBIENT</span>
      <span className="ambient-bars" aria-hidden="true"><i /><i /><i /><i /></span>
    </button>
  );
}

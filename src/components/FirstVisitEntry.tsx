import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crown, Gamepad2, Play, Sparkles } from "lucide-react";
import { playEntryChime } from "@/lib/ambient";

const SEEN_KEY = "si-games-entry-seen";
const FOUNDING_KEY = "si-games-founding";

function hasSeenEntry(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * First boot. New players get a console-style hand-off and a founding badge
 * that stays on their shelf; returning players never see the overlay again.
 */
export default function FirstVisitEntry() {
  const [open, setOpen] = useState(() => !hasSeenEntry());
  const reduceMotion = useReducedMotion();

  const enter = (founding: boolean) => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
      if (founding) localStorage.setItem(FOUNDING_KEY, "1");
    } catch {
      // Private mode: this boot is still a one-off for the tab.
    }
    playEntryChime();
    if (founding) window.dispatchEvent(new Event("si-games-founding"));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="first-entry"
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-entry-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)", scale: 1.02 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="first-entry-grid" aria-hidden="true" />
          <div className="first-entry-scan" aria-hidden="true" />
          <div className="first-entry-glyphs" aria-hidden="true">
            <span>△</span><span>○</span><span>✕</span><span>□</span>
          </div>

          <motion.div
            className="first-entry-card"
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: reduceMotion ? 0 : 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="first-entry-mark">
              <span>SI</span>
              <i className="first-entry-ring" />
              <i className="first-entry-ring first-entry-ring--two" />
            </div>
            <span className="first-entry-kicker"><Sparkles size={13} /> SI OS // FIRST BOOT</span>
            <h1 id="first-entry-title">Welcome,<br /><em>Player One.</em></h1>
            <p>
              You made it to the shelf early. This is the console dashboard for a very large browser arcade — settle in,
              pick a title, and make yourself at home.
            </p>
            <div className="first-entry-badge"><Crown size={15} /> FOUNDING PLAYER · BADGE UNLOCKED</div>
            <button type="button" className="first-entry-start" onClick={() => enter(true)}>
              <Play size={19} fill="currentColor" /> PRESS START
            </button>
            <button type="button" className="first-entry-skip" onClick={() => enter(false)}>
              <Gamepad2 size={13} /> Skip the intro
            </button>
            <span className="first-entry-foot">CONTROLLER READY · SOUND OPTIONAL · INSTALLABLE</span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

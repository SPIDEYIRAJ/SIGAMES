import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Play, Sparkles } from "lucide-react";

const INTRO_SESSION_KEY = "si-games-intro-session";

function introAlreadyDone(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * The start-of-visit welcome screen.
 *
 * It greets the player and opens the arcade. Nothing is asked for and nothing
 * is required: music, themes and folders all live in the soundtrack control.
 */
export default function MusicGate() {
  const reduceMotion = useReducedMotion();
  const [introDone, setIntroDone] = useState(introAlreadyDone);
  const [open, setOpen] = useState(false);
  const shown = useRef(false);

  useEffect(() => {
    const handleDone = () => setIntroDone(true);
    window.addEventListener("si-games-intro-done", handleDone);
    return () => window.removeEventListener("si-games-intro-done", handleDone);
  }, []);

  useEffect(() => {
    if (!introDone || shown.current) return;
    shown.current = true;
    setOpen(true);
  }, [introDone]);

  /** While the welcome screen is up, the page behind it cannot scroll. */
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="music-gate-backdrop si-welcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.4 }}
        >
          <div className="si-welcome-aura" aria-hidden="true" />
          <motion.div
            className="music-gate si-welcome"
            role="dialog"
            aria-modal="true"
            aria-labelledby="music-gate-title"
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="si-welcome-head">
              <span className="si-welcome-kicker"><Sparkles size={13} /> WELCOME BACK</span>
              <h2 id="music-gate-title">Welcome to <b>SI GAMES</b></h2>
              <p>Pick a game and jump straight in. Everything else — themes, sound, folders — is yours to set up whenever you feel like it.</p>
            </div>

            <button type="button" className="si-welcome-enter" onClick={() => setOpen(false)}>
              <Play size={16} fill="currentColor" />
              ENTER SI GAMES
            </button>
            <p className="si-welcome-require">No setup needed · start playing right away</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

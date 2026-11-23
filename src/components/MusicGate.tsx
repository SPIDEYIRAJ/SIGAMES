import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import { useNavigate } from "react-router";
import { setThemeSongEnabled, startThemeSong } from "@/lib/theme-song";
import { stopLocalMusic } from "@/lib/local-music";

const SESSION_KEY = "si-games-intro-session";
const SEEN_KEY = "si-games-entry-seen";
const FOUNDING_KEY = "si-games-founding";

function shownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

function seenBefore(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * The start screen.
 *
 * One button. It opens the shelf and starts the SI theme song in the same
 * click, which is also the gesture browsers require before audio can play.
 * There is nothing to configure here: no folders, no uploads, no choices.
 */
export default function MusicGate() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const enterTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (enterTimer.current) window.clearTimeout(enterTimer.current);
  }, []);

  useEffect(() => {
    if (shownThisSession()) return;
    const timer = window.setTimeout(() => setOpen(true), 1150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const start = () => {
    if (launching) return;
    setLaunching(true);
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode: the intro simply shows again next reload.
    }

    const firstVisit = !seenBefore();
    if (firstVisit) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
        localStorage.setItem(FOUNDING_KEY, "1");
      } catch {
        // The badge is cosmetic; the shelf opens either way.
      }
      window.dispatchEvent(new Event("si-games-founding"));
    }

    // This click is the user gesture: the theme song is the only audio.
    setThemeSongEnabled(true);
    stopLocalMusic(0);
    startThemeSong();
    window.dispatchEvent(new Event("si-games-intro-done"));

    let needsSetup = firstVisit;
    try {
      if (localStorage.getItem("si-games-setup-complete") === "1") needsSetup = false;
    } catch {
      // No storage: keep the first-visit setup redirect for this session.
    }

    if (enterTimer.current) window.clearTimeout(enterTimer.current);
    enterTimer.current = window.setTimeout(() => {
      setOpen(false);
      navigate(needsSetup ? "/setup" : "/");
    }, 1_400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="si-intro"
          role="dialog"
          aria-modal="true"
          aria-labelledby="si-intro-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.4 }}
        >
          <span className="si-intro-scrim" aria-hidden="true" />
          <motion.div
            className="si-intro-inner"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="si-intro-mark" aria-hidden="true">SI</span>
            <span className="si-intro-kicker">INSERT COIN</span>
            <h1 id="si-intro-title">SI GAMES</h1>
            <p>Pick a game and jump straight in.</p>
            <button type="button" className="si-intro-start" onClick={start} autoFocus disabled={launching}>
              {launching ? <Loader2 size={18} className="spin" /> : <Play size={18} fill="currentColor" />}
              {launching ? "ENTERING" : "START"}
            </button>
            <small>{launching ? "Starting the theme" : "No account · Just play"}</small>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

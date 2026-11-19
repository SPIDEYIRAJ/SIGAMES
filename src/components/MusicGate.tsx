import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
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
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Private mode: the intro simply shows again next reload.
    }

    if (!seenBefore()) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
        localStorage.setItem(FOUNDING_KEY, "1");
      } catch {
        // The badge is cosmetic; the shelf opens either way.
      }
      window.dispatchEvent(new Event("si-games-founding"));
    }

    // This click is the user gesture: turn the theme on and play immediately.
    setThemeSongEnabled(true);
    stopLocalMusic(0);
    startThemeSong();
    window.dispatchEvent(new Event("si-games-intro-done"));

    setOpen(false);
    navigate("/");
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
            <button type="button" className="si-intro-start" onClick={start} autoFocus>
              <Play size={18} fill="currentColor" />
              START
            </button>
            <small>No account · No setup</small>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

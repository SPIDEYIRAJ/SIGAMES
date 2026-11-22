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
  const introSong = useRef<HTMLAudioElement | null>(null);
  const film = useRef<HTMLVideoElement | null>(null);
  const enterTimer = useRef<number | null>(null);

  useEffect(() => () => {
    introSong.current?.pause();
    introSong.current = null;
    film.current?.pause();
    if (enterTimer.current) window.clearTimeout(enterTimer.current);
  }, []);

  /** Short intro sting; the theme rises under it and it fades out. */
  const playIntroSting = () => {
    try {
      introSong.current?.pause();
      const song = new Audio("/audio/si-intro.mp3");
      song.preload = "auto";
      song.volume = 0;
      introSong.current = song;
      void song
        .play()
        .then(() => {
          const started = performance.now();
          const step = (now: number) => {
            if (introSong.current !== song) return;
            const elapsed = now - started;
            const rampIn = Math.min(1, elapsed / 900);
            const rampOut = elapsed > 2800 ? Math.max(0, 1 - (elapsed - 2800) / 1400) : 1;
            song.volume = 0.5 * rampIn * rampOut;
            if (elapsed < 4_200) {
              window.requestAnimationFrame(step);
            } else {
              song.pause();
              if (introSong.current === song) introSong.current = null;
            }
          };
          window.requestAnimationFrame(step);
        })
        .catch(() => undefined);
    } catch {
      // No Audio support: the theme song still starts on its own.
    }
  };

  useEffect(() => {
    if (shownThisSession()) return;
    const timer = window.setTimeout(() => setOpen(true), 1150);
    return () => window.clearTimeout(timer);
  }, []);

  /** Muted autoplay is allowed, but some engines still need an explicit call. */
  useEffect(() => {
    if (!open) return;
    const element = film.current;
    if (!element) return;
    element.muted = true;
    void element.play().catch(() => undefined);
  }, [open]);

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

    // This click is the user gesture: restart the film from its first frame,
    // play the intro sting over it, then open the shelf when the sting ends.
    const element = film.current;
    if (element) {
      element.muted = true;
      element.currentTime = 0;
      void element.play().catch(() => undefined);
    }
    playIntroSting();
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
    }, 2_600);
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
          <video
            ref={film}
            className="si-intro-film"
            src="/videos/si-intro.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            tabIndex={-1}
            onCanPlay={(event) => {
              event.currentTarget.muted = true;
              void event.currentTarget.play().catch(() => undefined);
            }}
          />
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
            <small>{launching ? "Rolling the intro film" : "No account · No setup"}</small>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

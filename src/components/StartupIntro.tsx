import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Crown, Gamepad2, Play, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { playEntryChime, setAmbientEnabled } from "@/lib/ambient";
import { setThemeSongEnabled } from "@/lib/theme-song";

const SESSION_KEY = "si-games-intro-session";
const SEEN_KEY = "si-games-entry-seen";
const FOUNDING_KEY = "si-games-founding";
const FILM_MS = 30_000;

function shownThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function hasSeenEntry(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

function markSession(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Private mode: the intro simply shows on the next reload.
  }
}

/**
 * Start-up cinema: the Convex-hosted intro video runs muted behind a sound
 * gate, then the intro song and the SI GAMES room tone take over after the
 * player chooses. New players also claim the founding badge here.
 */
export default function StartupIntro() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<"gate" | "film" | "done">(() => (shownThisSession() ? "done" : "gate"));
  const [founding] = useState(() => !hasSeenEntry());
  const [trackIndex, setTrackIndex] = useState(0);
  const [mediaTimedOut, setMediaTimedOut] = useState(false);
  const started = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intro = useQuery(api.media.introMedia);
  const tracks = intro?.tracks ?? [];
  const track = tracks[trackIndex];
  const ready = intro !== undefined || mediaTimedOut;

  useEffect(() => {
    if (intro !== undefined) return;
    const timer = window.setTimeout(() => setMediaTimedOut(true), 4000);
    return () => window.clearTimeout(timer);
  }, [intro]);

  useEffect(() => {
    if (!started.current || !track) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    void audio.play().catch(() => undefined);
  }, [track]);

  useEffect(() => {
    if (phase !== "film") return;
    const timer = window.setTimeout(() => setPhase("done"), FILM_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  /** Lets the site-wide theme song know the cinema is over, however it ended. */
  useEffect(() => {
    if (phase !== "done") return;
    window.dispatchEvent(new Event("si-games-intro-done"));
  }, [phase]);

  const finish = (withSound: boolean) => {
    markSession();
    if (founding) {
      try {
        localStorage.setItem(SEEN_KEY, "1");
        localStorage.setItem(FOUNDING_KEY, "1");
      } catch {
        // The badge is still shown for this tab.
      }
      window.dispatchEvent(new Event("si-games-founding"));
    }

    if (withSound) {
      setAmbientEnabled(false);
      started.current = true;
      const audio = audioRef.current;
      if (audio && track) {
        audio.currentTime = 0;
        void audio.play().catch(() => playEntryChime());
      } else {
        playEntryChime();
      }
    } else {
      // Muted film: the player asked for quiet, so the theme song stays off
      // too. The floating THEME SONG pill can turn it back on at any time.
      setThemeSongEnabled(false);
      setAmbientEnabled(true);
      playEntryChime();
    }

    setPhase(intro?.videoUrl ? "film" : "done");
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={track}
        preload="auto"
        onEnded={() => {
          if (trackIndex + 1 < tracks.length) setTrackIndex((index) => index + 1);
        }}
      />

      <AnimatePresence>
        {phase === "film" && (
          <motion.div
            className="startup-film"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0.1 : 1.1 }}
            aria-hidden="true"
          >
            {intro?.videoUrl && (
              <video
                src={intro.videoUrl}
                autoPlay
                muted
                playsInline
                preload="metadata"
                onEnded={() => setPhase("done")}
              />
            )}
            <div className="startup-film-shade" />
            <span className="startup-film-label">SI GAMES // FEATURE PRESENTATION</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "gate" && (
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
            <div className="startup-gate-video" aria-hidden="true">
              {intro?.videoUrl && <video src={intro.videoUrl} autoPlay muted loop playsInline preload="metadata" />}
              <div className="startup-gate-shade" />
            </div>
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
              <span className="first-entry-kicker">
                <Sparkles size={13} /> {founding ? "SI GAMES // FIRST BOOT" : "SI GAMES // SESSION START"}
              </span>
              <h1 id="first-entry-title">
                {founding ? <>Welcome,<br /><em>Player One.</em></> : <>Welcome back,<br /><em>Player One.</em></>}
              </h1>
              <p>
                The console is awake. Start the intro with sound, or go muted and let the SI GAMES room tone run underneath.
              </p>
              {founding && <div className="first-entry-badge"><Crown size={15} /> FOUNDING PLAYER · BADGE UNLOCKED</div>}
              <div className="startup-sound-actions">
                <button
                  type="button"
                  className="first-entry-start"
                  onClick={() => finish(true)}
                  disabled={!ready}
                >
                  <Volume2 size={18} /> {ready ? "ENTER WITH SOUND" : "TUNING INTRO…"}
                </button>
                <button
                  type="button"
                  className="first-entry-muted"
                  onClick={() => finish(false)}
                  disabled={!ready}
                >
                  <VolumeX size={17} /> ENTER MUTED <small>room tone on</small>
                </button>
              </div>
              <button type="button" className="first-entry-skip" onClick={() => { markSession(); setPhase("done"); }}>
                <Gamepad2 size={13} /> Skip the intro
              </button>
              <span className="first-entry-foot">INTRO FILM · CONVEX SOUNDTRACK · CONTROLLER READY</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {phase === "film" && (
        <button type="button" className="startup-film-skip" onClick={() => setPhase("done")}>
          <Play size={12} /> SKIP INTRO
        </button>
      )}
    </>
  );
}

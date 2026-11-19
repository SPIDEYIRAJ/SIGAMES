import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useQuery } from "convex/react";
import { Music2, Sparkles, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import {
  duckThemeSong,
  fadeThemeSongForGame,
  isThemeSongEnabled,
  resumeThemeSongAfterGame,
  setThemeSongEnabled,
  setThemeSongUrl,
  startThemeSong,
  unduckThemeSong,
} from "@/lib/theme-song";

const INTRO_SESSION_KEY = "si-games-intro-session";

function introAlreadyDone(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

/** Every route that hands the screen to a game gets the ducked theme. */
function isGamePage(pathname: string): boolean {
  return pathname.startsWith("/play/") || pathname === "/gta-v" || pathname === "/gta-vicecity";
}

/**
 * Site-wide theme song control.
 *
 * The loop waits for the start-up cinema to finish so it never talks over the
 * intro, fades up from silence on its first run, ducks while a game page is
 * open, and stops itself once the game reports that it loaded. The dock also
 * carries the future "play your own song" entry point.
 */
export default function ThemeSong() {
  const { pathname } = useLocation();
  const media = useQuery(api.media.themeSong);
  const [enabled, setEnabled] = useState(isThemeSongEnabled);
  const [introDone, setIntroDone] = useState(introAlreadyDone);
  const [ownSongSoon, setOwnSongSoon] = useState(false);
  const onGamePage = isGamePage(pathname);

  /** Resolve the Convex storage URL once, then keep it for the session. */
  useEffect(() => {
    setThemeSongUrl(media?.url);
  }, [media?.url]);

  /** The intro dispatches this when the gate and film are over (or skipped). */
  useEffect(() => {
    const handleDone = () => setIntroDone(true);
    window.addEventListener("si-games-intro-done", handleDone);
    return () => window.removeEventListener("si-games-intro-done", handleDone);
  }, []);

  useEffect(() => {
    const sync = () => setEnabled(isThemeSongEnabled());
    window.addEventListener("si-games-theme-song-change", sync);
    return () => window.removeEventListener("si-games-theme-song-change", sync);
  }, []);

  /** Start only after the intro and once a source exists; the player's first
   *  gesture after a cold load unlocks playback. */
  useEffect(() => {
    if (!introDone || !enabled || !media?.url) return;
    startThemeSong();
  }, [introDone, enabled, media?.url]);

  /** Game page → duck. Shelf → back to normal, or restart if the game stopped it. */
  useEffect(() => {
    if (onGamePage) {
      duckThemeSong();
      return;
    }
    unduckThemeSong();
    resumeThemeSongAfterGame();
  }, [onGamePage]);

  /** The game frame tells us the moment it finished loading. */
  useEffect(() => {
    if (!onGamePage) return;
    const handleLoaded = () => fadeThemeSongForGame();
    window.addEventListener("si-games-game-loaded", handleLoaded);
    return () => window.removeEventListener("si-games-game-loaded", handleLoaded);
  }, [onGamePage]);

  /** The "coming soon" note retires on its own. */
  useEffect(() => {
    if (!ownSongSoon) return;
    const timer = window.setTimeout(() => setOwnSongSoon(false), 4500);
    return () => window.clearTimeout(timer);
  }, [ownSongSoon]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    setThemeSongEnabled(next);
  };

  return (
    <div className="theme-dock">
      {ownSongSoon && (
        <div className="theme-soon" role="status" aria-live="polite">
          <strong><Sparkles size={12} /> COMING SOON</strong>
          <small>Playing your own song lands in a later update.</small>
        </div>
      )}
      <div className="theme-dock-row">
        <button
          type="button"
          className={`theme-song-toggle ${enabled ? "is-on" : ""}`}
          aria-pressed={enabled}
          aria-label={enabled ? "Turn the SI GAMES theme song off" : "Turn the SI GAMES theme song on"}
          title={enabled ? "Theme song on" : "Theme song off"}
          onClick={toggle}
        >
          <Music2 size={15} />
          <span>THEME SONG</span>
          <span className="theme-song-bars" aria-hidden="true"><i /><i /><i /><i /></span>
        </button>
        <button
          type="button"
          className="theme-own-button"
          aria-label="Play your own song — coming soon"
          title="Play your own song — coming soon"
          onClick={() => setOwnSongSoon(true)}
        >
          <Upload size={13} />
          <span>PLAY YOUR OWN SONG</span>
        </button>
      </div>
    </div>
  );
}

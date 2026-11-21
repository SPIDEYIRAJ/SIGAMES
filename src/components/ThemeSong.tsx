import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Music2, VolumeX } from "lucide-react";
import {
  duckThemeSong,
  fadeThemeSongForGame,
  isThemeSongEnabled,
  resumeThemeSongAfterGame,
  setThemeSongEnabled,
  startThemeSong,
  unduckThemeSong,
} from "@/lib/theme-song";
import { stopLocalMusic } from "@/lib/local-music";

/** Every route that hands the screen to a game gets the ducked soundtrack. */
function isGamePage(pathname: string): boolean {
  return pathname.startsWith("/play/") || pathname === "/gta-v" || pathname === "/gta-vicecity";
}

/**
 * The whole soundtrack control: one button that plays or mutes the SI theme.
 *
 * There is no upload, no folder import and no panel — the site ships one theme
 * song, it starts from the START screen, and the player can turn it off here.
 */
export default function ThemeSong() {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState(isThemeSongEnabled);
  const onGamePage = isGamePage(pathname);

  /** The track is served from `/audio`, so it can start as soon as the app
   *  mounts; a blocked autoplay is retried on the next gesture. */
  useEffect(() => {
    if (enabled) startThemeSong();
  }, [enabled]);

  useEffect(() => {
    const sync = () => setEnabled(isThemeSongEnabled());
    window.addEventListener("si-games-theme-song-change", sync);
    const restart = () => {
      if (isThemeSongEnabled()) startThemeSong();
    };
    window.addEventListener("si-games-intro-done", restart);
    return () => {
      window.removeEventListener("si-games-theme-song-change", sync);
      window.removeEventListener("si-games-intro-done", restart);
    };
  }, []);

  useEffect(() => {
    if (onGamePage) {
      duckThemeSong();
      return;
    }
    unduckThemeSong();
    resumeThemeSongAfterGame();
  }, [onGamePage]);

  useEffect(() => {
    if (!onGamePage) return;
    const handleLoaded = () => fadeThemeSongForGame();
    window.addEventListener("si-games-game-loaded", handleLoaded);
    return () => window.removeEventListener("si-games-game-loaded", handleLoaded);
  }, [onGamePage]);

  const toggle = useCallback(() => {
    const next = !enabled;
    setThemeSongEnabled(next);
    setEnabled(next);
    if (!next) stopLocalMusic(500);
  }, [enabled]);

  return (
    <div className="soundtrack">
      <button
        type="button"
        className={`soundtrack-fab ${enabled ? "is-on" : ""}`}
        aria-pressed={enabled}
        aria-label={enabled ? "Turn the theme song off" : "Turn the theme song on"}
        title={enabled ? "Theme song on" : "Theme song off"}
        onClick={toggle}
      >
        {enabled ? <Music2 size={18} /> : <VolumeX size={18} />}
        <span className="soundtrack-bars" aria-hidden="true"><i /><i /><i /></span>
      </button>
    </div>
  );
}

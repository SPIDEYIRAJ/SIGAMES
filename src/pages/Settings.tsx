import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  Check,
  Gauge,
  Gamepad2,
  HardDrive,
  Loader2,
  MonitorSmartphone,
  Music2,
  Palette,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { THEMES, applyTheme, readStoredTheme, type ThemeId } from "@/lib/themes";
import { isThemeSongEnabled, setThemeSongEnabled } from "@/lib/theme-song";
import {
  CONTROLLERS_CHANGE_EVENT,
  isControllersEnabled,
  setControllersEnabled,
} from "@/lib/omnipad";
import {
  MOTION_CHANGE_EVENT,
  readMotionPreference,
  setMotionPreference,
  type MotionPreference,
} from "@/lib/motion";
import {
  clearEverythingForSiteAndGames,
  clearLocalStorage,
  readStorageUsage,
} from "@/lib/browser-data";
import ShareButton from "@/components/ShareButton";

function Toggle({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={`settings-toggle ${on ? "is-on" : ""}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className="settings-knob" />
      <span className="settings-toggle-state">{on ? "On" : "Off"}</span>
    </button>
  );
}

export default function Settings() {
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);
  const [song, setSong] = useState(isThemeSongEnabled);
  const [controllers, setControllers] = useState(isControllersEnabled);
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);
  const [usage, setUsage] = useState<{ used: string; quota: string } | null>(null);
  const [busy, setBusy] = useState<"prefs" | "all" | null>(null);
  const [armed, setArmed] = useState(false);
  const [notice, setNotice] = useState("");
  const hero = useRef<HTMLDivElement>(null);
  const armTimer = useRef<number | null>(null);

  useEffect(() => {
    void readStorageUsage().then(setUsage);
    const syncSong = () => setSong(isThemeSongEnabled());
    const syncControllers = () => setControllers(isControllersEnabled());
    const syncMotion = () => setMotion(readMotionPreference());
    window.addEventListener("si-games-theme-song-change", syncSong);
    window.addEventListener(CONTROLLERS_CHANGE_EVENT, syncControllers);
    window.addEventListener(MOTION_CHANGE_EVENT, syncMotion);
    return () => {
      window.removeEventListener("si-games-theme-song-change", syncSong);
      window.removeEventListener(CONTROLLERS_CHANGE_EVENT, syncControllers);
      window.removeEventListener(MOTION_CHANGE_EVENT, syncMotion);
      if (armTimer.current) window.clearTimeout(armTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const pickTheme = (id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
  };

  const toggleSong = (next: boolean) => {
    setThemeSongEnabled(next);
    setSong(next);
  };

  const toggleControllers = (next: boolean) => {
    setControllersEnabled(next);
    setControllers(next);
  };

  const pickMotion = (next: MotionPreference) => {
    setMotionPreference(next);
    setMotion(next);
  };

  const clearPreferences = () => {
    setBusy("prefs");
    clearLocalStorage();
    window.setTimeout(() => window.location.assign("/settings"), 180);
  };

  const armErase = () => {
    setArmed(true);
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setArmed(false), 6000);
  };

  const eraseEverything = async () => {
    if (!armed) {
      armErase();
      return;
    }
    setBusy("all");
    if (armTimer.current) window.clearTimeout(armTimer.current);
    await clearEverythingForSiteAndGames();
    window.location.assign("/");
  };

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = hero.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    hero.current?.style.setProperty("--tilt-x", `${(-y * 7).toFixed(2)}deg`);
    hero.current?.style.setProperty("--tilt-y", `${(x * 9).toFixed(2)}deg`);
    hero.current?.style.setProperty("--spot-x", `${(x + 0.5) * 100}%`);
    hero.current?.style.setProperty("--spot-y", `${(y + 0.5) * 100}%`);
  };

  const resetTilt = () => {
    hero.current?.style.setProperty("--tilt-x", "0deg");
    hero.current?.style.setProperty("--tilt-y", "0deg");
  };

  return (
    <div className="settings-page">
      <header className="settings-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <span className="settings-topbar-label"><Sparkles size={13} /> CONTROL CENTER</span>
        <Link className="settings-back" to="/"><ArrowLeft size={14} /> Library</Link>
      </header>

      <main className="settings-main">
        <div className="settings-hero" ref={hero} onPointerMove={tilt} onPointerLeave={resetTilt}>
          <div className="settings-hero-copy">
            <span className="section-kicker"><Palette size={14} /> PERSONALISE THE SHELL</span>
            <h1>Make it<br /><span>yours.</span></h1>
            <p>
              Palette, soundtrack, controller layer and motion depth in one place. Everything is
              stored on this device only.
            </p>
            <div className="settings-hero-chips">
              <span className="settings-chip">{THEMES.find((item) => item.id === theme)?.label}</span>
              <span className="settings-chip">{motion === "full" ? "FULL MOTION" : "CALM MOTION"}</span>
              <span className="settings-chip">{controllers ? "PAD ON" : "PAD OFF"}</span>
            </div>
          </div>

          <div className="settings-deck" aria-hidden="true">
            <span className="settings-deck-orbit orbit-one" />
            <span className="settings-deck-orbit orbit-two" />
            <span className="settings-deck-card card-back" />
            <span className="settings-deck-card card-mid" />
            <span className="settings-deck-card card-front">
              <i className="settings-deck-badge">SI</i>
              <b>SETTINGS</b>
              <small>DEPTH / MOTION / SOUND</small>
              <em className="settings-deck-bar"><i /></em>
            </span>
          </div>
        </div>

        <section className="settings-section" aria-labelledby="settings-theme-title">
          <div className="settings-section-head">
            <span className="settings-index">01</span>
            <div>
              <h2 id="settings-theme-title">Colour theme</h2>
              <p>One palette recolours every surface, glow and browser chrome accent.</p>
            </div>
          </div>
          <div className="settings-theme-grid">
            {THEMES.map((item) => {
              const active = item.id === theme;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`settings-theme${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => pickTheme(item.id)}
                >
                  <span
                    className="settings-theme-swatch"
                    aria-hidden="true"
                    style={{ "--swatch-a": item.accent, "--swatch-b": item.glow } as CSSProperties}
                  >
                    <i />
                  </span>
                  <span className="settings-theme-copy">
                    <strong>{item.label}</strong>
                    <small>{item.note}</small>
                  </span>
                  {active && <Check size={14} className="settings-check" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-audio-title">
          <div className="settings-section-head">
            <span className="settings-index">02</span>
            <div>
              <h2 id="settings-audio-title">Sound &amp; controls</h2>
              <p>The site soundtrack and the on-screen controller layer.</p>
            </div>
          </div>
          <div className="settings-rows">
            <div className="settings-row">
              <span className="settings-row-icon"><Music2 size={17} /></span>
              <div className="settings-row-copy">
                <strong>Theme song</strong>
                <small>Loops the SI GAMES theme, ducks under a running game and resumes on the shelf.</small>
              </div>
              <Toggle on={song} label="Theme song" onChange={toggleSong} />
            </div>
            <div className="settings-row">
              <span className="settings-row-icon"><Gamepad2 size={17} /></span>
              <div className="settings-row-copy">
                <strong>Controller overlay</strong>
                <small>Adds the OmniPad touch pad and maps connected Xbox / PlayStation controllers.</small>
              </div>
              <Toggle on={controllers} label="Controller overlay" onChange={toggleControllers} />
            </div>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-motion-title">
          <div className="settings-section-head">
            <span className="settings-index">03</span>
            <div>
              <h2 id="settings-motion-title">Motion &amp; depth</h2>
              <p>Control the decorative layers. Your operating system preference always wins.</p>
            </div>
          </div>
          <div className="settings-motion">
            <button
              type="button"
              className={`settings-motion-option${motion === "full" ? " is-active" : ""}`}
              aria-pressed={motion === "full"}
              onClick={() => pickMotion("full")}
            >
              <span className="settings-motion-art art-full"><i /><i /><i /></span>
              <strong>Full depth</strong>
              <small>Orbital rings, floating glyphs, light beams, scroll reveals and drifting colour.</small>
            </button>
            <button
              type="button"
              className={`settings-motion-option${motion === "reduced" ? " is-active" : ""}`}
              aria-pressed={motion === "reduced"}
              onClick={() => pickMotion("reduced")}
            >
              <span className="settings-motion-art art-calm"><i /></span>
              <strong>Calm</strong>
              <small>Static gradients and instant sections. Required UI feedback still animates.</small>
            </button>
          </div>
          <div className="settings-lab">
            <div>
              <span className="section-kicker"><Gauge size={13} /> PERFORMANCE LAB</span>
              <p>Measure this browser's frame pacing, CPU throughput and GPU shader fill.</p>
            </div>
            <Link className="settings-lab-link" to="/benchmark">Open benchmark <ArrowLeft size={14} className="settings-flip" /></Link>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="settings-data-title">
          <div className="settings-section-head">
            <span className="settings-index">04</span>
            <div>
              <h2 id="settings-data-title">Data &amp; storage</h2>
              <p>Saved preferences, favourites, recent games and game-side storage on this origin.</p>
            </div>
          </div>

          <div className="settings-storage">
            <span className="settings-row-icon"><HardDrive size={17} /></span>
            <div className="settings-row-copy">
              <strong>This site is using {usage?.used ?? "…"}</strong>
              <small>{usage ? `of an estimated ${usage.quota} available to the browser.` : "Storage estimate is unavailable in this browser."}</small>
            </div>
            <span className="settings-storage-badge"><MonitorSmartphone size={12} /> LOCAL ONLY</span>
          </div>

          <div className="settings-danger">
            <div className="settings-danger-head">
              <span className="settings-row-icon"><Trash2 size={17} /></span>
              <div className="settings-row-copy">
                <strong>Delete browser data</strong>
                <small>Clear this site's saved preferences, then reload into a fresh shell.</small>
              </div>
              <button
                type="button"
                className="settings-danger-btn"
                disabled={busy !== null}
                onClick={clearPreferences}
              >
                {busy === "prefs" ? <Loader2 size={14} className="spin" /> : <RotateCcw size={14} />}
                Clear preferences
              </button>
            </div>

            <div className="settings-experimental">
              <span className="settings-experimental-badge"><ShieldAlert size={12} /> EXPERIMENTAL</span>
              <p>
                Removes <b>all local storage for SI GAMES and every game hosted on this origin</b>,
                plus session flags, cached files, IndexedDB and the installed service worker.
                Game saves, favourites, comments identity and settings are permanently lost. Other
                sites are not touched.
              </p>
              <button
                type="button"
                className={`settings-erase${armed ? " is-armed" : ""}`}
                disabled={busy !== null}
                onClick={eraseEverything}
              >
                {busy === "all" ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                {busy === "all" ? "Deleting everything…" : armed ? "Tap again to delete everything" : "Delete site + game data"}
              </button>
              <small className="settings-erase-note">
                {armed ? "This is your last tap. The page will reload with no saved data." : "Experimental · asks for a second confirmation."}
              </small>
            </div>
          </div>
        </section>

        <div className="settings-footer">
          <ShareButton className="share-button--footer" title="SI GAMES" text="A whole browser arcade, ready to play." url="/" label="Share site" />
          <Link className="settings-back" to="/"><ArrowLeft size={14} /> Back to the library</Link>
        </div>
      </main>

      {notice && <div className="settings-notice" role="status">{notice}</div>}
    </div>
  );
}

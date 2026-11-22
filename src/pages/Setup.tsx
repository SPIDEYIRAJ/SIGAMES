import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Palette, Sparkles, Volume2, VolumeX } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { THEMES, applyTheme, readStoredTheme, type ThemeId } from "@/lib/themes";
import { isThemeSongEnabled, setThemeSongEnabled } from "@/lib/theme-song";
import { readMotionPreference, setMotionPreference, type MotionPreference } from "@/lib/motion";
import { stopLocalMusic } from "@/lib/local-music";

const SETUP_KEY = "si-games-setup-complete";

const STEPS = [
  { title: "Choose your colour", copy: "The palette recolours the whole platform, from the launcher glow to the player chrome." },
  { title: "Set the atmosphere", copy: "Keep the soundtrack and cinematic depth, or dial both down. You can change this later." },
  { title: "You're ready", copy: "Your launcher is configured. The library, favourites and recent games stay on this device." },
];

export default function Setup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);
  const [song, setSong] = useState(isThemeSongEnabled);
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);

  const finish = () => {
    try {
      localStorage.setItem(SETUP_KEY, "1");
    } catch {
      // Private mode still enters the platform, just without remembering setup.
    }
    navigate("/");
  };

  const updateTheme = (id: ThemeId) => {
    applyTheme(id);
    setTheme(id);
  };

  const updateSong = (next: boolean) => {
    setThemeSongEnabled(next);
    setSong(next);
    if (!next) stopLocalMusic(300);
  };

  const updateMotion = (next: MotionPreference) => {
    setMotionPreference(next);
    setMotion(next);
  };

  return (
    <div className="setup-page">
      <header className="setup-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <span className="setup-topbar-label">FIRST-RUN SETUP</span>
        <button type="button" className="setup-skip" onClick={finish}>Skip setup</button>
      </header>

      <main className="setup-main">
        <section className="setup-visual" aria-hidden="true">
          <span className="setup-orbit setup-orbit--a" />
          <span className="setup-orbit setup-orbit--b" />
          <span className="setup-visual-glow" />
          <div className="setup-visual-card">
            <span className="setup-visual-mark">SI</span>
            <strong>NEXT<br />GENERATION</strong>
            <small>PLAY · DISCOVER · ENJOY</small>
            <i><b /></i>
          </div>
          <span className="setup-visual-caption">SPIDEY_IRAJ / PLATFORM 01</span>
        </section>

        <section className="setup-panel">
          <div className="setup-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
            {STEPS.map((item, index) => (
              <span key={item.title} className={index <= step ? "is-on" : ""} />
            ))}
          </div>

          <span className="section-kicker">0{step + 1} / 0{STEPS.length}</span>
          <h1>{STEPS[step].title}</h1>
          <p className="setup-copy">{STEPS[step].copy}</p>

          {step === 0 && (
            <div className="setup-theme-grid">
              {THEMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`setup-theme${theme === item.id ? " is-active" : ""}`}
                  onClick={() => updateTheme(item.id)}
                  aria-pressed={theme === item.id}
                >
                  <span style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.glow})` }} />
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                  {theme === item.id && <Check size={15} />}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="setup-options">
              <button type="button" className="setup-option" onClick={() => updateSong(!song)} aria-pressed={song}>
                <span className="setup-option-icon">{song ? <Volume2 size={19} /> : <VolumeX size={19} />}</span>
                <span><strong>Theme song</strong><small>{song ? "The SI theme loops under the launcher and ducks in games." : "Silent until you turn it back on."}</small></span>
                <i className={`cine-toggle${song ? " is-on" : ""}`} />
              </button>
              <button type="button" className="setup-option" onClick={() => updateMotion(motion === "full" ? "reduced" : "full")} aria-pressed={motion === "full"}>
                <span className="setup-option-icon"><Sparkles size={19} /></span>
                <span><strong>Cinematic motion</strong><small>{motion === "full" ? "Light trails, reflections, parallax and animated transitions." : "Calm surfaces with reduced ambient motion."}</small></span>
                <i className={`cine-toggle${motion === "full" ? " is-on" : ""}`} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="setup-summary">
              <Palette size={22} />
              <div>
                <strong>{THEMES.find((item) => item.id === theme)?.label ?? "Console"} palette</strong>
                <small>{song ? "Soundtrack on" : "Soundtrack off"} · {motion === "full" ? "Cinematic motion on" : "Reduced motion"}</small>
              </div>
              <Check size={18} />
            </div>
          )}

          <div className="setup-actions">
            {step > 0 ? (
              <button type="button" className="setup-back" onClick={() => setStep((value) => value - 1)}>
                <ArrowLeft size={16} /> Back
              </button>
            ) : <span />}
            {step < STEPS.length - 1 ? (
              <button type="button" className="setup-next" onClick={() => setStep((value) => value + 1)}>
                Continue <ArrowRight size={17} />
              </button>
            ) : (
              <button type="button" className="setup-next" onClick={finish}>
                Enter SI GAMES <ArrowRight size={17} />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

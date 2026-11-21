import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Code2, ExternalLink, Gamepad2, Maximize2, Minimize2 } from "lucide-react";
import DotGrid from "@/components/effects/DotGrid";
import KineticText from "@/components/effects/KineticText";

const SHOWCASE = {
  text: "////SPIDEY_IRAJ////",
  reveal: "letter",
  intro: "assemble",
  introDuration: 2.1,
  from: "#2f8fff",
  to: "#9bf00b",
  accent: "#9bf00b",
  fontSize: 160,
  bounce: 0.42,
} as const;

const HIGHLIGHTS = [
  { title: "Browser first", body: "Every title runs in the tab — no launcher and no downloads." },
  { title: "One shelf", body: "130+ games with search, filters, favourites and player ratings." },
  { title: "Pad ready", body: "Big Picture navigation built for controllers and living-room screens." },
  { title: "Installable", body: "An app shell that lands on the home screen and opens like a native app." },
];

const SWATCHES = [
  { name: "Console black", value: "#04070b", color: "#04070b" },
  { name: "Signal green", value: "accent", color: "var(--si-accent)" },
  { name: "HUD white", value: "#f7fbff", color: "#f7fbff" },
  { name: "Graphite", value: "#8fa0bc", color: "#8fa0bc" },
];

export default function Developers() {
  const [big, setBig] = useState(false);

  /** Big Picture owns the screen, so the page behind it stops scrolling. */
  useEffect(() => {
    if (!big) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [big]);

  /** Big Picture: B / Esc leaves. */
  useEffect(() => {
    if (!big) return;
    let frame = 0;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "b") {
        event.preventDefault();
        setBig(false);
      }
    };
    window.addEventListener("keydown", onKey);

    const pressed = new Set<number>();
    const loop = () => {
      frame = window.requestAnimationFrame(loop);
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((item) => item?.connected);
      if (!pad) return;
      pad.buttons.forEach((button, index) => {
        const was = pressed.has(index);
        if (!button.pressed) {
          if (was) pressed.delete(index);
          return;
        }
        if (was) return;
        pressed.add(index);
        if (index === 1) setBig(false);
      });
    };
    frame = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.cancelAnimationFrame(frame);
    };
  }, [big]);

  return (
    <div className={`dev-page${big ? " is-big-picture" : ""}`}>
      <header className="dev-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <Link className="dev-back" to="/"><ExternalLink size={14} /> Back to the library</Link>
      </header>

      <main className="dev-main">
        <span className="section-kicker"><Code2 size={14} /> MADE BY : SPIDEY_IRAJ</span>
        <h1>SPIDEY_IRAJ</h1>
        <p className="dev-lead">
          The developer behind SI GAMES. One person building a browser-first arcade with live canvas,
          WebGL and a controller-friendly shell.
        </p>

        <section className={`dev-showcase${big ? " is-big" : ""}`} aria-label="SPIDEY_IRAJ kinetic wordmark">
          <DotGrid
            className="dev-showcase-field"
            gradientFrom={SHOWCASE.from}
            gradientTo={SHOWCASE.to}
            dotRadius={1.45}
            dotSpacing={15}
            cursorRadius={230}
            bulgeStrength={0.55}
            glowRadius={170}
            glowIntensity={0.85}
            baseOpacity={0.42}
            waveAmplitude={1.5}
            sparkle
            speed={0.9}
          />

          <div className="dev-showcase-chrome">
            <span className="dev-showcase-made">MADE BY : <b>SPIDEY_IRAJ</b></span>
            <span className="dev-showcase-brand">SI GAMES</span>
          </div>

          <div className="dev-showcase-wordmark">
            <KineticText
              text={SHOWCASE.text}
              fontWeight={700}
              fontSize={SHOWCASE.fontSize}
              reveal={SHOWCASE.reveal}
              intro={SHOWCASE.intro}
              introDuration={SHOWCASE.introDuration}
              bounce={SHOWCASE.bounce}
              accentColor={SHOWCASE.accent}
              dashLength={4}
              dashGap={2}
              specks={12}
              clickKick
              draggable
              guides={false}
            />
          </div>

          <div className="dev-showcase-foot">
            <div className="dev-showcase-meta">
              <span className="dev-showcase-hover">HOVER</span>
            </div>
            <div className="dev-showcase-actions">
              <button type="button" className="dev-showcase-btn" onClick={() => setBig((value) => !value)}>
                {big ? <><Minimize2 size={14} /> Exit Big Picture</> : <><Maximize2 size={14} /> Big Picture</>}
              </button>
            </div>
          </div>

          {big && (
            <p className="dev-showcase-hint">
              <Gamepad2 size={13} /> Drag or kick the wordmark · B / Esc exits
            </p>
          )}
        </section>

        <section className="dev-about" aria-labelledby="dev-about-title">
          <span className="section-kicker">ABOUT SI GAMES</span>
          <h2 id="dev-about-title">An arcade that lives in a tab.</h2>
          <p>
            SI GAMES is an independent browser arcade built and maintained by Spidey Iraj. It collects
            instant-play web games, classic ports and embedded community worlds in one dark, fast
            shelf — no account required, no launcher, no install step before the first round.
          </p>
          <p>
            Every title is hand-checked and grouped by genre, then wrapped in the same console-style
            shell: search, filters, ratings, playtime and a Big Picture mode that works with a keyboard
            or a controller. The catalogue runs from quick browser experiments to full 3D worlds, with
            the player, save data and preferences handled in the same place.
          </p>
          <div className="dev-about-grid">
            {HIGHLIGHTS.map((item) => (
              <article className="dev-about-card" key={item.title}>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="dev-style" aria-labelledby="dev-style-title">
          <span className="section-kicker">SI GAMES STYLE</span>
          <h2 id="dev-style-title">The house style.</h2>
          <div className="dev-style-board">
            <div className="dev-style-lockup">
              <span className="dev-style-mark" aria-hidden="true">SI</span>
              <div>
                <strong>SI GAMES</strong>
                <span>ARCADE / BROWSER FIRST</span>
              </div>
            </div>
            <p className="dev-style-copy">
              Console black surfaces, one electric signal colour and thin HUD rules. Heavy display
              type carries the titles; mono micro-labels carry the details. Motion is part of the
              identity — dot fields, kinetic wordmarks and quiet scanlines rather than stock cards.
            </p>
            <ul className="dev-style-swatches">
              {SWATCHES.map((swatch) => (
                <li className="dev-style-swatch" key={swatch.name}>
                  <i style={{ background: swatch.color }} aria-hidden="true" />
                  <strong>{swatch.name}</strong>
                  <span>{swatch.value}</span>
                </li>
              ))}
            </ul>
            <p className="dev-style-wordmark" aria-hidden="true">SI GAMES</p>
          </div>
        </section>

        <p className="dev-signature">
          Powered by <span>SI GAMES</span> ////SPIDEY_IRAJ////
        </p>
      </main>
    </div>
  );
}

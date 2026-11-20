import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Code2, ExternalLink, Gamepad2, Maximize2, Minimize2 } from "lucide-react";
import DotGrid from "@/components/effects/DotGrid";
import KineticText from "@/components/effects/KineticText";

const VARIANTS = [
  {
    id: "assemble",
    text: "////SPIDEY_IRAJ////",
    reveal: "letter",
    intro: "assemble",
    introDuration: 2.1,
    from: "#2f8fff",
    to: "#9bf00b",
    accent: "#9bf00b",
    fontSize: 160,
    bounce: 0.42,
  },
  {
    id: "type",
    text: "SI GAMES",
    reveal: "area",
    intro: "type",
    introDuration: 1.7,
    from: "#ff7ad9",
    to: "#c9a7ff",
    accent: "#ff7ad9",
    fontSize: 172,
    bounce: 0.34,
  },
  {
    id: "metrics",
    text: "////SPIDEY_IRAJ////",
    reveal: "off",
    intro: "metrics",
    introDuration: 2.2,
    from: "#9bf00b",
    to: "#6bb1ff",
    accent: "#6bb1ff",
    fontSize: 150,
    bounce: 0.4,
  },
] as const;

export default function Developers() {
  const [variant, setVariant] = useState(0);
  const [big, setBig] = useState(false);
  const showcase = VARIANTS[variant];

  /** Big Picture owns the screen, so the page behind it stops scrolling. */
  useEffect(() => {
    if (!big) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [big]);

  /** Big Picture: arrows and the D-pad change the wordmark, B/Esc leaves. */
  useEffect(() => {
    if (!big) return;
    let frame = 0;
    let heldUntil = 0;
    const step = (delta: number) => setVariant((value) => (value + delta + VARIANTS.length) % VARIANTS.length);
    const exit = () => setBig(false);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key.toLowerCase() === "b") {
        event.preventDefault();
        exit();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);

    const pressed = new Set<number>();
    const loop = () => {
      frame = window.requestAnimationFrame(loop);
      const pad = Array.from(navigator.getGamepads?.() ?? []).find((item) => item?.connected);
      if (!pad) return;
      const now = performance.now();
      const axisX = pad.axes[0] ?? 0;
      const axisY = pad.axes[1] ?? 0;
      if (now > heldUntil) {
        if (pad.buttons[14]?.pressed || axisX < -0.45 || pad.buttons[12]?.pressed || axisY < -0.45) {
          step(-1);
          heldUntil = now + 240;
        } else if (pad.buttons[15]?.pressed || axisX > 0.45 || pad.buttons[13]?.pressed || axisY > 0.45) {
          step(1);
          heldUntil = now + 240;
        }
      }
      pad.buttons.forEach((button, index) => {
        const was = pressed.has(index);
        if (!button.pressed) {
          if (was) pressed.delete(index);
          return;
        }
        if (was) return;
        pressed.add(index);
        if (index === 1) exit();
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
        <span className="section-kicker"><Code2 size={14} /> DEVELOPER HUB</span>
        <h1>SI GAMES, rendered.</h1>
        <p className="dev-lead">
          Live canvas experiments behind the arcade: a vector wordmark you can drag and kick, and a
          cursor-reactive dot field. Nothing here is an image.
        </p>

        <section className={`dev-showcase${big ? " is-big" : ""}`} aria-label="SI GAMES kinetic showcase">
          <DotGrid
            className="dev-showcase-field"
            gradientFrom={showcase.from}
            gradientTo={showcase.to}
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
            <span className="dev-showcase-style" aria-live="polite">
              0{variant + 1} / {showcase.id.toUpperCase()}
            </span>
            <span className="dev-showcase-brand">SI GAMES</span>
          </div>

          <div className="dev-showcase-wordmark">
            <KineticText
              key={showcase.id}
              text={showcase.text}
              fontWeight={700}
              fontSize={showcase.fontSize}
              reveal={showcase.reveal}
              intro={showcase.intro}
              introDuration={showcase.introDuration}
              bounce={showcase.bounce}
              accentColor={showcase.accent}
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
              <div className="dev-showcase-dots" role="tablist" aria-label="Wordmark style">
                {VARIANTS.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={index === variant}
                    aria-label={`Style ${index + 1}: ${item.id}`}
                    className={`dev-showcase-dot${index === variant ? " is-active" : ""}`}
                    onClick={() => setVariant(index)}
                  />
                ))}
              </div>
            </div>
            <div className="dev-showcase-actions">
              <button
                type="button"
                className="dev-showcase-btn"
                onClick={() => setVariant((value) => (value + 1) % VARIANTS.length)}
              >
                Next style
              </button>
              <button type="button" className="dev-showcase-btn" onClick={() => setBig((value) => !value)}>
                {big ? <><Minimize2 size={14} /> Exit Big Picture</> : <><Maximize2 size={14} /> Big Picture</>}
              </button>
            </div>
          </div>

          {big && (
            <p className="dev-showcase-hint">
              <Gamepad2 size={13} /> Arrow keys or D-pad change the wordmark · B / Esc exits
            </p>
          )}
        </section>

        <p className="dev-signature">
          Powered by <span>SI GAMES</span> ////SPIDEY_IRAJ////
        </p>
      </main>
    </div>
  );
}

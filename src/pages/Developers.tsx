import { useMemo, useState } from "react";
import { Check, Code2, Copy, ExternalLink, Link2 } from "lucide-react";
import { Link } from "react-router";
import { games } from "@/data/games";

/** Absolute URL to a game page on whatever host this build is served from. */
function useOrigin(): string {
  return useMemo(() => (typeof window === "undefined" ? "https://si-games.app" : window.location.origin), []);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" className="dev-copy" onClick={copy}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function Developers() {
  const origin = useOrigin();
  const [selected, setSelected] = useState(games[0]?.id ?? "");
  const [height, setHeight] = useState(640);
  const game = games.find((item) => item.id === selected) ?? games[0];

  const shareUrl = `${origin}/play/${game.id}`;
  const embedCode = [
    `<iframe`,
    `  src="${shareUrl}"`,
    `  width="100%"`,
    `  height="${height}"`,
    `  style="border:0;border-radius:12px;overflow:hidden;background:#060e22"`,
    `  allow="autoplay; fullscreen; gamepad"`,
    `  allowfullscreen`,
    `  loading="lazy"`,
    `  title="${game.title} — played on SI GAMES"`,
    `></iframe>`,
    `<a href="${shareUrl}" target="_blank" rel="noopener">Play ${game.title} on SI GAMES</a>`,
  ].join("\n");
  const creditCode = `<!-- Powered by SI GAMES ////SPIDEY_IRAJ//// -->`;

  return (
    <div className="dev-page">
      <header className="dev-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <Link className="dev-back" to="/"><ExternalLink size={14} /> Back to the library</Link>
      </header>

      <main className="dev-main">
        <span className="section-kicker"><Code2 size={14} /> DEVELOPER HUB</span>
        <h1>Embed SI GAMES on your site.</h1>
        <p className="dev-lead">
          Every title runs on its own shareable page. Copy the link for a plain share, or copy the
          snippet to drop a live, playable frame straight into your own site. No API key, no build
          step, no ads.
        </p>

        <section className="dev-picker">
          <div className="dev-picker-head">
            <h2>1. Pick a game</h2>
            <span className="section-count">{games.length} titles available</span>
          </div>
          <div className="dev-game-row">
            {games.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`dev-game ${item.id === game.id ? "is-active" : ""}`}
                onClick={() => setSelected(item.id)}
              >
                <img src={item.thumbnail} alt="" loading="lazy" />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="dev-picker">
          <div className="dev-picker-head">
            <h2>2. Copy the link</h2>
            <span className="section-count">opens the full SI GAMES player</span>
          </div>
          <div className="dev-code-row">
            <code className="dev-code"><Link2 size={14} />{shareUrl}</code>
            <CopyButton value={shareUrl} label="Copy link" />
          </div>
        </section>

        <section className="dev-picker">
          <div className="dev-picker-head">
            <h2>3. Copy the embed snippet</h2>
            <label className="dev-height">
              height
              <input
                type="number"
                min={320}
                max={1200}
                step={20}
                value={height}
                onChange={(event) => setHeight(Number(event.target.value) || 640)}
              />
              px
            </label>
          </div>
          <div className="dev-code-row dev-code-row--tall">
            <pre className="dev-code dev-code--block">{embedCode}</pre>
            <CopyButton value={embedCode} label="Copy snippet" />
          </div>
        </section>

        <section className="dev-picker">
          <div className="dev-picker-head">
            <h2>4. Credit line</h2>
            <span className="section-count">required when you embed</span>
          </div>
          <div className="dev-code-row">
            <code className="dev-code">{creditCode}</code>
            <CopyButton value={creditCode} label="Copy credit" />
          </div>
          <p className="dev-note">
            Please keep the <span className="disclaimer-sign">////SPIDEY_IRAJ////</span> credit visible
            next to your embed. Everything on SI GAMES is built and kept alive by that name.
          </p>
        </section>

        <section className="dev-picker">
          <div className="dev-picker-head">
            <h2>Live preview</h2>
            <span className="section-count">{game.title}</span>
          </div>
          <div className="dev-preview">
            <iframe
              src={shareUrl}
              title={`${game.title} — SI GAMES preview`}
              height={height}
              allow="autoplay; fullscreen; gamepad"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </section>

        <p className="dev-signature">
          Powered by <span>SI GAMES</span> ////SPIDEY_IRAJ////
        </p>
      </main>
    </div>
  );
}

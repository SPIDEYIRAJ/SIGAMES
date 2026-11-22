import { useDeferredValue, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, ExternalLink, Search } from "lucide-react";
import { Link } from "react-router";
import { games } from "@/data/games";

/** The PlayTab mirror catalog: name, slug and canonical play link for every
 *  title imported from bigpicture.playtab.fun. Covers live on the cards, so
 *  this index stays text-only and fast to scan. */

const GTA_EMBED = `<iframe src="https://playgta5.com/" title="GTA V" allow="accelerometer; autoplay; clipboard-read; clipboard-write; cross-origin-isolated; encrypted-media; fullscreen; gamepad; gyroscope; keyboard-map; picture-in-picture; screen-wake-lock; web-share; xr-spatial-tracking" allowfullscreen referrerpolicy="origin" credentialless></iframe>`;

export default function PlayTab() {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  const entries = useMemo(() => {
    return games
      .filter((game) => game.id.startsWith("bp-"))
      .map((game) => ({
        id: game.id,
        title: game.title,
        slug: game.id.slice(3),
        play: game.sourceUrl,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, []);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) =>
      `${entry.title} ${entry.slug} ${entry.play}`.toLowerCase().includes(needle),
    );
  }, [deferredQuery, entries]);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1800);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="playtab-page">
      <header className="playtab-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <span className="playtab-count">{entries.length} PLAYTAB TITLES</span>
        <Link className="settings-back" to="/"><ArrowLeft size={14} /> Library</Link>
      </header>

      <main className="playtab-main">
        <section className="playtab-hero">
          <span className="section-kicker">PLAYTAB INDEX · NAME / SLUG / PLAY</span>
          <h1>Every PlayTab mirror,<br /><span>one list.</span></h1>
          <p>
            Canonical PlayTab links use the <code>?bp=1</code> play URL. Titles that expose a
            CORS-open build still run inside SI GAMES; the rest open on PlayTab in a new tab.
          </p>

          <div className="playtab-gta">
            <div>
              <span className="settings-experimental-badge">GTA V · SERVER 5 · NEWEST</span>
              <strong>https://playgta5.com/</strong>
              <small>Embedded with gamepad, pointer lock, clipboard, fullscreen, screen wake lock and cross-origin isolation permissions.</small>
            </div>
            <button type="button" className="playtab-copy" onClick={() => copy("gta", GTA_EMBED)}>
              {copied === "gta" ? <Check size={14} /> : <Copy size={14} />}
              {copied === "gta" ? "Embed copied" : "Copy embed"}
            </button>
          </div>

          <label className="playtab-search">
            <Search size={16} />
            <input
              type="search"
              value={query}
              placeholder="Search a title, slug or link…"
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
            />
            <span>{filtered.length} shown</span>
          </label>
        </section>

        <section className="playtab-table" aria-label="PlayTab game links">
          <div className="playtab-row playtab-row--head" aria-hidden="true">
            <span>Name</span>
            <span>Slug</span>
            <span>Play link</span>
          </div>
          {filtered.map((entry) => (
            <div className="playtab-row" key={entry.id}>
              <span className="playtab-name">{entry.title}</span>
              <code className="playtab-slug">{entry.slug}</code>
              <span className="playtab-actions">
                <a href={entry.play} target="_blank" rel="noreferrer">
                  {entry.play.replace("https://bigpicture.playtab.fun/play/", "")}
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  className="playtab-copy playtab-copy--icon"
                  aria-label={`Copy ${entry.title} link`}
                  onClick={() => copy(entry.id, entry.play)}
                >
                  {copied === entry.id ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="playtab-empty">No PlayTab title matches “{deferredQuery}”.</p>
          )}
        </section>
      </main>
    </div>
  );
}

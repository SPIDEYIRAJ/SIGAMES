import { useMemo, useState, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, ArrowRight, Gamepad2, Play, Search, Sparkles, X } from "lucide-react";
import { games, type Game } from "@/data/games";
import { captureLaunchSource } from "@/lib/launch";

const PAGE_SIZE = 48;

const playTabGames = games.filter((game) => game.tags.includes("PlayTab"));

/** The PlayTab catalog, kept inside SI GAMES instead of sending players away. */
export default function PlayTab() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Games");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categories = useMemo(
    () => ["All Games", ...Array.from(new Set(playTabGames.map((game) => game.category))).sort()],
    [],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return playTabGames.filter((game) => {
      const inCategory = category === "All Games" || game.category === category;
      const matches = !needle || game.title.toLowerCase().includes(needle) || game.category.toLowerCase().includes(needle);
      return inCategory && matches;
    });
  }, [category, query]);

  const visibleGames = filtered.slice(0, visible);

  const play = (game: Game, event: MouseEvent<HTMLButtonElement>) => {
    captureLaunchSource(game.id, game.thumbnail, event.currentTarget.closest(".pt-card"));
    navigate(`/play/${game.id}`);
  };

  return (
    <div className="pt-page">
      <div className="fluid-aurora fluid-aurora--page" aria-hidden="true"><i /><i /><i /></div>
      <header className="pt-topbar">
        <Link className="pt-back" to="/"><ArrowLeft size={15} /> Library</Link>
        <Link className="pt-brand" to="/"><span>SI</span> PLAYTAB</Link>
        <span className="pt-count">{playTabGames.length} EMBEDDED TITLES</span>
      </header>

      <main className="pt-main">
        <section className="pt-hero">
          <span className="section-kicker"><Sparkles size={14} /> PLAYTAB // IN-HOUSE ARCADE</span>
          <h1>Every PlayTab game,<br /><span>already in the building.</span></h1>
          <p>
            The full PlayTab shelf is embedded inside SI GAMES — browse the whole catalog here, then play it in the same
            frame. No new tabs, no bouncing between sites.
          </p>
          <div className="pt-hero-stats">
            <span><b>{playTabGames.length}</b> titles</span>
            <span><b>{categories.length - 1}</b> genres</span>
            <span><b>0</b> new tabs</span>
          </div>
          <div className="pt-glyphs" aria-hidden="true"><i>△</i><i>○</i><i>✕</i><i>□</i></div>
        </section>

        <section className="pt-toolbar">
          <label className="pt-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisible(PAGE_SIZE);
              }}
              placeholder="Search the PlayTab shelf"
              aria-label="Search PlayTab games"
            />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}
          </label>
          <div className="pt-categories" role="tablist" aria-label="PlayTab categories">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                className={category === item ? "is-active" : ""}
                onClick={() => {
                  setCategory(item);
                  setVisible(PAGE_SIZE);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="pt-grid-wrap">
          <div className="pt-grid-head">
            <span><Gamepad2 size={14} /> {category === "All Games" ? "THE FULL SHELF" : category.toUpperCase()}</span>
            <small>{filtered.length} matches · embedded in SI GAMES</small>
          </div>
          {visibleGames.length > 0 ? (
            <div className="pt-grid">
              {visibleGames.map((game, index) => (
                <button
                  type="button"
                  className="pt-card"
                  key={game.id}
                  onClick={(event) => play(game, event)}
                  style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
                >
                  <span className="pt-card-art"><img src={game.thumbnail} alt="" loading="lazy" /><i className="pt-card-scan" /></span>
                  <span className="pt-card-copy">
                    <b>{game.title}</b>
                    <small>{game.category}</small>
                  </span>
                  <span className="pt-card-play"><Play size={15} fill="currentColor" /> PLAY</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="pt-empty">
              <Search size={22} />
              <h2>No PlayTab title matches.</h2>
              <button type="button" onClick={() => { setQuery(""); setCategory("All Games"); }}>Reset the shelf</button>
            </div>
          )}
          {visible < filtered.length && (
            <div className="pt-more">
              <button type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                Load {Math.min(PAGE_SIZE, filtered.length - visible)} more <ArrowRight size={15} />
              </button>
              <span>{filtered.length - visible} still embedded</span>
            </div>
          )}
        </section>
      </main>

      <footer className="pt-footer"><span>////SPIDEY_IRAJ////</span><span>PLAYTAB CATALOG · IN-FRAME ONLY</span></footer>
    </div>
  );
}

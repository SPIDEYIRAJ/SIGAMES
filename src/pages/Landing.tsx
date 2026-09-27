import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Clock3,
  Gamepad2,
  Heart,
  Search,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router";
import { categories, games, type Game } from "@/data/games";

const PAGE_SIZE = 18;
const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "az", label: "A to Z" },
  { value: "za", label: "Z to A" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

function readStoredGames(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <span>SI</span>
    </div>
  );
}

function GameCard({ game, favorite, onFavorite, onPlay }: { game: Game; favorite: boolean; onFavorite: () => void; onPlay: () => void }) {
  return (
    <article className="game-card">
      <div className="game-art">
        <img src={game.thumbnail} alt="" loading="lazy" />
        <div className="art-shade" />
        <span className="category-pill">{game.category}</span>
        {game.isNew && <span className="new-pill">New</span>}
        <button type="button" className={`favorite-button ${favorite ? "is-favorite" : ""}`} onClick={onFavorite} aria-label={favorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}>
          <Heart size={17} fill={favorite ? "currentColor" : "none"} />
        </button>
        <div className="art-bottomline">
          <span className="game-index">{String(games.indexOf(game) + 1).padStart(2, "0")}</span>
          <span className="art-type">{game.htmlGame ? "HTML browser game" : game.type === "iframe" ? "Browser ready" : "External game"}</span>
        </div>
      </div>
      <div className="game-card-body">          <div>
          <h3>{game.title}</h3>
          <p>{game.description}</p>
          {game.htmlGame ? <p className="game-card-note game-card-note--html">HTML game · gameplay may be rough, buggy, or unfinished.</p> : game.heavy && <p className="game-card-note">Ship heavy: movements and sounds may lag.</p>}
        </div>
        <button type="button" className="play-button" onClick={onPlay}>
          Play now <ArrowRight size={16} />
        </button>
      </div>
    </article>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Games");
  const [sortBy, setSortBy] = useState<SortValue>("featured");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const htmlCount = useMemo(() => games.filter((game) => game.htmlGame).length, []);
  const heavyCount = useMemo(() => games.filter((game) => game.heavy).length, []);

  useEffect(() => {
    setFavorites(readStoredGames("si-games-favorites"));
    setRecent(readStoredGames("si-games-recent"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, category, sortBy]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchInputRef.current) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateScrollState = () => {
      frame = 0;
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollableHeight)) : 0;
      setScrollProgress(progress);
      setShowBackToTop(window.scrollY > 480);
    };
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollState);
    };
    updateScrollState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const filteredGames = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = games.filter((game) => {
      const matchesCategory = category === "All Games" || game.category === category || game.tags.includes(category);
      const searchable = [game.title, game.category, game.description, ...game.tags].join(" ").toLowerCase();
      return matchesCategory && (!normalized || searchable.includes(normalized));
    });
    if (sortBy === "az") return [...matches].sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "za") return [...matches].sort((a, b) => b.title.localeCompare(a.title));
    return matches;
  }, [category, query, sortBy]);

  const visibleGames = filteredGames.slice(0, visibleCount);
  const remainingCount = filteredGames.length - visibleGames.length;

  const favoriteGames = games.filter((game) => favorites.includes(game.id));
  const recentGames = recent.map((id) => games.find((game) => game.id === id)).filter((game): game is Game => Boolean(game)).slice(0, 3);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const interactive = target.closest(".game-card, .favorite-item, .about-card, .console-card") as HTMLElement | null;
    if (!interactive) return;
    const bounds = interactive.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    interactive.style.setProperty("--tilt-x", `${(-y * 5).toFixed(2)}deg`);
    interactive.style.setProperty("--tilt-y", `${(x * 5).toFixed(2)}deg`);
    interactive.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    interactive.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    document.querySelectorAll<HTMLElement>(".game-card, .favorite-item, .about-card, .console-card").forEach((element) => {
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.style.removeProperty("--glow-x");
      element.style.removeProperty("--glow-y");
    });
  };

  const toggleFavorite = (game: Game) => {
    const next = favorites.includes(game.id) ? favorites.filter((id) => id !== game.id) : [...favorites, game.id];
    setFavorites(next);
    localStorage.setItem("si-games-favorites", JSON.stringify(next));
    setToast(next.includes(game.id) ? "Saved to your favorites" : "Removed from favorites");
  };

  const playGame = (game: Game) => {
    const next = [game.id, ...recent.filter((id) => id !== game.id)].slice(0, 6);
    setRecent(next);
    localStorage.setItem("si-games-recent", JSON.stringify(next));
    navigate(game.standalone ? `/${game.id}` : `/play/${game.id}`);
  };

  return (
    <div className="si-app" onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
      <a className="skip-link" href="#library">Skip to game library</a>
      <div className="scroll-progress" aria-hidden="true"><span style={{ transform: `scaleX(${scrollProgress})` }} /></div>
      <div className="space-hud" aria-hidden="true">
        <div className="hud-corner hud-top-left">
          <span className="hud-label">SI // FLIGHT SYSTEM</span>
          <strong className="hud-value">ORBITAL MODE</strong>
          <span className="hud-rule" />
        </div>
        <div className="hud-crosshair"><i /><i /></div>
        <div className="hud-corner hud-bottom-right">
          <span className="hud-label">WARP CORE <b>ONLINE</b></span>
          <span className="hud-value">VECTOR {Math.round(scrollProgress * 100).toString().padStart(3, "0")}%</span>
        </div>
      </div>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="SI GAMES home"><BrandMark /><span>SI GAMES</span></a>
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#library">Library</a>
          <a href="#favorites">Favorites</a>
          <a href="#about">About</a>
        </nav>
        <div className="header-status"><span className="status-dot" /> {games.length} games ready to play</div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-icon"><Sparkles size={14} /></span> THE PERSONAL GAME SHELF</div>
            <h1>Play something<br /><span>good today.</span></h1>
            <p className="hero-subtitle">A soft landing for your next high score. Curated browser games, zero clutter, just press play.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => playGame(games[0])}><Zap size={17} fill="currentColor" /> Play now</button>
              <a className="soft-button" href="#library">Explore games <ArrowRight size={16} /></a>
            </div>
            <div className="hero-note"><span>✦</span> No ads inside SI GAMES <span>✦</span> Press <kbd>/</kbd> to search</div>
          </div>
          <div className="hero-visual" aria-label="SI GAMES controller illustration">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="space-planet planet-one"><span /></div>
            <div className="space-planet planet-two"><span /></div>
            <div className="fighter-ship" aria-hidden="true"><i /><b /><em /><span /></div>
            <div className="console-card">
              <div className="console-screen"><div className="screen-sun" /><div className="screen-mountain one" /><div className="screen-mountain two" /><div className="screen-runner">◆</div><div className="screen-road" /></div>
              <div className="console-controls"><span className="dpad"><i /><i /><i /><i /></span><div className="console-buttons"><b>+</b><b>•</b></div></div>
              <div className="console-label">SI / 01</div>
            </div>
            <div className="float-chip chip-top"><Trophy size={14} /> {String(games.length).padStart(2, "0")} TITLES</div>
            <div className="float-chip chip-bottom"><Gamepad2 size={14} /> READY TO GO</div>
          </div>
        </section>

        {recentGames.length > 0 && (
          <section className="continue-section content-section" id="continue">
            <div className="section-heading compact"><div><span className="section-kicker"><Clock3 size={14} /> PICK UP WHERE YOU LEFT OFF</span><h2>Continue playing</h2></div><span className="section-count">{recentGames.length} recent</span></div>
            <div className="continue-grid">{recentGames.map((game) => <GameCard key={game.id} game={game} favorite={favorites.includes(game.id)} onFavorite={() => toggleFavorite(game)} onPlay={() => playGame(game)} />)}</div>
          </section>
        )}

        <section className="library-section content-section" id="library">
          <div className="section-heading">
            <div><span className="section-kicker"><Gamepad2 size={14} /> YOUR LITTLE ARCADE</span><h2>Find your next favorite.</h2><p>{games.length} ways to pause the world and play.</p></div>
            <span className="section-count" aria-live="polite">{filteredGames.length.toString().padStart(2, "0")} titles</span>
          </div>
          <div className="truth-band">
            <AlertTriangle size={18} />
            <p><b>Straight talk about this library.</b> {htmlCount} of these titles are plain HTML browser games — small, self-contained builds, and the gameplay can be rough, buggy, or unfinished in places. The other {heavyCount} are heavier external builds that may lag on slower devices. Every game opens inside SI GAMES, in this same frame.</p>
          </div>
          <div className="library-toolbar">
            <div className="toolbar-row">
              <label className="search-box" htmlFor="game-search"><Search size={18} /><input ref={searchInputRef} id="game-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search games, categories..." aria-label="Search games" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={15} /></button>}<kbd className="search-shortcut" aria-hidden="true">/</kbd></label>
              <label className="sort-box" htmlFor="game-sort"><span>Sort</span><select id="game-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortValue)}>{SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
            <div className="category-row" role="tablist" aria-label="Game categories">{categories.map((item) => <button type="button" role="tab" aria-selected={category === item} key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          </div>
          {visibleGames.length > 0 ? <div className="game-grid">{visibleGames.map((game) => <GameCard key={game.id} game={game} favorite={favorites.includes(game.id)} onFavorite={() => toggleFavorite(game)} onPlay={() => playGame(game)} />)}</div> : <div className="empty-state"><div className="empty-icon"><Search size={22} /></div><h3>No games found</h3><p>Try a different search or browse every category.</p><button onClick={() => { setQuery(""); setCategory("All Games"); }}>Reset library</button></div>}
          {remainingCount > 0 && <div className="load-more"><button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Load {Math.min(PAGE_SIZE, remainingCount)} more <ArrowRight size={15} /></button><span>{remainingCount} still in the hangar</span></div>}
        </section>

        <section className="favorites-section content-section" id="favorites">
          <div className="section-heading compact"><div><span className="section-kicker"><Heart size={14} /> YOUR SHORTLIST</span><h2>Favorites <sup>{favoriteGames.length}</sup></h2></div></div>
          {favoriteGames.length > 0 ? <div className="favorite-strip">{favoriteGames.map((game) => <button type="button" className="favorite-item" key={game.id} onClick={() => playGame(game)} aria-label={`Play ${game.title}`}><img src={game.thumbnail} alt="" /><span><b>{game.title}</b><small>{game.category}</small></span><ArrowRight size={16} /></button>)}</div> : <div className="favorites-empty"><Heart size={17} /> Tap the heart on any game to keep it close.</div>}
        </section>

        <section className="about-section content-section" id="about">
          <div className="about-card"><div className="about-mark">✦</div><div><span className="section-kicker">THE SI GAMES PROMISE</span><h2>Less noise. More play.</h2><p>SI GAMES is a personal browser-game launcher made for discovering a good time without the usual internet clutter. Every game opens inside this site, in the same frame, and the experience stays focused on the fun.</p></div><div className="about-stamp">PLAY<br /><span>•</span> DISCOVER<br /><span>•</span> ENJOY</div></div>
          <div className="notes-grid">
            <div className="note-card"><AlertTriangle size={16} /><h3>The HTML titles</h3><p>{htmlCount} of the games here are plain HTML, CSS and JavaScript builds. That keeps them fast and self-contained, but the gameplay can be rough, buggy or unfinished in places.</p></div>
            <div className="note-card"><Zap size={16} /><h3>The heavy titles</h3><p>{heavyCount} older favourites come from outside and are much bigger. They can lag on slower devices, and some refuse to run inside a frame. Those are flagged on the card.</p></div>
            <div className="note-card"><Heart size={16} /><h3>What we keep out</h3><p>No adverts inside the hub, no new tabs, no visible links. Favourites and your recent games stay in this browser only, and there is nothing to sign up for.</p></div>
          </div>
          <p className="signature-line">Built and kept alive by <span>////SPIDEY_IRAJ////</span></p>
        </section>
      </main>

      <div className="watermark-layer" aria-hidden="true"><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span></div>
      <footer className="site-footer"><div className="brand"><BrandMark /><span>SI GAMES</span></div><div className="footer-copy">PLAY. DISCOVER. ENJOY.<small>////SPIDEY_IRAJ////</small></div><div className="footer-mark">SI<span>01</span></div></footer>
      {toast && <div className="toast" role="status"><Heart size={15} fill="currentColor" /> {toast}</div>}
      {showBackToTop && <button type="button" className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><ArrowUp size={15} /> Return to orbit</button>}
    </div>
  );
}

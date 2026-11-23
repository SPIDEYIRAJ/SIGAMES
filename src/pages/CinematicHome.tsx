import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Heart,
  Home,
  Info,
  Library,
  Play,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { categories, games, newGames, type Game } from "@/data/games";
import ShareButton from "@/components/ShareButton";
import { captureLaunchSource } from "@/lib/launch";
import { formatPlaytime, readPlaytime } from "@/lib/playtime";
import { THEMES, applyTheme, readStoredTheme, type ThemeId } from "@/lib/themes";
import { isThemeSongEnabled, setThemeSongEnabled } from "@/lib/theme-song";
import { readMotionPreference, setMotionPreference, type MotionPreference } from "@/lib/motion";
import { stopLocalMusic } from "@/lib/local-music";
import {
  isUiSoundEnabled,
  readUiSoundVolume,
  setUiSoundEnabled,
  setUiSoundVolume,
  UI_SOUND_CHANGE_EVENT,
} from "@/lib/ui-sound";

type Screen = "home" | "discover" | "library" | "recent" | "favorites" | "settings";

const NAV: { id: Screen; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "discover", label: "Discover", icon: Compass },
  { id: "library", label: "My Games", icon: Library },
  { id: "recent", label: "Recently Played", icon: Clock3 },
  { id: "favorites", label: "Favourites", icon: Heart },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

const FEATURED_IDS = [
  "gta-v",
  "gta-iv",
  "gta-vicecity",
  "minecraft-eaglercraft",
  "the-race",
  "among-us",
  "gta3",
  "cs16",
];

const GRID_STEP = 24;
const SORT_KEY = "si-games-sort";
const PLAYS_KEY = "si-games-plays";

type SortMode = "popular" | "az";

function readSort(): SortMode {
  try {
    return localStorage.getItem(SORT_KEY) === "az" ? "az" : "popular";
  } catch {
    return "popular";
  }
}

function readPlays(): Record<string, number> {
  try {
    const value = JSON.parse(localStorage.getItem(PLAYS_KEY) ?? "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
    );
  } catch {
    return {};
  }
}

function readList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function useStoredList(key: string): string[] {
  return useMemo(() => readList(key), [key]);
}

function GameCard({ game, active, onSelect, onDetails, onPlay, favorite, onFavorite }: {
  game: Game;
  active: boolean;
  onSelect: () => void;
  onDetails: () => void;
  onPlay: () => void;
  favorite: boolean;
  onFavorite: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);

  const tilt = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    const node = cardRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    node.style.setProperty("--card-rx", `${(-y * 5.5).toFixed(2)}deg`);
    node.style.setProperty("--card-ry", `${(x * 7).toFixed(2)}deg`);
    node.style.setProperty("--spot-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    node.style.setProperty("--spot-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    const node = cardRef.current;
    if (!node) return;
    node.style.setProperty("--card-rx", "0deg");
    node.style.setProperty("--card-ry", "0deg");
  };

  return (
    <article
      ref={cardRef}
      className={`cine-card${active ? " is-active" : ""}`}
      onPointerMove={tilt}
      onPointerLeave={resetTilt}
    >
      <button type="button" className="cine-card-art" onClick={onSelect} aria-label={`Select ${game.title}`}>
        <img
          src={game.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={(event) => event.currentTarget.classList.add("is-loaded")}
          onError={(event) => event.currentTarget.classList.add("is-error")}
        />
        <span className="cine-card-gradient" />
        <span className="cine-card-light" aria-hidden="true" />
        <span className="cine-card-hover" aria-hidden="true">
          <span className="cine-card-hover-kicker">{game.tags.slice(0, 2).join(" · ") || game.category}</span>
          <span className="cine-card-hover-desc">{game.description}</span>
        </span>
        <span className="cine-card-meta">
          <strong>{game.title}</strong>
          <small>{game.category}</small>
        </span>
      </button>
      <div className="cine-card-foot">
        <button type="button" className="cine-card-play" data-ui-sound="launch" onClick={onPlay} aria-label={`Play ${game.title}`}>
          <Play size={15} fill="currentColor" /> Play
        </button>
        <button type="button" className="cine-card-icon" onClick={onDetails} aria-label={`Details for ${game.title}`}>
          <Info size={15} />
        </button>
        <button
          type="button"
          className={`cine-card-heart${favorite ? " is-on" : ""}`}
          onClick={onFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`}
        >
          <Heart size={15} fill={favorite ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}

export default function CinematicHome() {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("home");
  const [featured, setFeatured] = useState<Game>(() => games[0]);
  const [details, setDetails] = useState<Game | null>(null);
  const [launching, setLaunching] = useState<Game | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All Games");
  const [genre, setGenre] = useState("All genres");
  const [limit, setLimit] = useState(GRID_STEP);
  const [favorites, setFavorites] = useState<string[]>(() => readList("si-games-favorites"));
  const [sort, setSort] = useState<SortMode>(readSort);
  const [plays, setPlays] = useState<Record<string, number>>(readPlays);
  const [theme, setTheme] = useState<ThemeId>(readStoredTheme);
  const [song, setSong] = useState(isThemeSongEnabled);
  const [uiSounds, setUiSounds] = useState(isUiSoundEnabled);
  const [uiVolume, setUiVolume] = useState(readUiSoundVolume);
  const [motion, setMotion] = useState<MotionPreference>(readMotionPreference);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const launchTimer = useRef<number | null>(null);
  const padHeld = useRef<Set<number>>(new Set());

  const recent = useStoredList("si-games-recent");
  const playtime = useMemo(() => readPlaytime(), []);
  const recentGames = useMemo(
    () => recent.map((id) => games.find((game) => game.id === id)).filter((game): game is Game => Boolean(game)),
    [recent],
  );
  const favoriteGames = useMemo(
    () => games.filter((game) => favorites.includes(game.id)),
    [favorites],
  );

  const featuredGames = useMemo(() => {
    const curated = FEATURED_IDS.map((id) => games.find((game) => game.id === id)).filter(
      (game): game is Game => Boolean(game),
    );
    const seen = new Set(curated.map((game) => game.id));
    for (const game of games) {
      if (curated.length >= 10) break;
      if (seen.has(game.id) || game.id.startsWith("bp-")) continue;
      curated.push(game);
      seen.add(game.id);
    }
    return curated;
  }, []);

  const sorted = useCallback((list: Game[]) => {
    if (sort === "az") return [...list].sort((a, b) => a.title.localeCompare(b.title));
    return [...list].sort((a, b) => {
      const score = (game: Game) => (plays[game.id] ?? 0) * 100 + (playtime[game.id] ?? 0) / 60;
      return score(b) - score(a);
    });
  }, [playtime, plays, sort]);

  const trending = useMemo(() => sorted(games.filter((game) => !game.id.startsWith("bp-"))).slice(0, 16), [sorted]);
  const fresh = useMemo(() => newGames.filter((game) => !game.id.startsWith("bp-")).slice(0, 16), []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = games.filter((game) => {
      if (category !== "All Games" && game.category !== category) return false;
      if (genre !== "All genres" && !game.tags.includes(genre)) return false;
      if (!needle) return true;
      return `${game.title} ${game.category} ${game.tags.join(" ")}`.toLowerCase().includes(needle);
    });
    return sorted(list);
  }, [category, genre, query, sorted]);

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const game of games) {
      if (game.id.startsWith("bp-")) continue;
      for (const tag of game.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14)
      .map(([tag]) => tag);
  }, []);

  const recommended = useMemo(() => {
    const preferred = new Set(favoriteGames.flatMap((game) => [game.category, ...game.tags]));
    const pool = games.filter((game) => !game.id.startsWith("bp-"));
    if (!preferred.size) return pool.slice(8, 24);
    const matches = pool.filter((game) => preferred.has(game.category) || game.tags.some((tag) => preferred.has(tag)));
    return (matches.length >= 6 ? matches : [...matches, ...pool]).slice(0, 16);
  }, [favoriteGames]);

  useEffect(() => {
    if (!launching) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [launching]);

  useEffect(() => () => {
    if (launchTimer.current) window.clearTimeout(launchTimer.current);
  }, []);

  useEffect(() => {
    setLimit(GRID_STEP);
  }, [category, genre, query, screen, sort]);

  useEffect(() => {
    const sync = () => {
      setUiSounds(isUiSoundEnabled());
      setUiVolume(readUiSoundVolume());
    };
    window.addEventListener(UI_SOUND_CHANGE_EVENT, sync);
    return () => window.removeEventListener(UI_SOUND_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!details) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetails(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [details]);

  useEffect(() => {
    if (screen !== "home" || details) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const index = featuredGames.findIndex((game) => game.id === featured.id);
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = featuredGames[(index + delta + featuredGames.length) % featuredGames.length];
      if (next) setFeatured(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [details, featured.id, featuredGames, screen]);

  useEffect(() => {
    const node = stripRef.current?.querySelector<HTMLElement>(".cine-strip-card.is-active");
    node?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [featured.id]);

  const changeFeatured = useCallback((delta: number) => {
    const index = featuredGames.findIndex((game) => game.id === featured.id);
    const next = featuredGames[(index + delta + featuredGames.length) % featuredGames.length];
    if (next) setFeatured(next);
  }, [featured.id, featuredGames]);

  const toggleFavorite = useCallback((game: Game) => {
    setFavorites((current) => {
      const next = current.includes(game.id)
        ? current.filter((id) => id !== game.id)
        : [...current, game.id];
      try {
        localStorage.setItem("si-games-favorites", JSON.stringify(next));
      } catch {
        // Favourites stay session-only when storage is blocked.
      }
      return next;
    });
  }, []);

  const play = useCallback((game: Game) => {
    if (launching || launchTimer.current !== null) return;
    const nextRecent = [game.id, ...readList("si-games-recent").filter((id) => id !== game.id)].slice(0, 12);
    const currentPlays = readPlays();
    const nextPlays = { ...currentPlays, [game.id]: (currentPlays[game.id] ?? 0) + 1 };
    try {
      localStorage.setItem("si-games-recent", JSON.stringify(nextRecent));
      localStorage.setItem(PLAYS_KEY, JSON.stringify(nextPlays));
    } catch {
      // Recent history and popularity are optional.
    }
    setPlays(nextPlays);
    captureLaunchSource(game.id, game.thumbnail, null);
    setDetails(null);
    setLaunching(game);
    launchTimer.current = window.setTimeout(() => {
      launchTimer.current = null;
      navigate(game.standalone ? `/${game.id}` : `/play/${game.id}`);
    }, 1_650);
  }, [launching, navigate]);

  /** D-pad left/right cycles the hero; A opens details and X launches. */
  useEffect(() => {
    if (screen !== "home" || details || launching) return;
    let frame = 0;
    let last = 0;
    const loop = (now: number) => {
      frame = window.requestAnimationFrame(loop);
      if (now - last < 110) return;
      last = now;
      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find((item) => item?.connected);
      if (!pad) return;
      const pressed = new Set<number>();
      pad.buttons.forEach((button, index) => {
        if (button.pressed) pressed.add(index);
      });
      const tapped = (index: number) => pressed.has(index) && !padHeld.current.has(index);
      if (tapped(14)) changeFeatured(-1);
      if (tapped(15)) changeFeatured(1);
      if (tapped(0)) setDetails(featured);
      if (tapped(2)) play(featured);
      if (tapped(12)) window.scrollBy({ top: -240, behavior: "smooth" });
      if (tapped(13)) window.scrollBy({ top: 240, behavior: "smooth" });
      padHeld.current = pressed;
    };
    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [changeFeatured, details, featured, launching, play, screen]);

  const selectScreen = (next: Screen) => {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tilt = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    stageRef.current?.style.setProperty("--cine-x", `${(x * 18).toFixed(2)}px`);
    stageRef.current?.style.setProperty("--cine-y", `${(y * 12).toFixed(2)}px`);
  };

  const resetTilt = () => {
    stageRef.current?.style.setProperty("--cine-x", "0px");
    stageRef.current?.style.setProperty("--cine-y", "0px");
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

  const updateUiSounds = (next: boolean) => {
    setUiSoundEnabled(next);
    setUiSounds(next);
  };

  const changeUiVolume = (next: number) => {
    setUiSoundVolume(next);
    setUiVolume(next);
  };

  const updateSort = (next: SortMode) => {
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, next);
    } catch {
      // Sorting preference is optional.
    }
  };

  const gridFor = (list: Game[]) => (
    <div className="cine-grid">
      {list.slice(0, limit).map((game) => (
        <GameCard
          key={game.id}
          game={game}
          active={game.id === featured.id}
          onSelect={() => setFeatured(game)}
          onDetails={() => { setFeatured(game); setDetails(game); }}
          onPlay={() => play(game)}
          favorite={favorites.includes(game.id)}
          onFavorite={() => toggleFavorite(game)}
        />
      ))}
    </div>
  );

  const railFor = (title: string, list: Game[], kicker: string) => (
    <section className="cine-section">
      <header className="cine-section-head">
        <div>
          <span className="cine-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
        <span className="cine-section-count">{list.length} titles</span>
      </header>
      <div className="cine-rail">
        {list.slice(0, 12).map((game) => (
          <GameCard
            key={game.id}
            game={game}
            active={game.id === featured.id}
            onSelect={() => setFeatured(game)}
            onDetails={() => { setFeatured(game); setDetails(game); }}
            onPlay={() => play(game)}
            favorite={favorites.includes(game.id)}
            onFavorite={() => toggleFavorite(game)}
          />
        ))}
      </div>
    </section>
  );

  return (
    <div className="cine-home">
      <nav className="cine-nav" aria-label="SI GAMES navigation">
        <Link className="cine-nav-brand" to="/" aria-label="SI GAMES home">
          <span>SI</span>
        </Link>
        <div className="cine-nav-links">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cine-nav-link${screen === item.id ? " is-active" : ""}`}
              data-ui-sound="nav"
              onClick={() => selectScreen(item.id)}
              aria-current={screen === item.id ? "page" : undefined}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
        <Link className="cine-nav-play" to="/bigpicture" aria-label="Open Big Picture">
          <Sparkles size={16} />
        </Link>
      </nav>

      <main className="cine-main">
        {screen === "home" && (
          <>
            <section
              ref={stageRef}
              className="cine-stage"
              onPointerMove={tilt}
              onPointerLeave={resetTilt}
              style={{ "--cine-art": `url("${featured.thumbnail}")` } as CSSProperties}
            >
              <div className="cine-stage-art" key={featured.id}>
                <img src={featured.thumbnail} alt={`${featured.title} artwork`} />
              </div>
              <span className="cine-stage-grid" aria-hidden="true" />
              <span className="cine-stage-glow" aria-hidden="true" />
              <div className="cine-stage-copy">
                <span className="cine-stage-kicker"><Sparkles size={13} /> FEATURED TITLE</span>
                <h1 key={`${featured.id}-title`}>{featured.title}</h1>
                <div className="cine-stage-meta">
                  <span>{featured.category}</span>
                  {featured.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}
                  <span><Clock3 size={12} /> {formatPlaytime(playtime[featured.id])}</span>
                </div>
                <p key={`${featured.id}-desc`}>{featured.description}</p>
                <div className="cine-stage-actions">
                  <button type="button" className="cine-play" data-ui-sound="launch" onClick={() => play(featured)}>
                    <Play size={19} fill="currentColor" /> PLAY NOW
                  </button>
                  <button type="button" className="cine-secondary" onClick={() => setDetails(featured)}>
                    <Info size={17} /> DETAILS
                  </button>
                  <button
                    type="button"
                    className={`cine-secondary cine-fav${favorites.includes(featured.id) ? " is-on" : ""}`}
                    onClick={() => toggleFavorite(featured)}
                    aria-pressed={favorites.includes(featured.id)}
                  >
                    <Heart size={17} fill={favorites.includes(featured.id) ? "currentColor" : "none"} />
                    {favorites.includes(featured.id) ? "SAVED" : "FAVOURITE"}
                  </button>
                </div>
              </div>

              <div className="cine-strip-wrap">
                <div className="cine-strip" ref={stripRef}>
                  {featuredGames.map((game) => (
                    <button
                      key={game.id}
                      type="button"
                      className={`cine-strip-card${game.id === featured.id ? " is-active" : ""}`}
                      onClick={() => setFeatured(game)}
                      aria-label={`Feature ${game.title}`}
                    >
                      <img src={game.thumbnail} alt="" loading="lazy" />
                      <span>{game.title}</span>
                    </button>
                  ))}
                </div>
                <div className="cine-strip-nav">
                  <button type="button" onClick={() => changeFeatured(-1)} aria-label="Previous featured game"><ChevronLeft size={18} /></button>
                  <button type="button" onClick={() => changeFeatured(1)} aria-label="Next featured game"><ChevronRight size={18} /></button>
                </div>
              </div>
            </section>

            {recentGames.length > 0 && railFor("Continue playing", recentGames, "PICK UP WHERE YOU LEFT OFF")}
            {railFor("Popular now", trending, "WHAT PLAYERS ARE LAUNCHING")}
            {railFor("New releases", fresh, "FRESH ON THE SHELF")}
            {railFor("Recommended for you", recommended, favoriteGames.length ? "BASED ON YOUR FAVOURITES" : "HAND-PICKED FOR THIS SHELF")}

            <section className="cine-section cine-discover-band">
              <div>
                <span className="cine-kicker">THE FULL CATALOGUE</span>
                <h2>One library. Every world.</h2>
                <p>{games.length} playable titles — browser builds, console classics and arcade experiments, all in one place.</p>
              </div>
              <button type="button" className="cine-play" onClick={() => selectScreen("discover")}>
                DISCOVER <ArrowRight size={18} />
              </button>
            </section>
          </>
        )}

        {screen !== "home" && screen !== "settings" && (
          <section className="cine-browse" key={screen}>
            <header className="cine-browse-head">
              <span className="cine-kicker">
                {screen === "discover" ? "DISCOVER" : screen === "library" ? "MY GAMES" : screen === "recent" ? "RECENTLY PLAYED" : "FAVOURITES"}
              </span>
              <h1>
                {screen === "discover" ? "Find your next world." :
                 screen === "library" ? "Your complete library." :
                 screen === "recent" ? "Back into the action." :
                 "The ones you kept."}
              </h1>
            </header>

            {(screen === "discover" || screen === "library") && (
              <>
                <div className="cine-search">
                  <Search size={18} />
                  <input
                    type="search"
                    value={query}
                    placeholder="Search titles, genres, tags…"
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search the library"
                  />
                  {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}
                </div>
                <div className="cine-listbar">
                  <span>{filtered.length} titles</span>
                  <label className="cine-sort">
                    <ArrowUpDown size={14} />
                    <span>Sort</span>
                    <select value={sort} onChange={(event) => updateSort(event.target.value as SortMode)} aria-label="Sort games">
                      <option value="popular">Popular</option>
                      <option value="az">A–Z</option>
                    </select>
                  </label>
                </div>
                <div className="cine-chips" role="group" aria-label="Filter by category">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`cine-chip${category === item ? " is-active" : ""}`}
                      onClick={() => setCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="cine-chips cine-chips--genres" role="group" aria-label="Filter by genre">
                  {["All genres", ...genres].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`cine-chip cine-chip--genre${genre === item ? " is-active" : ""}`}
                      onClick={() => setGenre(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                {gridFor(filtered)}
                {filtered.length > limit && (
                  <button type="button" className="cine-more" onClick={() => setLimit((count) => count + GRID_STEP)}>
                    LOAD MORE <ArrowRight size={16} />
                  </button>
                )}
                {!filtered.length && <p className="cine-empty">Nothing matches that search yet.</p>}
              </>
            )}

            {screen === "recent" && (recentGames.length
              ? gridFor(recentGames)
              : <p className="cine-empty">No recent games on this device yet. Launch something and it will appear here.</p>)}

            {screen === "favorites" && (favoriteGames.length
              ? gridFor(favoriteGames)
              : <p className="cine-empty">No favourites yet. Use the heart on any game to keep it here.</p>)}
          </section>
        )}

        {screen === "settings" && (
          <section className="cine-browse cine-settings-screen" key="settings">
            <header className="cine-browse-head">
              <span className="cine-kicker">SYSTEM</span>
              <h1>Make the platform yours.</h1>
            </header>

            <div className="cine-settings-grid">
              <section className="cine-panel">
                <span className="cine-panel-label">COLOUR SELECTION</span>
                <div className="cine-theme-grid">
                  {THEMES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`cine-theme${theme === item.id ? " is-active" : ""}`}
                      onClick={() => { applyTheme(item.id); setTheme(item.id); }}
                      aria-pressed={theme === item.id}
                    >
                      <i style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.glow})` }} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="cine-panel">
                <span className="cine-panel-label">SOUND & MOTION</span>
                <button type="button" className="cine-setting" onClick={() => updateSong(!song)}>
                  {song ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  <span><strong>Theme song</strong><small>{song ? "Playing softly under the launcher" : "Muted on this device"}</small></span>
                  <i className={`cine-toggle${song ? " is-on" : ""}`} />
                </button>
                <button type="button" className="cine-setting" onClick={() => updateUiSounds(!uiSounds)}>
                  <AudioLines size={18} />
                  <span><strong>Interface sounds</strong><small>{uiSounds ? "Soft hover, click and launch cues" : "Muted on this device"}</small></span>
                  <i className={`cine-toggle${uiSounds ? " is-on" : ""}`} />
                </button>
                {uiSounds && (
                  <label className="cine-volume">
                    <span>Interface volume</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={uiVolume}
                      onChange={(event) => changeUiVolume(Number(event.target.value))}
                      aria-label="Interface sound volume"
                    />
                    <b>{Math.round(uiVolume * 100)}%</b>
                  </label>
                )}
                <button type="button" className="cine-setting" onClick={() => updateMotion(motion === "full" ? "reduced" : "full")}>
                  <Sparkles size={18} />
                  <span><strong>Cinematic motion</strong><small>{motion === "full" ? "Full depth, reflections and transitions" : "Reduced ambient motion"}</small></span>
                  <i className={`cine-toggle${motion === "full" ? " is-on" : ""}`} />
                </button>
              </section>

              <section className="cine-panel">
                <span className="cine-panel-label">PLATFORM</span>
                <Link className="cine-setting" to="/setup"><SettingsIcon size={18} /><span><strong>New-user setup</strong><small>Colour, sound and motion in one pass</small></span><ArrowRight size={16} /></Link>
                <Link className="cine-setting" to="/settings"><SettingsIcon size={18} /><span><strong>All settings</strong><small>Storage, benchmark and system tools</small></span><ArrowRight size={16} /></Link>
                <Link className="cine-setting" to="/bigpicture"><Star size={18} /><span><strong>Big Picture</strong><small>Controller-first PlayStation-style launcher</small></span><ArrowRight size={16} /></Link>
              </section>
            </div>
          </section>
        )}
      </main>

      <footer className="cine-footer">
        <span>SI GAMES · SPIDEY_IRAJ</span>
        <span>{games.length} TITLES · PLAY. DISCOVER. ENJOY.</span>
      </footer>

      {details && (
        <div className="cine-detail" role="dialog" aria-modal="true" aria-labelledby="cine-detail-title" style={{ "--cine-detail-art": `url("${details.thumbnail}")` } as CSSProperties}>
          <button type="button" className="cine-detail-back" data-ui-sound="back" onClick={() => setDetails(null)}><ArrowLeft size={17} /> BACK</button>
          <div className="cine-detail-art"><img src={details.thumbnail} alt={`${details.title} key art`} /></div>
          <div className="cine-detail-copy">
            <span className="cine-kicker">GAME DETAILS</span>
            <h2 id="cine-detail-title">{details.title}</h2>
            <div className="cine-detail-meta">
              <span>{details.category}</span>
              {details.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <p>{details.description}</p>
            <div className="cine-stage-actions">
                                <button type="button" className="cine-play" data-ui-sound="launch" onClick={() => play(details)}><Play size={18} fill="currentColor" /> PLAY NOW</button>
              <button type="button" className={`cine-secondary${favorites.includes(details.id) ? " is-on" : ""}`} onClick={() => toggleFavorite(details)}>
                <Heart size={17} fill={favorites.includes(details.id) ? "currentColor" : "none"} /> {favorites.includes(details.id) ? "FAVOURITED" : "ADD TO FAVOURITES"}
              </button>
            </div>
            <div className="cine-detail-extra">
              <div><span>HOW TO PLAY</span><p>{details.controls}</p></div>
              <ShareButton title={details.title} text={`Play ${details.title} on SI GAMES`} url={details.standalone ? `/${details.id}` : `/play/${details.id}`} label="Share game" />
            </div>
          </div>
          <button type="button" className="cine-detail-close" data-ui-sound="back" onClick={() => setDetails(null)} aria-label="Close details"><X size={20} /></button>
        </div>
      )}

      {launching && (
        <div className="cine-launch" role="status" aria-live="polite">
          <img src={launching.thumbnail} alt="" aria-hidden="true" />
          <span className="cine-launch-wash" aria-hidden="true" />
          <div className="cine-launch-copy">
            <span className="cine-launch-mark">SI</span>
            <span className="cine-kicker">ENTERING THE GAME</span>
            <h2>{launching.title}</h2>
            <span className="cine-launch-track"><i /></span>
            <small>LOADING THE NEXT WORLD</small>
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  ChevronLeft,
  Clock3,
  Gamepad2,
  Gauge,
  Heart,
  Home,
  Library,
  Palette,
  Play,
  Power,
  Settings,
  ShoppingBag,
  Sun,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { games, newGames, type Game } from "@/data/games";
import { captureLaunchSource } from "@/lib/launch";
import { formatPlaytime, readPlaytime } from "@/lib/playtime";
import { isThemeSongEnabled, setThemeSongEnabled } from "@/lib/theme-song";
import { stopLocalMusic } from "@/lib/local-music";
import "@/bigpicture.css";

type Tab = "home" | "library" | "store" | "friends" | "settings";
type Direction = "up" | "down" | "left" | "right";

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "library", label: "Library", icon: Library },
  { id: "store", label: "Store", icon: ShoppingBag },
  { id: "friends", label: "Friends", icon: Users },
  { id: "settings", label: "Settings", icon: Settings },
];

const LIBRARY_STEP = 60;

function readStoredList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Honest controller metadata: a title is only marked pad-ready when its own
 *  control notes mention a gamepad. */
function controllerReady(game: Game): boolean {
  return /gamepad|controller/i.test(game.controls);
}

type BatteryState = { level: number; charging: boolean } | null;

export default function BigPicture() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [clock, setClock] = useState(() => new Date());
  const [quickOpen, setQuickOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [libraryLimit, setLibraryLimit] = useState(LIBRARY_STEP);
  const [brightness, setBrightness] = useState(100);
  const [lite, setLite] = useState(false);
  const [musicOn, setMusicOn] = useState(isThemeSongEnabled);
  const [padConnected, setPadConnected] = useState(false);
  const [battery, setBattery] = useState<BatteryState>(null);
  const favorites = useMemo(() => readStoredList("si-games-favorites"), []);
  const recent = useMemo(() => readStoredList("si-games-recent"), []);
  const playtime = useMemo(() => readPlaytime(), []);

  const recentGames = useMemo(
    () => recent.map((id) => games.find((game) => game.id === id)).filter((game): game is Game => Boolean(game)),
    [recent],
  );
  const favoriteGames = useMemo(
    () => favorites.map((id) => games.find((game) => game.id === id)).filter((game): game is Game => Boolean(game)),
    [favorites],
  );
  const installedGames = useMemo(() => games.filter((game) => game.htmlGame).slice(0, 60), []);
  /** The shelf patch clones entries, so match by id instead of by reference. */
  const newGamesShelf = useMemo(() => {
    const playable = new Set(games.map((game) => game.id));
    return newGames.filter((game) => playable.has(game.id)).slice(0, 40);
  }, []);

  const [hero, setHero] = useState<Game>(() => recentGames[0] ?? games[0]);

  /** The launcher owns the whole screen: no scrollbars behind it, no floating
   *  site controls on top of it. */
  useEffect(() => {
    document.body.classList.add("bp-active");
    return () => {
      document.body.classList.remove("bp-active");
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  /** Battery is only shown when the browser actually reports one. */
  useEffect(() => {
    type BatteryManager = { level: number; charging: boolean; addEventListener: (type: string, fn: () => void) => void };
    const getBattery = (navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }).getBattery;
    if (!getBattery) return;
    let live = true;
    void getBattery.call(navigator).then((manager) => {
      const sync = () => {
        if (live) setBattery({ level: manager.level, charging: manager.charging });
      };
      sync();
      manager.addEventListener("levelchange", sync);
      manager.addEventListener("chargingchange", sync);
    }).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  /** First meaningful focus: the hero action, so a pad press plays immediately. */
  useEffect(() => {
    const first = rootRef.current?.querySelector<HTMLElement>("[data-bp-first]");
    first?.focus({ preventScroll: true });
  }, [tab]);

  const play = useCallback(
    (game: Game) => {
      const next = [game.id, ...readStoredList("si-games-recent").filter((id) => id !== game.id)].slice(0, 12);
      try {
        localStorage.setItem("si-games-recent", JSON.stringify(next));
      } catch {
        // Storage failures only cost the history list.
      }
      captureLaunchSource(game.id, game.thumbnail, null);
      navigate(game.standalone ? `/${game.id}` : `/play/${game.id}`);
    },
    [navigate],
  );

  const moveFocus = useCallback((direction: Direction) => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-bp-focus]")).filter(
      (element) => element.offsetParent !== null,
    );
    if (!items.length) return;

    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!current || !items.includes(current)) {
      items[0].focus();
      return;
    }

    const from = current.getBoundingClientRect();
    const cx = from.left + from.width / 2;
    const cy = from.top + from.height / 2;

    const scored = items
      .filter((element) => element !== current)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const ex = rect.left + rect.width / 2;
        const ey = rect.top + rect.height / 2;
        const dx = ex - cx;
        const dy = ey - cy;
        const forward =
          direction === "left" ? -dx : direction === "right" ? dx : direction === "up" ? -dy : dy;
        if (forward < 6) return null;
        const cross = direction === "left" || direction === "right" ? Math.abs(dy) : Math.abs(dx);
        if (cross > (direction === "left" || direction === "right" ? rect.height * 1.6 : rect.width * 1.6)) return null;
        return { element, score: forward + cross * 2.4 };
      })
      .filter((entry): entry is { element: HTMLElement; score: number } => Boolean(entry))
      .sort((a, b) => a.score - b.score);

    const target = scored[0]?.element ?? items[0];
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    if (quickOpen) {
      setQuickOpen(false);
      return;
    }
    if (tab !== "home") {
      setTab("home");
      return;
    }
    navigate("/");
  }, [navigate, quickOpen, tab]);

  const toggleMusic = useCallback(() => {
    const next = !isThemeSongEnabled();
    setThemeSongEnabled(next);
    setMusicOn(next);
    if (!next) stopLocalMusic(300);
  }, []);

  /** Gamepad + keyboard share one action map, so both behave the same. */
  const actionsRef = useRef({
    select: () => {
      const element = document.activeElement;
      if (element instanceof HTMLElement && element.matches("button, a, input[type=\"range\"]")) {
        element.click();
      }
    },
    back: goBack,
    options: () => setQuickOpen((open) => !open),
    details: () => setDetailsOpen((open) => !open),
    move: moveFocus,
  });

  actionsRef.current = {
    select: actionsRef.current.select,
    back: goBack,
    options: () => setQuickOpen((open) => !open),
    details: () => setDetailsOpen((open) => !open),
    move: moveFocus,
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement) {
        // A focused slider keeps its own arrow-key behaviour.
        if (target.type === "range") return;
        return;
      }
      if (target?.isContentEditable) return;
      const actions = actionsRef.current;
      if (event.key === "ArrowUp") { event.preventDefault(); actions.move("up"); }
      else if (event.key === "ArrowDown") { event.preventDefault(); actions.move("down"); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); actions.move("left"); }
      else if (event.key === "ArrowRight") { event.preventDefault(); actions.move("right"); }
      else if (event.key === "Escape") { event.preventDefault(); actions.back(); }
      else if (event.key.toLowerCase() === "q") actions.options();
      else if (event.key.toLowerCase() === "y") actions.details();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let frame = 0;
    let heldUntil = 0;
    let sawPad = false;
    const pressed = new Set<number>();
    const DEADZONE = 0.45;
    const REPEAT_MS = 190;

    const loop = () => {
      frame = window.requestAnimationFrame(loop);
      const pads = navigator.getGamepads?.() ?? [];
      const pad = Array.from(pads).find((item): item is Gamepad => Boolean(item?.connected));
      if (Boolean(pad) !== sawPad) {
        sawPad = Boolean(pad);
        setPadConnected(sawPad);
      }
      if (!pad) return;

      const now = performance.now();
      const axisX = pad.axes[0] ?? 0;
      const axisY = pad.axes[1] ?? 0;
      const up = pad.buttons[12]?.pressed || axisY < -DEADZONE;
      const down = pad.buttons[13]?.pressed || axisY > DEADZONE;
      const left = pad.buttons[14]?.pressed || axisX < -DEADZONE;
      const right = pad.buttons[15]?.pressed || axisX > DEADZONE;

      if (now > heldUntil) {
        const actions = actionsRef.current;
        if (left) { actions.move("left"); heldUntil = now + REPEAT_MS; }
        else if (right) { actions.move("right"); heldUntil = now + REPEAT_MS; }
        else if (up) { actions.move("up"); heldUntil = now + REPEAT_MS; }
        else if (down) { actions.move("down"); heldUntil = now + REPEAT_MS; }
      }

      pad.buttons.forEach((button, index) => {
        const wasDown = pressed.has(index);
        if (button.pressed && !wasDown) {
          pressed.add(index);
          const actions = actionsRef.current;
          if (index === 0) actions.select();
          else if (index === 1) actions.back();
          else if (index === 2 || index === 9) actions.options();
          else if (index === 3) actions.details();
        } else if (!button.pressed && wasDown) {
          pressed.delete(index);
        }
      });
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const currentTab = TABS.find((item) => item.id === tab) ?? TABS[0];
  const played = Boolean(playtime[hero.id]);
  const timeLabel = formatPlaytime(playtime[hero.id]);

  const shelfGames = (items: Game[], variant: "hero" | "tile" = "tile") => (
    <div className={`bp-row bp-row--${variant}`} role="list">
      {items.map((game) => (
        <button
          key={game.id}
          type="button"
          role="listitem"
          className={`bp-tile${hero.id === game.id ? " is-current" : ""}`}
          data-bp-focus
          data-game-id={game.id}
          onFocus={() => setHero(game)}
          onClick={() => play(game)}
        >
          <span className="bp-tile-art">
            <img src={game.thumbnail} alt="" loading="lazy" />
            <span className="bp-tile-play"><Play size={16} fill="currentColor" /></span>
          </span>
          <span className="bp-tile-copy">
            <b>{game.title}</b>
            <small>{game.category} · {formatPlaytime(playtime[game.id])}</small>
          </span>
        </button>
      ))}
    </div>
  );

  return (
    <div className={`bp-root${lite ? " is-lite" : ""}`} ref={rootRef} style={{ "--bp-brightness": brightness / 100 } as CSSProperties}>
      <header className="bp-topbar">
        <div className="bp-brand">
          <span className="bp-brand-mark">SI</span>
          <span>BIG PICTURE</span>
        </div>

        <nav className="bp-tabs" aria-label="Big Picture sections">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`bp-tab${tab === item.id ? " is-active" : ""}`}
              data-bp-focus
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="bp-status" aria-label="System status">
          <span className="bp-status-item" title="Connection"><Wifi size={15} /> ONLINE</span>
          <span className={`bp-status-item${padConnected ? " is-on" : ""}`} title="Controller">
            <Gamepad2 size={15} /> {padConnected ? "PAD" : "KEYBOARD"}
          </span>
          {battery && (
            <span className="bp-status-item" title="Battery">
              {battery.level > 0.5 ? <BatteryFull size={15} /> : battery.level > 0.2 ? <BatteryMedium size={15} /> : <BatteryLow size={15} />}
              {Math.round(battery.level * 100)}%
            </span>
          )}
          <span className="bp-clock">{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </header>

      <div className="bp-scroll">
        <main className="bp-main" aria-label={`${currentTab.label} view`}>
          {tab === "home" && (
            <>
              <section className="bp-hero" aria-label="Currently selected game">
                <img className="bp-hero-art" src={hero.thumbnail} alt="" />
                <div className="bp-hero-wash" aria-hidden="true" />
                <div className="bp-hero-copy">
                  <span className="bp-hero-kicker"><Gamepad2 size={13} /> NOW IN FOCUS</span>
                  <h1>{hero.title}</h1>
                  <p className="bp-hero-desc">{hero.description}</p>
                  <div className="bp-badges">
                    <span className="bp-badge">{hero.category}</span>
                    <span className="bp-badge">{controllerReady(hero) ? "Controller ready" : "Keyboard ready"}</span>
                    <span className="bp-badge"><Clock3 size={12} /> {timeLabel}</span>
                    <span className="bp-badge">Saves on this device</span>
                    {favorites.includes(hero.id) && <span className="bp-badge bp-badge--fav"><Heart size={12} fill="currentColor" /> Favorite</span>}
                  </div>
                  <div className="bp-hero-actions">
                    <button type="button" className="bp-play" data-bp-focus data-bp-first onClick={() => play(hero)}>
                      <Play size={18} fill="currentColor" /> {played ? "RESUME" : "PLAY"}
                    </button>
                    <button type="button" className="bp-ghost" data-bp-focus onClick={() => setDetailsOpen((open) => !open)} aria-expanded={detailsOpen}>
                      Details
                    </button>
                    <button type="button" className="bp-ghost" data-bp-focus onClick={() => setTab("library")}>
                      Library
                    </button>
                  </div>
                  {detailsOpen && (
                    <div className="bp-hero-details">
                      <p>{hero.controls}</p>
                      <div className="bp-tags">{hero.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bp-shelf">
                <header><h2>Recently played</h2><span>{recentGames.length ? `${recentGames.length} titles` : "Nothing yet"}</span></header>
                {recentGames.length ? shelfGames(recentGames) : (
                  <p className="bp-empty">Your recent shelf fills up as you play. Pick anything below to start.</p>
                )}
              </section>

              <section className="bp-shelf">
                <header><h2>Favorites</h2><span>{favoriteGames.length ? `${favoriteGames.length} saved` : "None yet"}</span></header>
                {favoriteGames.length ? shelfGames(favoriteGames) : (
                  <p className="bp-empty">No favorites yet — heart a game on the home shelf and it lands here.</p>
                )}
              </section>

              <section className="bp-shelf">
                <header><h2>Installed games</h2><span>Built into SI GAMES</span></header>
                {shelfGames(installedGames)}
              </section>

              <section className="bp-shelf">
                <header><h2>New on the shelf</h2><span>Latest additions</span></header>
                {shelfGames(newGamesShelf)}
              </section>
            </>
          )}

          {tab === "library" && (
            <section className="bp-page">
              <div className="bp-page-head">
                <div>
                  <span className="bp-eyebrow"><Library size={13} /> FULL LIBRARY</span>
                  <h1>Every title, one wall.</h1>
                </div>
                <span className="bp-count">{games.length} games</span>
              </div>
              <div className="bp-grid">
                {games.slice(0, libraryLimit).map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    className={`bp-tile bp-tile--grid${hero.id === game.id ? " is-current" : ""}`}
                    data-bp-focus
                    onFocus={() => setHero(game)}
                    onClick={() => play(game)}
                  >
                    <span className="bp-tile-art">
                      <img src={game.thumbnail} alt="" loading="lazy" />
                      <span className="bp-tile-play"><Play size={16} fill="currentColor" /></span>
                    </span>
                    <span className="bp-tile-copy">
                      <b>{game.title}</b>
                      <small>{game.category} · {formatPlaytime(playtime[game.id])}</small>
                    </span>
                  </button>
                ))}
              </div>
              {libraryLimit < games.length && (
                <button type="button" className="bp-more" data-bp-focus onClick={() => setLibraryLimit((count) => count + LIBRARY_STEP)}>
                  Load {Math.min(LIBRARY_STEP, games.length - libraryLimit)} more
                </button>
              )}
            </section>
          )}

          {tab === "store" && (
            <section className="bp-page">
              <div className="bp-page-head">
                <div>
                  <span className="bp-eyebrow"><ShoppingBag size={13} /> COMMUNITY STORE</span>
                  <h1>Hand-picked, never charged for.</h1>
                  <p className="bp-page-note">SI GAMES has no checkout: every title here is free to play in the browser, and new picks land on this shelf when they are added.</p>
                </div>
              </div>
              <div className="bp-grid">
                {newGamesShelf.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    className="bp-tile bp-tile--grid"
                    data-bp-focus
                    onFocus={() => setHero(game)}
                    onClick={() => play(game)}
                  >
                    <span className="bp-tile-art">
                      <img src={game.thumbnail} alt="" loading="lazy" />
                      <span className="bp-tile-play"><Play size={16} fill="currentColor" /></span>
                    </span>
                    <span className="bp-tile-copy">
                      <b>{game.title}</b>
                      <small>{game.category}</small>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {tab === "friends" && (
            <section className="bp-page bp-page--center">
              <span className="bp-big-icon"><Users size={30} /></span>
              <h1>This couch is yours.</h1>
              <p className="bp-page-note">
                SI GAMES keeps no friend list and no accounts for the launcher — there is nothing to sign into here.
                Your favorites, history and playtime stay on this device. Grab a controller and pass it around.
              </p>
            </section>
          )}

          {tab === "settings" && (
            <section className="bp-page">
              <div className="bp-page-head">
                <div>
                  <span className="bp-eyebrow"><Settings size={13} /> SETTINGS</span>
                  <h1>Make it yours.</h1>
                </div>
              </div>

              <div className="bp-settings">
                <div className="bp-setting-row">
                  <span className="bp-setting-label"><Volume2 size={16} /> Soundtrack</span>
                  <button type="button" className={`bp-toggle${musicOn ? " is-on" : ""}`} data-bp-focus onClick={toggleMusic} aria-pressed={musicOn}>
                    {musicOn ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="bp-setting-row">
                  <span className="bp-setting-label"><Gauge size={16} /> Performance mode</span>
                  <button type="button" className={`bp-toggle${lite ? " is-on" : ""}`} data-bp-focus onClick={() => setLite((value) => !value)} aria-pressed={lite}>
                    {lite ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="bp-setting-row">
                  <span className="bp-setting-label"><Gamepad2 size={16} /> Controller</span>
                  <span className="bp-setting-value">{padConnected ? "Connected" : "Waiting for a pad"}</span>
                </div>

                <div className="bp-setting-row bp-setting-row--stack">
                  <span className="bp-setting-label"><Sun size={16} /> Brightness</span>
                  <input
                    type="range"
                    min={70}
                    max={120}
                    value={brightness}
                    data-bp-focus
                    onChange={(event) => setBrightness(Number(event.target.value))}
                    aria-label="Launcher brightness"
                  />
                  <span className="bp-setting-value">{brightness}%</span>
                </div>

                <div className="bp-setting-row">
                  <span className="bp-setting-label"><Palette size={16} /> Console theme</span>
                  <span className="bp-setting-value is-on">PLAYSTATION · PS5</span>
                </div>
              </div>

              <div className="bp-exit-row">
                <button type="button" className="bp-ghost" data-bp-focus onClick={() => navigate("/")}>
                  <Power size={15} /> Exit Big Picture
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      {quickOpen && (
        <aside className="bp-drawer" aria-label="Quick access">
          <header>
            <span><Settings size={15} /> QUICK ACCESS</span>
            <button type="button" className="bp-drawer-close" data-bp-focus onClick={() => setQuickOpen(false)} aria-label="Close quick access">
              <X size={16} />
            </button>
          </header>

          <div className="bp-drawer-row">
            <span><Volume2 size={15} /> Sound</span>
            <button type="button" className={`bp-toggle${musicOn ? " is-on" : ""}`} data-bp-focus onClick={toggleMusic} aria-pressed={musicOn}>
              {musicOn ? <><Volume2 size={13} /> ON</> : <><VolumeX size={13} /> OFF</>}
            </button>
          </div>

          <div className="bp-drawer-row bp-drawer-row--stack">
            <span><Sun size={15} /> Brightness</span>
            <input
              type="range"
              min={70}
              max={120}
              value={brightness}
              data-bp-focus
              onChange={(event) => setBrightness(Number(event.target.value))}
              aria-label="Launcher brightness"
            />
          </div>

          <div className="bp-drawer-row">
            <span><Gauge size={15} /> Performance</span>
            <button type="button" className={`bp-toggle${lite ? " is-on" : ""}`} data-bp-focus onClick={() => setLite((value) => !value)} aria-pressed={lite}>
              {lite ? "LITE" : "FULL"}
            </button>
          </div>

          <div className="bp-drawer-row">
            <span><Gamepad2 size={15} /> Controller</span>
            <span className={`bp-setting-value${padConnected ? " is-on" : ""}`}>{padConnected ? "Connected" : "None"}</span>
          </div>

          <div className="bp-drawer-foot">
            <button type="button" className="bp-ghost" data-bp-focus onClick={() => navigate("/")}>
              <ChevronLeft size={15} /> Exit to shelf
            </button>
            <button type="button" className="bp-ghost" data-bp-focus onClick={() => setQuickOpen(false)}>
              Close
            </button>
          </div>
        </aside>
      )}

      <footer className="bp-footer">
        <div className="bp-glyphs">
          <span><i className="bp-glyph bp-glyph--a">A</i> Select</span>
          <span><i className="bp-glyph bp-glyph--b">B</i> Back</span>
          <span><i className="bp-glyph bp-glyph--x">X</i> Options</span>
          <span><i className="bp-glyph bp-glyph--y">Y</i> Details</span>
        </div>
        <div className="bp-footer-note">Arrow keys or D-pad to move · Enter or A to open</div>
      </footer>
    </div>
  );
}

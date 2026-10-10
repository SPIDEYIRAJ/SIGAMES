import { createElement, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Expand, Heart, Loader2, Maximize2, Minimize2, MonitorUp, Play, RotateCcw, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { games } from "@/data/games";
import "@/player-prompt.css";

/** Standalone pages (for example /gta-vicecity) have no :id segment. */
const STANDALONE_DEFAULT = "gta-vicecity";

interface GameFrameProps extends Omit<React.HTMLAttributes<HTMLIFrameElement>, "target"> {
  src: string;
  title: string;
  allow?: string;
  allowFullScreen?: boolean;
  loading: boolean;
  onLoad: () => void;
  onError: () => void;
}

function GameFrame({ src, title, allow, allowFullScreen, loading, onLoad, onError }: GameFrameProps) {
  return createElement(
    "iframe",
    {
      src,
      title,
      allow,
      allowFullScreen,
      target: "_self",
      loading: loading ? "lazy" : undefined,
      referrerPolicy: "no-referrer",
      sandbox: undefined,
      onLoad,
      onError,
    } as unknown as GameFrameProps
  );
}

function readFavorites(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem("si-games-favorites") ?? "[]");
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function GamePlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const game = useMemo(() => games.find((item) => item.id === (id ?? STANDALONE_DEFAULT)), [id]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExtension, setShowExtension] = useState(Boolean(game?.extensionNotice));
  const [isImmersive, setIsImmersive] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [showFsPrompt, setShowFsPrompt] = useState(false);
  const extensionModalRef = useRef<HTMLDivElement>(null);
  const [launched, setLaunched] = useState(() => {
    const target = games.find((item) => item.id === (id ?? STANDALONE_DEFAULT));
    if (!target) return false;
    if (target.id === "gta-v") return true;
    return !target.standalone && target.type !== "external";
  });

  // GTA V: the embed/frame path is disabled entirely. Only the external-link button is offered.
  const isGtaV = game?.id === "gta-v";

  const [frameKey, setFrameKey] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLElement>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setFrameKey((key) => key + 1);
  }, []);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
      if (!document.fullscreenElement) setIsImmersive(false);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!game) return;
    let previous: string[] = [];
    try {
      const stored = JSON.parse(localStorage.getItem("si-games-recent") ?? "[]");
      if (Array.isArray(stored)) previous = stored.filter((item: unknown): item is string => typeof item === "string");
    } catch {
      previous = [];
    }
    const next = [game.id, ...previous.filter((item) => item !== game.id)].slice(0, 6);
    localStorage.setItem("si-games-recent", JSON.stringify(next));
    setLoading(true);
    // Pressing PLAY always offers fullscreen first — it is the option, never a forced jump.
    setShowFsPrompt(!game.standalone);
    setShowExtension(Boolean(game.extensionNotice));
    setLaunched(!game.standalone && game.type !== "external");
  }, [game]);

  /** Standalone pages describe the title first, then either load the frame or hand over. */
  const launch = useCallback(() => {
    if (game?.type === "external") {
      // Not embeddable: hand the player over to the game itself, in this same tab.
      window.location.href = game.sourceUrl;
      return;
    }
    setLaunched(true);
    setLoading(true);
    setShowFsPrompt(true);
  }, [game]);

  // Auto-retire the fullscreen nudge so it never blocks the game for long.
  useEffect(() => {
    if (!showFsPrompt) return;
    const timer = window.setTimeout(() => setShowFsPrompt(false), 15000);
    return () => window.clearTimeout(timer);
  }, [showFsPrompt]);

  /** The extension notice asks, it never blocks: Escape skips it and focus lands inside. */
  useEffect(() => {
    if (!showExtension) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const modal = extensionModalRef.current;
    const focusTarget = modal?.querySelector<HTMLElement>(".extension-actions .primary-button");
    focusTarget?.focus({ preventScroll: true });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowExtension(false);
      }
    };
    // Hold the page still behind the notice so the skip target cannot scroll away.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [showExtension]);

  /** Keeps the destination out of reach: no view-source, devtools, right-click or link copying. */
  useEffect(() => {
    if (!game?.lockLinks) return;

    const blockKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const combo = event.ctrlKey || event.metaKey;
      // F12, plus the Ctrl/Cmd + Shift + I/J/C and Ctrl/Cmd + U/J/P inspection combos.
      if (event.key === "F12" || (combo && event.shiftKey && ["i", "j", "c", "p", "k"].includes(key))) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (combo && ["u", "i", "j", "p"].includes(key)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Ctrl+C only matters when there is nothing real selected to copy.
      if (combo && key === "c" && window.getSelection()?.isCollapsed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const blockMenu = (event: Event) => event.preventDefault();
    const blockDrag = (event: Event) => event.preventDefault();
    const blockClipboard = (event: ClipboardEvent) => {
      // Keep real gameplay shortcuts alive, just never hand out the frame contents.
      if (event.clipboardData) event.clipboardData.setData("text/plain", "");
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", blockKeys, true);
    window.addEventListener("contextmenu", blockMenu, true);
    window.addEventListener("dragstart", blockDrag, true);
    window.addEventListener("selectstart", blockMenu, true);
    window.addEventListener("copy", blockClipboard, true);
    window.addEventListener("cut", blockClipboard, true);
    return () => {
      window.removeEventListener("keydown", blockKeys, true);
      window.removeEventListener("contextmenu", blockMenu, true);
      window.removeEventListener("dragstart", blockDrag, true);
      window.removeEventListener("selectstart", blockMenu, true);
      window.removeEventListener("copy", blockClipboard, true);
      window.removeEventListener("cut", blockClipboard, true);
    };
  }, [game]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      setIsImmersive(false);
      await document.exitFullscreen().catch(() => undefined);
      return;
    }

    if (isImmersive) {
      setIsImmersive(false);
      return;
    }

    const target = frameRef.current;
    if (target?.requestFullscreen) {
      try {
        await target.requestFullscreen();
        setIsImmersive(false);
        return;
      } catch {
        // Fall through to the app-level immersive mode.
      }
    }

    // Some engines only honour a request aimed straight at the frame.
    const frame = target?.querySelector("iframe");
    if (frame?.requestFullscreen) {
      try {
        await frame.requestFullscreen();
        setIsImmersive(false);
        return;
      } catch {
        // Fall through to the app-level immersive mode.
      }
    }

    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        setIsImmersive(false);
        return;
      } catch {
        // Fall through to the app-level immersive mode.
      }
    }

    setIsImmersive(true);
  }, [isImmersive]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (document.fullscreenElement) return;
        setIsImmersive(false);
        return;
      }
      // F flips fullscreen from anywhere on the page.
      if (event.key.toLowerCase() === "f" && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        void toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen]);

  if (!game) {
    return <div className="player-page"><button className="player-back" onClick={() => navigate("/")}><ArrowLeft size={16} /> Back to library</button><div className="player-not-found">That game wandered off.</div></div>;
  }

  if (!launched) {
    return (
      <div className="player-page launch-page">
        <header className="player-topbar">
          <button className="player-brand" onClick={() => navigate("/")} aria-label="Return to SI GAMES library"><span className="player-brand-mark">SI</span><span>SI GAMES</span></button>
          <div className="player-title"><span className="player-dot" />{game.title}</div>
          <div className="player-actions"><button className="player-back" onClick={() => navigate("/")}><ArrowLeft size={16} /> <span>Back to library</span></button></div>
        </header>
        <div className="watermark-layer" aria-hidden="true"><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span></div>
        <main className="launch-main">
          <span className="section-kicker"><MonitorUp size={14} /> READY TO LAUNCH</span>
          <h1>{game.title}</h1>
          <p className="launch-description">{game.description}</p>
          <div className="launch-tags">{game.tags.map((tag) => <span key={tag}>{tag}</span>)}<span>{game.category}</span></div>
          <div className="launch-actions">
            <a className="launch-play launch-play--external" href="https://spideyiraj.s.gy/gtavsigames#LPDXwaRqPHsMz8VGVc9gDw==" target="_blank" rel="noopener noreferrer"><Play size={18} fill="currentColor" /> OPEN THE GAME LINK</a>
            <span className="launch-note">Embedding is not possible for this build. Open it in a new tab — no worries, we will not steal your info or show you ads. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></span>
          </div>
          <div className="player-info launch-info"><span className="info-label">HOW TO PLAY</span><p>{game.controls}</p></div>
          <p className="player-disclaimer player-disclaimer--heavy">{game.id === "gta-v"
            ? "A browser build of Grand Theft Auto V is hosted on the game link above. SI GAMES does not control its content, availability, or updates. Open it in a new tab — no worries, we will not steal your info or show you ads."
            : "This title runs on a heavy external build, so movements and sounds may lag on slower devices. SI GAMES does not control its content or availability."} <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
        </main>
      </div>
    );
  }

  const toggleFavorite = () => {
    const next = favorites.includes(game.id) ? favorites.filter((item) => item !== game.id) : [...favorites, game.id];
    setFavorites(next);
    localStorage.setItem("si-games-favorites", JSON.stringify(next));
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const interactive = target.closest(".player-info, .player-category, .open-external") as HTMLElement | null;
    if (!interactive) return;
    const bounds = interactive.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    interactive.style.setProperty("--tilt-x", `${(-y * 4).toFixed(2)}deg`);
    interactive.style.setProperty("--tilt-y", `${(x * 4).toFixed(2)}deg`);
    interactive.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    interactive.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  };

  const resetTilt = () => {
    document.querySelectorAll<HTMLElement>(".player-info, .player-category, .open-external").forEach((element) => {
      element.style.removeProperty("--tilt-x");
      element.style.removeProperty("--tilt-y");
      element.style.removeProperty("--glow-x");
      element.style.removeProperty("--glow-y");
    });
  };

  return (
    <div ref={playerRef} className={`player-page ${isImmersive ? "immersive-player" : ""} ${isNativeFullscreen ? "native-fullscreen" : ""}`} onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
      <header className="player-topbar">
        <button className="player-brand" onClick={() => navigate("/")} aria-label="Return to SI GAMES library"><span className="player-brand-mark">SI</span><span>SI GAMES</span></button>
        <div className="player-title"><span className="player-dot" />{game.title}</div>
        <div className="player-actions"><button className={`player-icon-button ${favorites.includes(game.id) ? "is-favorite" : ""}`} onClick={toggleFavorite} aria-label={favorites.includes(game.id) ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}><Heart size={18} fill={favorites.includes(game.id) ? "currentColor" : "none"} /></button><button className="player-icon-button" onClick={reload} aria-label="Reload this game"><RotateCcw size={17} /></button><button className="player-icon-button" onClick={toggleFullscreen} aria-label={isNativeFullscreen || isImmersive ? "Exit fullscreen gameplay" : "Enter fullscreen gameplay"}>{isNativeFullscreen || isImmersive ? <Minimize2 size={18} /> : <Expand size={18} />}</button><button className="player-back" onClick={() => navigate("/")}><ArrowLeft size={16} /> <span>Back to library</span></button></div>
      </header>
      <div className="watermark-layer" aria-hidden="true"><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span></div>
      <main className="player-main">
        <div className="player-heading"><div><span className="section-kicker"><MonitorUp size={14} /> NOW PLAYING</span><h1>{game.title}</h1><p>{game.description}</p></div><span className="player-category">{game.category}</span></div>
        {isGtaV ? (
          <section className="launch-only-frame" aria-label="Reroute to the hosted build">
            <a className="launch-play launch-play--external" href="https://spideyiraj.s.gy/gtavsigames#LPDXwaRqPHsMz8VGVc9gDw==" target="_blank" rel="noopener noreferrer"><Play size={18} fill="currentColor" /> Open the game link</a>
          </section>
        ) : (
          <section ref={frameRef} className={`game-frame-wrap ${isImmersive ? "is-immersive" : ""}`} onContextMenu={(event) => event.preventDefault()}>
            {loading && <div className="frame-loading"><Loader2 size={24} className="spin" /><span>Warming up the arcade...</span></div>}
            {showFsPrompt && !showExtension && !isNativeFullscreen && !isImmersive && <div className="fs-prompt" role="group" aria-label="Fullscreen option"><button className="fs-prompt-close" onClick={() => setShowFsPrompt(false)} aria-label="Dismiss fullscreen option"><X size={14} /></button><span className="fs-prompt-tag">FULLSCREEN OPTION</span><p>Run {game.title} edge to edge with the browser chrome out of the way.</p><div className="fs-prompt-actions"><button type="button" className="fs-prompt-go" onClick={toggleFullscreen}><Maximize2 size={14} /> Enter fullscreen</button><button type="button" className="fs-prompt-skip" onClick={() => setShowFsPrompt(false)}>Keep windowed <kbd>F</kbd></button></div></div>}
            <button className="immersive-exit" onClick={toggleFullscreen} aria-label="Exit fullscreen gameplay"><Minimize2 size={16} /> Exit fullscreen</button>
            <GameFrame key={frameKey} src={game.sourceUrl} title={game.title} allow="autoplay; fullscreen; gamepad; clipboard-write" allowFullScreen loading={loading} onLoad={() => setLoading(false)} onError={() => setLoading(false)} />
            <div className="frame-corner corner-tl" /><div className="frame-corner corner-br" />
          </section>
        )}          <div className="player-bottom"><div className="player-info"><span className="info-label">HOW TO PLAY</span><p>{game.controls}</p></div><div className="player-bottom-actions">{game.standalone && <button className="open-external" type="button" onClick={() => setLaunched(false)}><ArrowLeft size={15} /> Game info</button>}{game.id === "gta-v" ? <a className="open-external" href="https://spideyiraj.s.gy/gtavsigames#LPDXwaRqPHsMz8VGVc9gDw==" target="_blank" rel="noopener noreferrer"><Expand size={15} /> Open the game link</a> : game.htmlGame ? <a className="open-external" href={game.sourceUrl} target="_self" rel="noreferrer">Open in this tab <Expand size={15} /></a> : <button className="open-external" type="button" onClick={toggleFullscreen}><Maximize2 size={15} /> Open in full screen</button>}</div></div>

        {isGtaV
          ? <p className="player-disclaimer player-disclaimer--heavy">A browser build of Grand Theft Auto V is hosted on the game link above. SI GAMES does not control its content, availability, or updates. Open it in a new tab — no worries, we will not steal your info or show you ads. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : game.heavy ? <p className="player-disclaimer player-disclaimer--heavy">This title runs on a heavy external build, so movements and sounds may lag on slower devices. SI GAMES does not control its content or availability. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : game.htmlGame ? <p className="player-disclaimer player-disclaimer--html">HTML browser game — gameplay may be rough, buggy, or unfinished. It is not a fully tested release. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : <p className="player-disclaimer player-disclaimer--light">Runs entirely inside SI GAMES. No extra downloads, no ads, no new tab. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>}
      </main>
      {showExtension && <div className="extension-backdrop" onClick={() => setShowExtension(false)}><div ref={extensionModalRef} className="extension-modal" role="dialog" aria-modal="true" aria-labelledby="extension-title" aria-describedby="extension-description" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowExtension(false)} aria-label="Close extension notice"><X size={18} /></button><div className="extension-icon">✦</div><span className="section-kicker">ONE QUICK STEP</span><h2 id="extension-title">A smoother Eaglercraft launch?</h2><p id="extension-description">The Eaglercraft browser extension unlocks the full experience for this title. You can skip it and still try the game as-is.</p><div className="extension-actions"><a className="primary-button" href={game.extensionUrl} target="_self" rel="noreferrer">Install extension <Expand size={15} /></a><button className="soft-button" onClick={() => setShowExtension(false)}>Continue without extension</button></div><p className="extension-skip-hint">Press <kbd>Esc</kbd> to skip</p></div></div>}
    </div>
  );
}

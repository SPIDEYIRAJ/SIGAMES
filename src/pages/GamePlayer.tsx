import { createElement, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { ArrowLeft, Expand, Heart, Loader2, Minimize2, MonitorUp, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { games } from "@/data/games";

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
  const game = useMemo(() => games.find((item) => item.id === id), [id]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExtension, setShowExtension] = useState(Boolean(game?.extensionNotice));
  const [isImmersive, setIsImmersive] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [frameFailed, setFrameFailed] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLElement>(null);

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
    setFrameFailed(false);
    setShowRecovery(false);
    setShowExtension(Boolean(game.extensionNotice));
    const recoveryTimer = window.setTimeout(() => setShowRecovery(true), 12000);
    return () => window.clearTimeout(recoveryTimer);
  }, [game]);

  if (!game) {
    return <div className="player-page"><button className="player-back" onClick={() => navigate("/")}><ArrowLeft size={16} /> Back to library</button><div className="player-not-found">That game wandered off.</div></div>;
  }

  const toggleFavorite = () => {
    const next = favorites.includes(game.id) ? favorites.filter((item) => item !== game.id) : [...favorites, game.id];
    setFavorites(next);
    localStorage.setItem("si-games-favorites", JSON.stringify(next));
  };

  const toggleFullscreen = async () => {
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
        return;
      } catch {
        // Fall through to the app-level immersive mode.
      }
    }

    if (document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        return;
      } catch {
        // Fall through to the app-level immersive mode.
      }
    }

    setIsImmersive(true);
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
        <div className="player-actions"><button className={`player-icon-button ${favorites.includes(game.id) ? "is-favorite" : ""}`} onClick={toggleFavorite} aria-label={favorites.includes(game.id) ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}><Heart size={18} fill={favorites.includes(game.id) ? "currentColor" : "none"} /></button><button className="player-icon-button" onClick={toggleFullscreen} aria-label={isNativeFullscreen || isImmersive ? "Exit fullscreen gameplay" : "Enter fullscreen gameplay"}>{isNativeFullscreen || isImmersive ? <Minimize2 size={18} /> : <Expand size={18} />}</button><button className="player-back" onClick={() => navigate("/")}><ArrowLeft size={16} /> <span>Back to library</span></button></div>
      </header>
      <div className="watermark-layer" aria-hidden="true"><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span><span>////SPIDEY_IRAJ////</span></div>
      <main className="player-main">
        <div className="player-heading"><div><span className="section-kicker"><MonitorUp size={14} /> NOW PLAYING</span><h1>{game.title}</h1><p>{game.description}</p></div><span className="player-category">{game.category}</span></div>
        <section ref={frameRef} className={`game-frame-wrap ${isImmersive ? "is-immersive" : ""}`}>
          {loading && <div className="frame-loading"><Loader2 size={24} className="spin" /><span>Warming up the arcade...</span></div>}
          <button className="immersive-exit" onClick={toggleFullscreen} aria-label="Exit fullscreen gameplay"><Minimize2 size={16} /> Exit fullscreen</button>
          <GameFrame src={game.sourceUrl} title={game.title} allow="autoplay; fullscreen; gamepad" allowFullScreen loading={loading} onLoad={() => { setLoading(false); setFrameFailed(false); setShowRecovery(false); }} onError={() => { setLoading(false); setFrameFailed(true); }} />
          <div className="frame-corner corner-tl" /><div className="frame-corner corner-br" />
        </section>
        {(frameFailed || showRecovery) && <div className="frame-recovery" role="status"><span>{frameFailed ? "This destination did not load inside the player." : "Still loading? Some destinations need a direct window."}</span><a href={game.sourceUrl} target="_self" rel="noreferrer">Open destination <Expand size={14} /></a></div>}
        <div className="player-bottom"><div className="player-info"><span className="info-label">HOW TO PLAY</span><p>{game.controls}</p></div><a className="open-external" href={game.sourceUrl} target="_self" rel="noreferrer">Open destination <Expand size={15} /></a></div>
        {game.heavy ? <p className="player-disclaimer player-disclaimer--heavy">This title runs on a heavy external build, so movements and sounds may lag on slower devices. SI GAMES does not control its content or availability.</p> : <p className="player-disclaimer player-disclaimer--light">Runs entirely inside SI GAMES. No extra downloads, no ads, no new tab.</p>}
      </main>
      {showExtension && <div className="extension-backdrop"><div className="extension-modal" role="dialog" aria-modal="true" aria-labelledby="extension-title" aria-describedby="extension-description"><button className="modal-close" onClick={() => setShowExtension(false)} aria-label="Close extension notice"><X size={18} /></button><div className="extension-icon">✦</div><span className="section-kicker">ONE QUICK STEP</span><h2 id="extension-title">A smoother Eaglercraft launch?</h2><p id="extension-description">This browser game may require the SI GAMES browser extension for its full experience. You can also continue and try the game as-is.</p><div className="extension-actions"><a className="primary-button" href={game.extensionUrl} target="_self" rel="noreferrer">Install extension <Expand size={15} /></a><button className="soft-button" onClick={() => setShowExtension(false)}>Continue without extension</button></div></div></div>}
    </div>
  );
}

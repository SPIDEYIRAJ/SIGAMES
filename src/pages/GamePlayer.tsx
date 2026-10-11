import { createElement, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { AlertTriangle, ArrowLeft, Check, Copy, Expand, Flag, Heart, Loader2, Maximize2, Minimize2, MonitorUp, Play, RotateCcw, Send, X } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { games, type GameMedia } from "@/data/games";
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

/** The reasons a player can pick from when reporting any game. */
const REPORT_REASONS = [
  "Game does not load",
  "Game is broken or buggy",
  "Wrong game or wrong link",
  "Controls do not work",
  "Something else",
] as const;

/**
 * GTA V cannot be embedded, and a button cannot open its host in a new tab
 * either — the browser blocks that cross-site pop-up. So the page hands the
 * player a download button and the link to paste into a fresh tab themselves.
 */
function GtaVNotice({ hostUrl, media }: { hostUrl: string; media?: GameMedia }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyLink = () => {
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    clipboard.writeText(hostUrl).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <>
      <section className="gtav-notice" aria-labelledby="gtav-notice-title">
        <span className="gtav-tag">GTA V · HOW TO PLAY</span>
        <h2 id="gtav-notice-title">Copy the link, then open it in your own tab</h2>
        <p className="gtav-text">
          GTA V cannot run inside this page, and this site cannot open a new tab for you either — browsers block a
          tab opened that way. So copy the link, then paste it into a new tab yourself.
        </p>

        <button type="button" className="launch-play launch-play--external gtav-copy" onClick={copyLink}>
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "Link copied" : "Copy the game link"}
        </button>

        <input
          type="text"
          readOnly
          className="gtav-link"
          value={hostUrl}
          aria-label="GTA V game link"
          onFocus={(event) => event.currentTarget.select()}
          onClick={(event) => event.currentTarget.select()}
        />

        <GtaVEdgeBlock hostUrl={hostUrl} edgeLink={`microsoft-edge:${encodeURI(hostUrl)}`} />

        <p className="gtav-warning">
          <AlertTriangle size={14} /> GTA V will not run on many devices. It needs a reasonably strong machine and a
          modern browser.
        </p>      <p className="gtav-fineprint">
          A community browser build of Grand Theft Auto V. SI GAMES does not host or control it.{" "}
          <span className="disclaimer-sign">////SPIDEY_IRAJ////</span>
        </p>
      </section>

      {media && <GtaVMedia media={media} />}
    </>
  );
}

/**
 * The GTA V browser setup: install uBlock Origin, then copy the link and open it
 * in Microsoft Edge. If the player is already on Edge the page lets them copy and
 * paste into a new tab; otherwise it shows the Edge link so they can switch to Edge.
 */
function GtaVEdgeBlock({ hostUrl, edgeLink }: { hostUrl: string; edgeLink: string }) {
  const [copied, setCopied] = useState(false);
  const isOnEdge = useRef(false);
  useEffect(() => {
    isOnEdge.current = /\bedge\//i.test(navigator.userAgent || "");
  }, []);

  const copyLink = () => {
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    clipboard.writeText(hostUrl).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };

  return (
    <section className="gtav-edge" aria-labelledby="gtav-edge-title">
      <span className="gtav-edge-tag">GTA V · BROWSER SETUP</span>
      <h2 id="gtav-edge-title">Open the game in Microsoft Edge to avoid ads</h2>

      <p className="gtav-ublock-p">Without uBlock Origin the hosted GTA V page can show ads and pop-ups that interrupt play. Add the extension first, then copy the link below and open it in Edge.</p>

      <ol className="gtav-steps">
        <li>Step 1: Open Microsoft Edge.
          <a className="edge-link" href="microsoft-edge:https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak" target="_self" rel="noreferrer">Install uBlock Origin</a>
        </li>
        <li>Step 2: If uBlock Origin is already installed, skip this step.
          <span className="edge-skip">Skip this step</span>
        </li>
      </ol>

      <div className="gtav-edge-copy">
        <span className="section-kicker">STEP 3</span>
        <p className="gtav-edge-head">Copy the link, then open this HTML link in your browser: <a className="gtav-edge-open" href={edgeLink} target="_self" rel="noreferrer">Open the game in Microsoft Edge</a>, then paste the link into a new tab.
        <input
          type="text"
          readOnly
          className="gtav-link"
          value={hostUrl}
          aria-label="GTA V game link"
          onFocus={(event) => event.currentTarget.select()}
          onClick={(event) => event.currentTarget.select()}
        />

        <button
          type="button"
          className="launch-play launch-play--external gtav-copy"
          onClick={copyLink}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? "Link copied" : "Copy the game link"}
        </button>

        <a
          className="gtav-edge-open"
          href={edgeLink}
          target="_self"
          rel="noreferrer"
        >
          {isOnEdge.current ? "Open in Edge" : "Open in Microsoft Edge"}
        </a>
      </div>

      {isOnEdge ? (
        <p className="gtav-edge-note">
          You are on Microsoft Edge, so copy the link, then open a new tab and paste it in.
        </p>
      ) : (
        <p className="gtav-edge-note">
          You are not on Microsoft Edge. Copy the link, then open this HTML link in your browser to switch to Edge and paste the link in.
        </p>
      )}

      <p className="gtav-fineprint">
        A community browser build of Grand Theft Auto V. SI GAMES does not host or control it.{" "}
        <span className="disclaimer-sign">////SPIDEY_IRAJ////</span>
      </p>
    </section>
  );
}

/**
 * The GTA V gallery: the key art, the game's own facts, the official trailer and
 * the trailer picks. Videos load in this page — nothing here needs a new tab.
 */
function GtaVMedia({ media }: { media: GameMedia }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const screenshots = media.screenshots ?? [];
  const videos = media.videos ?? [];
  const facts = media.facts ?? [];

  return (
    <section className="gtav-media" aria-label="Grand Theft Auto V images and game information">
      {media.banner && (
        <figure className="gtav-hero">
          <img className="gtav-hero-img" src={media.banner} alt="Grand Theft Auto V key art" loading="lazy" />
          {media.logo && <img className="gtav-hero-logo" src={media.logo} alt="Grand Theft Auto V logo" loading="lazy" />}
          <figcaption>Grand Theft Auto V — official key art</figcaption>
        </figure>
      )}

      {facts.length > 0 && (
        <div className="gtav-block">
          <span className="section-kicker"><MonitorUp size={14} /> GAME INFO</span>
          <dl className="gtav-facts">
            {facts.map((fact) => (
              <div className="gtav-fact" key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {media.trailer && (
        <figure className="gtav-trailer">
          <video controls preload="metadata" playsInline poster={media.trailer.poster}>
            <source src={media.trailer.src} type="video/mp4" />
            Your browser cannot play this trailer. <a href={media.trailer.src} target="_self" rel="noreferrer">Open the trailer file</a>.
          </video>
          <figcaption>{media.trailer.caption}</figcaption>
        </figure>
      )}

      {screenshots.length > 0 && (
        <div className="gtav-block">
          <span className="section-kicker"><Expand size={14} /> SCREENSHOTS</span>
          <div className="gtav-shots">
            {screenshots.map((shot) => (
              <figure className="gtav-shot" key={shot.src}>
                <img src={shot.src} alt={shot.caption} loading="lazy" />
                <figcaption>{shot.caption}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}

      {videos.length > 0 && (
        <div className="gtav-block">
          <span className="section-kicker"><Play size={14} /> VIDEOS</span>
          <div className="gtav-videos">
            {videos.map((video) => (
              <div className={`gtav-video ${activeVideo === video.id ? "is-playing" : ""}`} key={video.id}>
                {activeVideo === video.id ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${video.id}?rel=0&autoplay=1`}
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <button type="button" className="gtav-video-pick" onClick={() => setActiveVideo(video.id)}>
                    <img src={video.poster} alt={video.title} loading="lazy" />
                    <span className="gtav-video-play" aria-hidden="true"><Play size={18} fill="currentColor" /></span>
                    <span className="gtav-video-meta"><strong>{video.title}</strong><em>{video.author}</em></span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** One dialog, reused on every game page, that files a problem report. */
function ReportDialog({ gameId, gameTitle, onClose }: { gameId: string; gameTitle: string; onClose: () => void }) {
  const submitReport = useMutation(api.reports.submit);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const send = async () => {
    setSending(true);
    setError("");
    try {
      await submitReport({
        gameId,
        gameTitle,
        reason,
        details: details.trim() ? details.trim() : undefined,
      });
      setSent(true);
    } catch {
      setError("That report did not go through. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="report-backdrop" onClick={onClose}>
      <div
        className="report-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="report-close" onClick={onClose} aria-label="Close the report form">
          <X size={18} />
        </button>

        {sent ? (
          <div className="report-sent">
            <span className="report-sent-icon"><Check size={20} /></span>
            <h2 id="report-title">Report sent</h2>
            <p>Thanks — that helps keep {gameTitle} working for everyone.</p>
            <button type="button" className="primary-button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <span className="section-kicker"><Flag size={14} /> REPORT A PROBLEM</span>
            <h2 id="report-title">{gameTitle}</h2>
            <p className="report-lead">Tell us what went wrong and it gets looked at.</p>

            <span className="report-label">What happened?</span>
            <div className="report-reasons">
              {REPORT_REASONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`report-reason ${reason === option ? "is-picked" : ""}`}
                  onClick={() => setReason(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <label className="report-label" htmlFor="report-details">Anything else? (optional)</label>
            <textarea
              id="report-details"
              className="report-details"
              value={details}
              rows={4}
              maxLength={2000}
              placeholder="What you played on, what you saw, when it happened..."
              onChange={(event) => setDetails(event.target.value)}
            />

            {error && <p className="report-error">{error}</p>}

            <div className="report-actions">
              <button type="button" className="primary-button" disabled={sending} onClick={() => void send()}>
                <Send size={15} /> {sending ? "Sending..." : "Send report"}
              </button>
              <button type="button" className="soft-button" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
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
  const [showReport, setShowReport] = useState(false);
  const extensionModalRef = useRef<HTMLDivElement>(null);
  const [launched, setLaunched] = useState(() => {
    const target = games.find((item) => item.id === (id ?? STANDALONE_DEFAULT));
    if (!target) return false;
    if (target.id === "gta-v") return false;
    return !target.standalone && target.type !== "external";
  });

  /** GTA V lives on its own host. The fallback keeps the copy button working even
   *  if the library entry ever loses its URL. */
  const gtaVHostUrl = game?.sourceUrl ?? "https://sigamespremiumrp.spideyiraj1925.workers.dev";

  /** Edge opens the game host as its own URL. If Edge is not installed, the link
   *  is ignored by the browser, so other browsers get the same link for copying
   *  and pasting into a new tab manually. */
  const gtaVEdgeLink = `microsoft-edge:${encodeURI(gtaVHostUrl)}`;

  /** GTA V is the only Most Played title that keeps an explicit host link shown to the user. */
  const isMostPlayedHostLink = useCallback(
    (game: import("@/data/games").Game | undefined) => Boolean(game && game.id === "gta-v"),
    [],
  );

  // Every Most Played title can load in-frame here. The only visible host link
  // is shown for GTA V; THE RACE and GTA Vice City keep their raw source hidden.
  const isGtaV = game?.id === "gta-v";
  const isMostPlayedHostOnly = isGtaV;

  const showGtaVHostLink = isGtaV;

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
    if (game?.id === "gta-v") {
      // GTA V cannot play in this frame because of cross-origin restrictions.
      // Prompt the user to copy the link and open it in a new tab.
      navigator.clipboard.writeText(gtaVHostUrl ?? "https://sigamespremiumrp.spideyiraj1925.workers.dev").catch(() => undefined);
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
          {isGtaV ? (
          <GtaVNotice hostUrl={gtaVHostUrl} gtaVHostUrl={gtaVHostUrl} media={game.media} />
        ) : (
            <div className="launch-actions">
              <button type="button" className="launch-play" onClick={launch}><Play size={18} fill="currentColor" /> Play now</button>
              <span className="launch-note">Runs inside SI GAMES. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></span>
            </div>
          )}
          <div className="launch-report">
            <button type="button" className="open-external report-button" onClick={() => setShowReport(true)}>
              <Flag size={15} /> Report a problem
            </button>
          </div>
          <div className="player-info launch-info"><span className="info-label">HOW TO PLAY</span><p>{game.controls}</p></div>
          {!isGtaV && <p className="player-disclaimer player-disclaimer--light">Runs entirely inside SI GAMES. No extra downloads, no ads, no new tab. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>}
        </main>
        {showReport && <ReportDialog gameId={game.id} gameTitle={game.title} onClose={() => setShowReport(false)} />}
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
          <GtaVNotice hostUrl={gtaVHostUrl} gtaVHostUrl={gtaVHostUrl} media={game.media} />
        ) : (
          <section ref={frameRef} className={`game-frame-wrap ${isImmersive ? "is-immersive" : ""}`} onContextMenu={(event) => event.preventDefault()}>
            {loading && <div className="frame-loading"><Loader2 size={24} className="spin" /><span>Warming up the arcade...</span></div>}
            {showFsPrompt && !showExtension && !isNativeFullscreen && !isImmersive && <div className="fs-prompt" role="group" aria-label="Fullscreen option"><button className="fs-prompt-close" onClick={() => setShowFsPrompt(false)} aria-label="Dismiss fullscreen option"><X size={14} /></button><span className="fs-prompt-tag">FULLSCREEN OPTION</span><p>Run {game.title} edge to edge with the browser chrome out of the way.</p><div className="fs-prompt-actions"><button type="button" className="fs-prompt-go" onClick={toggleFullscreen}><Maximize2 size={14} /> Enter fullscreen</button><button type="button" className="fs-prompt-skip" onClick={() => setShowFsPrompt(false)}>Keep windowed <kbd>F</kbd></button></div></div>}
            <button className="immersive-exit" onClick={toggleFullscreen} aria-label="Exit fullscreen gameplay"><Minimize2 size={16} /> Exit fullscreen</button>
            <GameFrame key={frameKey} src={game.sourceUrl} title={game.title} allow="autoplay; fullscreen; gamepad; clipboard-write" allowFullScreen loading={loading} onLoad={() => setLoading(false)} onError={() => setLoading(false)} />
            <div className="frame-corner corner-tl" /><div className="frame-corner corner-br" />
          </section>
        )}
        <div className="player-bottom"><div className="player-info"><span className="info-label">HOW TO PLAY</span><p>{game.controls}</p></div><div className="player-bottom-actions">{!showGtaVHostLink && (game.standalone ? <button className="open-external" type="button" onClick={() => setLaunched(false)}><ArrowLeft size={15} /> Game info</button> : game.htmlGame ? <a className="open-external" href={game.sourceUrl} target="_self" rel="noreferrer">Open in this tab <Expand size={15} /></a> : <button className="open-external" type="button" onClick={toggleFullscreen}><Maximize2 size={15} /> Open in full screen</button>)}<button type="button" className="open-external report-button" onClick={() => setShowReport(true)}><Flag size={15} /> Report a problem</button></div></div>

        {showGtaVHostLink
          ? null
          : game.heavy ? <p className="player-disclaimer player-disclaimer--heavy">This title runs on a heavy external build, so movements and sounds may lag on slower devices. SI GAMES does not control its content or availability. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : game.htmlGame ? <p className="player-disclaimer player-disclaimer--html">HTML browser game — gameplay may be rough, buggy, or unfinished. It is not a fully tested release. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : <p className="player-disclaimer player-disclaimer--light">Runs entirely inside SI GAMES. No extra downloads, no ads, no new tab. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>}
      </main>
      {showReport && <ReportDialog gameId={game.id} gameTitle={game.title} onClose={() => setShowReport(false)} />}
      {showExtension && <div className="extension-backdrop" onClick={() => setShowExtension(false)}><div ref={extensionModalRef} className="extension-modal" role="dialog" aria-modal="true" aria-labelledby="extension-title" aria-describedby="extension-description" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowExtension(false)} aria-label="Close extension notice"><X size={18} /></button><div className="extension-icon">✦</div><span className="section-kicker">ONE QUICK STEP</span><h2 id="extension-title">A smoother Eaglercraft launch?</h2><p id="extension-description">The Eaglercraft browser extension unlocks the full experience for this title. You can skip it and still try the game as-is.</p><div className="extension-actions"><a className="primary-button" href={game.extensionUrl} target="_self" rel="noreferrer">Install extension <Expand size={15} /></a><button className="soft-button" onClick={() => setShowExtension(false)}>Continue without extension</button></div><p className="extension-skip-hint">Press <kbd>Esc</kbd> to skip</p></div></div>}
    </div>
  );
}

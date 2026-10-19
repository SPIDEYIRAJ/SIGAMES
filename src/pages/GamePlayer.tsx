import { createElement, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { ArrowLeft, Check, Copy, Expand, Flag, Heart, Loader2, Maximize2, Minimize2, MonitorUp, Play, RotateCcw, Send, X, Save } from "lucide-react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { games, type GameMedia } from "@/data/games";
import "@/player-prompt.css";

/** Standalone pages (for example /gta-v and /gta-vicecity) have no :id segment. */
const STANDALONE_DEFAULT = "gta-v";

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

function GameMediaPanel({ media, title }: { media: GameMedia; title: string }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const screenshots = media.screenshots ?? [];
  const videos = media.videos ?? [];
  const facts = media.facts ?? [];

  return (
    <section className="gtav-media" aria-label={`${title} images and game information`}>
      {media.banner && (
        <figure className="gtav-hero">
          <img className="gtav-hero-img" src={media.banner} alt={`${title} key art`} loading="lazy" />
          {media.logo && <img className="gtav-hero-logo" src={media.logo} alt={`${title} logo`} loading="lazy" />}
          <figcaption>{title} — key art</figcaption>
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

/**
 * One dialog, reused on every game page, that asks what went wrong and then
 * hands the report to the player's own mail app, pre-addressed to the site
 * inbox with everything written out.
 */
const REPORT_INBOX = "spideyiraj1925@gmail.com";

/** The five ways into the hosted build, offered at the entrance as 3D cards.
 *
 * Each card owns an accent colour and maps to one `?mode=` query value.
 * Picking a card rewrites the page link (`sourceUrl?mode=<id>`), the readonly
 * input shows that modified link, and the copy button hands it to the
 * clipboard.
 */
const MODE_CARDS = [
  { id: "sandbox", emoji: "🎮", label: "Sandbox", accent: "#3EFEFF" },
  { id: "story", emoji: "📖", label: "Story", accent: "#FFD400" },
  { id: "vi", emoji: "🗺️", label: "GTA VI Map", accent: "#FF4E85" },
  { id: "title", emoji: "🎬", label: "Title", accent: "#FF8A3D" },
  { id: "chromebook", emoji: "💻", label: "Chromebook", accent: "#4FDF8B" },
] as const;

type ModeId = (typeof MODE_CARDS)[number]["id"];

/** Seconds the player waits after copying before the new tab opens with the copied link. */
const OPEN_COUNTDOWN_SECONDS = 3;

/** Accepts only modes a card actually offers; anything else counts as "not chosen yet". */
function isModeId(value: string | null | undefined): value is ModeId {
  return Boolean(value && MODE_CARDS.some((card) => card.id === value));
}

/** Pointer tilt: the hovered card leans toward the cursor and lights up under it. */
function tiltModeCard(event: PointerEvent<HTMLDivElement>) {
  const target = event.target as HTMLElement;
  const card = target.closest(".mode-card") as HTMLElement | null;
  if (!card) return;
  const bounds = card.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;
  card.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
  card.style.setProperty("--tilt-y", `${(x * 10).toFixed(2)}deg`);
  card.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
  card.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
}

function resetModeTilt() {
  document.querySelectorAll<HTMLElement>(".mode-card").forEach((card) => {
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
    card.style.removeProperty("--glow-x");
    card.style.removeProperty("--glow-y");
  });
}

function ReportDialog({ gameId, gameTitle, onClose }: { gameId: string; gameTitle: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [sent, setSent] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  /** Builds the mailto draft each time it is opened, so it always carries the latest details. */
  const openMail = useCallback(() => {
    const subject = `SI GAMES problem report — ${gameTitle}`;
    const body = [
      "Problem report from the SI GAMES arcade.",
      "",
      `Game: ${gameTitle} (${gameId})`,
      `Problem: ${reason}`,
      `Details: ${details.trim() ? details.trim() : "—"}`,
      `Page: ${window.location.href}`,
      `When: ${new Date().toLocaleString()}`,
      "",
      "— sent from a player's mail app",
    ].join("\r\n");
    window.location.href = `mailto:${REPORT_INBOX}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [gameId, gameTitle, reason, details]);

  const send = () => {
    setSent(true);
    openMail();
  };

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
            <h2 id="report-title">Your mail app is opening</h2>
            <p>The draft to spideyiraj1925@gmail.com is written out — game, problem, details and this page's address. Just press send in your own mail app to deliver it.</p>
            <div className="report-actions vertical">
              <button type="button" className="soft-button" onClick={openMail}><Send size={15} /> Didn't open? Open it again</button>
              <button type="button" className="primary-button" onClick={onClose}>Close</button>
            </div>
          </div>
        ) : (
          <>
            <span className="section-kicker"><Flag size={14} /> REPORT A PROBLEM</span>
            <h2 id="report-title">{gameTitle}</h2>
            <p className="report-lead">Tell us what went wrong — submitting opens your own mail app with the report written out to the SI GAMES inbox.</p>

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

            <div className="report-actions">
              <button type="button" className="primary-button" onClick={send}>
                <Send size={15} /> Open mail &amp; send
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
  const { pathname } = useLocation();
  /** Standalone routes carry the game id in the path itself (/gta-v, /gta-vicecity). */
  const pathSegment = decodeURIComponent(pathname.replace(/^\/+/, "").split("/")[0] ?? "");
  const resolvedId = id ?? (games.some((item) => item.id === pathSegment) ? pathSegment : STANDALONE_DEFAULT);
  const game = useMemo(() => games.find((item) => item.id === resolvedId), [resolvedId]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExtension, setShowExtension] = useState(Boolean(game?.extensionNotice));
  const [isImmersive, setIsImmersive] = useState(false);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [showFsPrompt, setShowFsPrompt] = useState(false);
  const [showReport, setShowReport] = useState(false);
  // For titles with a server picker (GTA V): the URL chosen at the entrance.
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  // Copy-link flow (GTA V): confirm the link hit the clipboard.
  const [linkCopied, setLinkCopied] = useState(false);
  // Selection mode: nothing is picked until the visitor chooses a card. The
  // pick lives in `?mode=`, and the link/copy row only appears once it exists.
  const [searchParams, setSearchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: ModeId | null = isModeId(modeParam) ? modeParam : null;
  const linkInputRef = useRef<HTMLInputElement>(null);
  const extensionModalRef = useRef<HTMLDivElement>(null);
  const [launched, setLaunched] = useState(() => {
    const target = games.find((item) => item.id === resolvedId);
    if (!target) return false;
    return !target.standalone && target.type !== "external";
  });

  const [frameKey, setFrameKey] = useState(0);
  const playerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLElement>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setFrameKey((key) => key + 1);
  }, []);

  /** Rewrites the page link so the chosen `?mode=` survives a refresh or a share. */
  const selectMode = useCallback(
    (nextMode: ModeId) => {
      const params = new URLSearchParams(searchParams);
      params.set("mode", nextMode);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  /** After a copy: count down, then open the copied URL (never about:blank) in a new tab. */
  const [pendingOpen, setPendingOpen] = useState<{ link: string; seconds: number } | null>(null);
  const [openBlocked, setOpenBlocked] = useState(false);

  const copyModeLink = useCallback(async (link: string) => {
    setOpenBlocked(false);
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2500);
      setPendingOpen({ link, seconds: OPEN_COUNTDOWN_SECONDS });
    } catch {
      // Clipboard can be blocked (permission or non-secure context) — select
      // the field so the player can copy it manually.
      linkInputRef.current?.select();
    }
  }, []);

  /** Ticks the countdown once a second; opens the copied link when it reaches zero. */
  useEffect(() => {
    if (!pendingOpen) return;
    const finishing = pendingOpen.seconds <= 1;
    const delay = pendingOpen.seconds <= 0 ? 0 : 1000;
    const timer = window.setTimeout(() => {
      if (!finishing) {
        setPendingOpen((current) => (current ? { ...current, seconds: current.seconds - 1 } : current));
        return;
      }
      const opened = window.open(pendingOpen.link, "_blank");
      if (!opened) setOpenBlocked(true);
      setPendingOpen(null);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [pendingOpen]);

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
    setPlayUrl(null);
  }, [game]);

  /** Standalone pages describe the title first, then either load the frame or hand over. */
  const launch = useCallback(() => {
    if (game?.type === "external") {
      // Not embeddable: hand the player over to the game itself, in this same tab.
      window.location.href = game.sourceUrl;
      return;
    }
    setPlayUrl(null);
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
    // The link the entrance shows and copies — only exists once a mode is chosen.
    const modeLink = mode
      ? `${game.sourceUrl.replace(/\/+$/, "")}?mode=${mode}`
      : null;
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
          {game.openInNewTab ? (
            <div className="launch-actions">
              <div className="copy-link">
                <span className="copy-link-label"><Save size={13} /> Choose a mode</span>
                <div
                  className="mode-cards"
                  role="radiogroup"
                  aria-label={`${game.title} mode`}
                  onPointerMove={tiltModeCard}
                  onPointerLeave={resetModeTilt}
                >
                  {MODE_CARDS.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      role="radio"
                      aria-checked={mode === card.id}
                      className={`mode-card ${mode === card.id ? "is-active" : ""}`}
                      style={{ "--mode-accent": card.accent } as CSSProperties}
                      onClick={() => selectMode(card.id)}
                    >
                      <span className="mode-card-emoji" aria-hidden="true">{card.emoji}</span>
                      <span className="mode-card-label">{card.label}</span>
                      <span className="mode-card-param">?mode={card.id}</span>
                      {mode === card.id && <span className="mode-card-dot" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
                {mode && modeLink ? (
                  <>
                    <span className="copy-link-mode" aria-live="polite">
                      Selected: ?mode={mode}
                    </span>
                    {pendingOpen && (
                      <span className="copy-open-countdown" role="status">
                        Opening the copied link in a new tab in {pendingOpen.seconds}…
                      </span>
                    )}
                    {openBlocked && (
                      <span className="copy-open-blocked" role="alert">
                        Your browser blocked the new tab — paste the copied link manually.
                      </span>
                    )}
                    <div className="copy-link-row">
                      <input
                        ref={linkInputRef}
                        className="copy-link-url"
                        readOnly
                        value={modeLink}
                        aria-label={`${game.title} link for mode ${mode}`}
                        onFocus={(event) => event.currentTarget.select()}
                      />
                      <button
                        type="button"
                        className="launch-play copy-link-btn"
                        onClick={() => copyModeLink(modeLink)}
                      >
                        {linkCopied || pendingOpen ? <Check size={18} /> : <Copy size={18} fill="currentColor" />} {pendingOpen ? `Opening in ${pendingOpen.seconds}s…` : linkCopied ? "Copied!" : "Copy & open new tab"}
                      </button>
                    </div>
                    <span className="launch-note">Copies the link, then opens it in a new tab after a {OPEN_COUNTDOWN_SECONDS}-second countdown — no blank tab, no Edge, no ad-blocker needed. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></span>
                  </>
                ) : (
                  <span className="launch-note">Pick a mode card above to reveal your link. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></span>
                )}
              </div>
            </div>
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
          {game.media && <GameMediaPanel media={game.media} title={game.title} />}
          {game.heavy ? <p className="player-disclaimer player-disclaimer--heavy">This title runs on a heavy external build, so movements and sounds may lag on slower devices. SI GAMES does not control its content or availability. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p> : <p className="player-disclaimer player-disclaimer--light">Runs entirely inside SI GAMES. No extra downloads, no ads, no new tab. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>}
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
        <section ref={frameRef} className={`game-frame-wrap ${isImmersive ? "is-immersive" : ""}`} onContextMenu={(event) => event.preventDefault()}>
            {loading && <div className="frame-loading"><Loader2 size={24} className="spin" /><span>Warming up the arcade...</span></div>}
            {showFsPrompt && !showExtension && !isNativeFullscreen && !isImmersive && <div className="fs-prompt" role="group" aria-label="Fullscreen option"><button className="fs-prompt-close" onClick={() => setShowFsPrompt(false)} aria-label="Dismiss fullscreen option"><X size={14} /></button><span className="fs-prompt-tag">FULLSCREEN OPTION</span><p>Run {game.title} edge to edge with the browser chrome out of the way.</p><div className="fs-prompt-actions"><button type="button" className="fs-prompt-go" onClick={toggleFullscreen}><Maximize2 size={14} /> Enter fullscreen</button><button type="button" className="fs-prompt-skip" onClick={() => setShowFsPrompt(false)}>Keep windowed <kbd>F</kbd></button></div></div>}
            <button className="immersive-exit" onClick={toggleFullscreen} aria-label="Exit fullscreen gameplay"><Minimize2 size={16} /> Exit fullscreen</button>
            <GameFrame key={frameKey} src={playUrl ?? game.sourceUrl} title={game.title} allow="autoplay; fullscreen; gamepad; clipboard-write" allowFullScreen loading={loading} onLoad={() => setLoading(false)} onError={() => setLoading(false)} />
            <div className="frame-corner corner-tl" /><div className="frame-corner corner-br" />
          </section>
        <div className="player-bottom"><div className="player-info"><span className="info-label">HOW TO PLAY</span><p>{game.controls}</p></div><div className="player-bottom-actions">{game.standalone ? <button className="open-external" type="button" onClick={() => setLaunched(false)}><ArrowLeft size={15} /> Game info</button> : game.htmlGame ? <a className="open-external" href={game.sourceUrl} target="_self" rel="noreferrer">Open in this tab <Expand size={15} /></a> : <button className="open-external" type="button" onClick={toggleFullscreen}><Maximize2 size={15} /> Open in full screen</button>}<button type="button" className="open-external report-button" onClick={() => setShowReport(true)}><Flag size={15} /> Report a problem</button></div></div>

        {game.heavy ? <p className="player-disclaimer player-disclaimer--heavy">This title runs on a heavy external build, so movements and sounds may lag on slower devices. SI GAMES does not control its content or availability. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : game.htmlGame ? <p className="player-disclaimer player-disclaimer--html">HTML browser game — gameplay may be rough, buggy, or unfinished. It is not a fully tested release. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
          : <p className="player-disclaimer player-disclaimer--light">Runs entirely inside SI GAMES. No extra downloads, no ads, no new tab. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>}
          <p className="player-device-note">This page is built for laptops and PCs. It is not made for phones or every browser tab — if the game area looks cramped or the frame does not load, try this on a computer with a bigger screen and a modern browser. <span className="disclaimer-sign">////SPIDEY_IRAJ////</span></p>
      </main>
      {showReport && <ReportDialog gameId={game.id} gameTitle={game.title} onClose={() => setShowReport(false)} />}
      {showExtension && <div className="extension-backdrop" onClick={() => setShowExtension(false)}><div ref={extensionModalRef} className="extension-modal" role="dialog" aria-modal="true" aria-labelledby="extension-title" aria-describedby="extension-description" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowExtension(false)} aria-label="Close extension notice"><X size={18} /></button><div className="extension-icon">✦</div><span className="section-kicker">ONE QUICK STEP</span><h2 id="extension-title">A smoother Eaglercraft launch?</h2><p id="extension-description">The Eaglercraft browser extension unlocks the full experience for this title. You can skip it and still try the game as-is.</p><div className="extension-actions"><a className="primary-button" href={game.extensionUrl} target="_self" rel="noreferrer">Install extension <Expand size={15} /></a><button className="soft-button" onClick={() => setShowExtension(false)}>Continue without extension</button></div><p className="extension-skip-hint">Press <kbd>Esc</kbd> to skip</p></div></div>}
    </div>
  );
}

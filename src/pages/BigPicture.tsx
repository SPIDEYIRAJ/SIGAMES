import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Crown,
  Expand,
  Gamepad2,
  Maximize2,
  Play,
  Power,
  Search,
  Smartphone,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { categories as gameCategories, games, newGames, type Game } from "@/data/games";
import PartyLobby from "@/components/PartyLobby";
import {
  EMPTY_PAD,
  dispatchPadEdges,
  physicalPad,
  postPartyInputs,
  type PadState,
  type PartyRoom,
} from "@/lib/party";
import { captureLaunchSource } from "@/lib/launch";

interface PartyTicket {
  sessionId: Id<"partySessions">;
  code: string;
  displayToken: string;
}

const PARTY_STORAGE_KEY = "si-games-party-ticket";
const RAIL_WINDOW = 16;

function readTicket(): PartyTicket | null {
  try {
    const raw = localStorage.getItem(PARTY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PartyTicket>;
    if (!parsed.sessionId || !parsed.code || !parsed.displayToken) return null;
    return { sessionId: parsed.sessionId as Id<"partySessions">, code: parsed.code, displayToken: parsed.displayToken };
  } catch {
    return null;
  }
}

function saveTicket(ticket: PartyTicket | null): void {
  try {
    if (ticket) localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(ticket));
    else localStorage.removeItem(PARTY_STORAGE_KEY);
  } catch {
    // Private mode: the ticket stays in memory.
  }
}

/** TV launcher: huge art, controller-first focus, optional phone pads. */
export default function BigPicture() {
  const navigate = useNavigate();
  const createRoom = useMutation(api.party.create);
  const setPartyGame = useMutation(api.party.setGame);

  const [category, setCategory] = useState("All Games");
  const [focus, setFocus] = useState(0);
  const [stageId, setStageId] = useState<string | null>(null);
  const [ticket, setTicket] = useState<PartyTicket | null>(readTicket);
  const [showParty, setShowParty] = useState(false);
  const [partyError, setPartyError] = useState("");
  const [clock, setClock] = useState(() => new Date());
  const [copied, setCopied] = useState(false);

  const roomQuery = useQuery(
    api.party.byId,
    ticket ? { sessionId: ticket.sessionId } : "skip",
  );
  const room = (roomQuery ?? null) as PartyRoom | null;

  const stageFrame = useRef<HTMLIFrameElement>(null);
  const previousInputs = useRef<Map<string, PadState>>(new Map());
  const previousPad = useRef<PadState | null>(null);
  const lastRemoteGame = useRef<string | null>(null);

  const filtered = useMemo(() => {
    if (category === "All Games") return games;
    return games.filter((game) => game.category === category || game.tags.includes(category));
  }, [category]);

  const safeFocus = Math.min(focus, Math.max(0, filtered.length - 1));
  const focusedGame = filtered[safeFocus] ?? games[0];

  const railStart = Math.max(
    0,
    Math.min(safeFocus - Math.floor(RAIL_WINDOW / 2), Math.max(0, filtered.length - RAIL_WINDOW)),
  );
  const railGames = filtered.slice(railStart, railStart + RAIL_WINDOW);

  const stageGame = useMemo(() => games.find((game) => game.id === stageId) ?? null, [stageId]);
  const hostDevice = room?.devices.find((device) => device.role === "host") ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (room?.session.status !== "ended") return;
    // Timed out of the synchronous effect body so a room ending on the server
    // settles into one clean render instead of a cascade.
    const timer = window.setTimeout(() => {
      saveTicket(null);
      setTicket(null);
      setShowParty(false);
      setPartyError("The party room closed.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room?.session.status]);

  /** The host phone owns the screen: when its pick changes, so does the TV. */
  useEffect(() => {
    const remote = room?.session.gameId ?? null;
    if (remote === lastRemoteGame.current) return;
    lastRemoteGame.current = remote;
    const timer = window.setTimeout(() => {
      if (remote && games.some((game) => game.id === remote)) {
        setStageId(remote);
      } else if (!remote) {
        setStageId(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [room?.session.gameId]);

  /** Same-origin frames receive real key edges; the extension sees every pad. */
  useEffect(() => {
    const frame = stageFrame.current;
    const devices = room?.devices ?? [];
    for (const device of devices) {
      if (!device.input) continue;
      dispatchPadEdges(frame, device.input, previousInputs.current.get(device.deviceId) ?? EMPTY_PAD);
      previousInputs.current.set(device.deviceId, device.input);
    }
    // Release any keys whose pad just left the room.
    for (const [deviceId, previous] of previousInputs.current) {
      if (!devices.some((device) => device.deviceId === deviceId)) {
        dispatchPadEdges(frame, EMPTY_PAD, previous);
        previousInputs.current.delete(deviceId);
      }
    }
    postPartyInputs(devices);
  }, [room?.devices, stageId]);

  useEffect(() => {
    if (stageGame) {
      window.postMessage(
        { type: "si-games-party-game", gameId: stageGame.id, url: stageGame.sourceUrl },
        "*",
      );
    }
  }, [stageGame]);

  const startGame = useCallback(
    (game: Game) => {
      captureLaunchSource(game.id, game.thumbnail, null);
      setStageId(game.id);
      if (ticket) {
        void setPartyGame({
          sessionId: ticket.sessionId,
          gameId: game.id,
          displayToken: ticket.displayToken,
        }).catch(() => undefined);
      }
    },
    [setPartyGame, ticket],
  );

  const closeStage = useCallback(() => {
    setStageId(null);
    previousInputs.current.clear();
    if (ticket) {
      void setPartyGame({
        sessionId: ticket.sessionId,
        gameId: undefined,
        displayToken: ticket.displayToken,
      }).catch(() => undefined);
    }
  }, [setPartyGame, ticket]);

  const openParty = useCallback(async () => {
    setShowParty(true);
    if (ticket) return;
    try {
      const created = await createRoom();
      const next: PartyTicket = {
        sessionId: created.sessionId,
        code: created.code,
        displayToken: created.displayToken,
      };
      saveTicket(next);
      setTicket(next);
      setPartyError("");
    } catch {
      setPartyError("Could not open a party room. Try again.");
    }
  }, [createRoom, ticket]);

  const closeParty = useCallback(() => {
    saveTicket(null);
    setTicket(null);
    setShowParty(false);
    lastRemoteGame.current = null;
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    await document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  const copyLink = useCallback(async () => {
    if (!stageGame) return;
    try {
      await navigator.clipboard.writeText(stageGame.sourceUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [stageGame]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      const key = event.key;

      if (key === "Escape") {
        if (showParty) {
          setShowParty(false);
          return;
        }
        if (stageId) {
          closeStage();
          return;
        }
        navigate("/");
        return;
      }
      if (key.toLowerCase() === "p") {
        event.preventDefault();
        void openParty();
        return;
      }
      if (key.toLowerCase() === "f") {
        event.preventDefault();
        void toggleFullscreen();
        return;
      }
      if (stageId || showParty) return;

      if (key === "ArrowRight") {
        event.preventDefault();
        setFocus((index) => Math.min(filtered.length - 1, index + 1));
      } else if (key === "ArrowLeft") {
        event.preventDefault();
        setFocus((index) => Math.max(0, index - 1));
      } else if (key === "ArrowDown") {
        event.preventDefault();
        setFocus((index) => Math.min(filtered.length - 1, index + 8));
      } else if (key === "ArrowUp") {
        event.preventDefault();
        setFocus((index) => Math.max(0, index - 8));
      } else if (key === "Enter") {
        event.preventDefault();
        if (focusedGame) startGame(focusedGame);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeStage, filtered.length, focusedGame, navigate, openParty, showParty, stageId, startGame, toggleFullscreen]);

  /** Physical pads browse the wall without any extra software. */
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const pad = physicalPad();
      if (pad) {
        const was = previousPad.current;
        if (!showParty && !stageId) {
          if (pad.left && !was?.left) setFocus((index) => Math.max(0, index - 1));
          if (pad.right && !was?.right) setFocus((index) => Math.min(filtered.length - 1, index + 1));
          if (pad.up && !was?.up) setFocus((index) => Math.max(0, index - 8));
          if (pad.down && !was?.down) setFocus((index) => Math.min(filtered.length - 1, index + 8));
          if (pad.a && !was?.a && focusedGame) startGame(focusedGame);
          if (pad.b && !was?.b) navigate("/");
        } else if (pad.b && !was?.b) {
          if (showParty) setShowParty(false);
          else closeStage();
        }
        if (pad.start && !was?.start) void openParty();
        previousPad.current = pad;
      } else {
        previousPad.current = null;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [closeStage, filtered.length, focusedGame, navigate, openParty, showParty, stageId, startGame]);

  const clockLabel = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateLabel = clock.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="bp-page">
      <div className="bp-ambient" aria-hidden="true">
        {focusedGame && <img src={focusedGame.thumbnail} alt="" />}
        <span className="bp-ambient-grid" />
        <span className="bp-ambient-scan" />
      </div>

      <header className="bp-topbar">
        <button type="button" className="bp-brand" onClick={() => navigate("/")} aria-label="Back to the library">
          <span className="bp-brand-mark">SI</span>
          <span className="bp-brand-copy"><b>BIG PICTURE</b><small>COUCH ARCADE // 01</small></span>
        </button>
        <div className="bp-clock"><strong>{clockLabel}</strong><span>{dateLabel}</span></div>
        <div className="bp-top-actions">
          {ticket && (
            <button type="button" className="bp-code-chip" onClick={() => void openParty()}>
              <Smartphone size={14} /> {ticket.code}
            </button>
          )}
          <button type="button" className="bp-icon" onClick={() => void openParty()} aria-label="Phone controllers">
            <Users size={18} />
          </button>
          <button type="button" className="bp-icon" onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen">
            <Maximize2 size={18} />
          </button>
          <button type="button" className="bp-icon" onClick={() => navigate("/")} aria-label="Exit Big Picture">
            <Power size={18} />
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {stageGame ? (
          <motion.main
            key={`stage-${stageGame.id}`}
            className="bp-stage"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bp-stage-bar">
              <button type="button" className="bp-stage-back" onClick={closeStage}>
                <ArrowLeft size={18} /> Back to wall
              </button>
              <div className="bp-stage-title">
                <span className="bp-live-dot" /> NOW PLAYING
                <strong>{stageGame.title}</strong>
              </div>
              <div className="bp-stage-actions">
                <button type="button" className="bp-icon" onClick={() => void copyLink()} aria-label="Copy game link">
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                </button>
                <a className="bp-icon" href={stageGame.sourceUrl} target="_blank" rel="noreferrer" aria-label="Open game in a new tab">
                  <Expand size={17} />
                </a>
                <button type="button" className="bp-icon" onClick={() => void openParty()} aria-label="Phone controllers">
                  <Smartphone size={17} />
                </button>
                <button type="button" className="bp-icon" onClick={() => void toggleFullscreen()} aria-label="Toggle fullscreen">
                  <Maximize2 size={17} />
                </button>
              </div>
            </div>
            <div className="bp-stage-frame">
              <iframe
                ref={stageFrame}
                src={stageGame.sourceUrl}
                title={stageGame.title}
                allow="autoplay; fullscreen; gamepad; clipboard-write"
                allowFullScreen
              />
              <div className="bp-stage-orbit" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="bp-stage-foot">
              <span><Gamepad2 size={14} /> {room ? `${room.devices.length} phone pads linked` : "Press P for phone pads"}</span>
              <span>{hostDevice ? <><Crown size={13} /> {hostDevice.name} is host</> : "Keyboard: arrows to browse, Enter to play"}</span>
              <span className="bp-stage-sign">////SPIDEY_IRAJ////</span>
            </div>
          </motion.main>
        ) : (
          <motion.main
            key="wall"
            className="bp-wall"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {focusedGame && (
              <section className="bp-hero">
                <motion.div
                  key={focusedGame.id}
                  className="bp-hero-art"
                  initial={{ opacity: 0.4, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                >
                  <img src={focusedGame.thumbnail} alt="" />
                  <span className="bp-hero-shade" />
                  <span className="bp-hero-frame" />
                </motion.div>
                <div className="bp-hero-copy">
                  <span className="bp-kicker"><Sparkles size={14} /> BIG PICTURE SELECT</span>
                  <AnimatePresence mode="wait">
                    <motion.h1
                      key={focusedGame.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {focusedGame.title}
                    </motion.h1>
                  </AnimatePresence>
                  <div className="bp-meta">
                    <span>{focusedGame.category}</span>
                    {focusedGame.tags.slice(0, 2).map((tag) => <span key={tag}>{tag}</span>)}
                    <span>{focusedGame.htmlGame ? "HTML BUILD" : "BROWSER READY"}</span>
                  </div>
                  <p>{focusedGame.description}</p>
                  <div className="bp-hero-actions">
                    <button type="button" className="bp-play" onClick={() => startGame(focusedGame)}>
                      <Play size={20} fill="currentColor" /> PLAY NOW
                    </button>
                    <button type="button" className="bp-soft" onClick={() => void openParty()}>
                      <Smartphone size={17} /> {room ? `${room.devices.length}/6 PADS` : "PHONE CONTROLLERS"}
                    </button>
                  </div>
                  <div className="bp-focus-meter">
                    <span style={{ width: `${((safeFocus + 1) / Math.max(1, filtered.length)) * 100}%` }} />
                    <b>{String(safeFocus + 1).padStart(3, "0")}</b>
                    <em>/ {filtered.length}</em>
                  </div>
                </div>
              </section>
            )}

            <nav className="bp-categories" aria-label="Big Picture categories">
              {gameCategories.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={category === item ? "is-active" : ""}
                  onClick={() => {
                    setCategory(item);
                    setFocus(0);
                  }}
                >
                  {item}
                </button>
              ))}
            </nav>

            <section className="bp-rail-wrap" aria-label={`${category} games`}>
              <div className="bp-rail-head">
                <span><Gamepad2 size={14} /> {category === "All Games" ? "THE WHOLE WALL" : category.toUpperCase()}</span>
                <small>ARROWS / D-PAD TO BROWSE · ENTER / A TO PLAY</small>
              </div>
              <div className="bp-rail">
                {railGames.map((game, offset) => {
                  const absolute = railStart + offset;
                  const active = absolute === safeFocus;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      className={`bp-card ${active ? "is-focus" : ""}`}
                      onClick={() => setFocus(absolute)}
                      onDoubleClick={() => startGame(game)}
                      aria-label={`${game.title}${active ? ", selected" : ""}`}
                    >
                      <span className="bp-card-art"><img src={game.thumbnail} alt="" loading="lazy" /></span>
                      <span className="bp-card-copy">
                        <b>{game.title}</b>
                        <small>{game.category}</small>
                      </span>
                      {active && <span className="bp-card-focus" aria-hidden="true"><Play size={18} fill="currentColor" /></span>}
                    </button>
                  );
                })}
              </div>
              <div className="bp-rail-foot">
                <span>{filtered.length} titles</span>
                <span>{railStart + 1}–{Math.min(filtered.length, railStart + RAIL_WINDOW)}</span>
                <span className="bp-rail-hint">P PHONE PADS · F FULLSCREEN · ESC EXIT</span>
              </div>
            </section>

            <section className="bp-quick">
              <div className="bp-quick-card">
                <span className="bp-quick-icon"><Smartphone size={18} /></span>
                <div><b>Phone as controller</b><small>QR pairing, six pads, host chooses the game.</small></div>
                <ArrowRight size={16} />
              </div>
              <div className="bp-quick-card">
                <span className="bp-quick-icon"><Crown size={18} /></span>
                <div><b>One host pad</b><small>The crown phone controls what the TV displays.</small></div>
                <ArrowRight size={16} />
              </div>
              <div className="bp-quick-card">
                <span className="bp-quick-icon"><Expand size={18} /></span>
                <div><b>Own-tab bridge</b><small>Extension keeps pads alive when a site must open itself.</small></div>
                <ArrowRight size={16} />
              </div>
            </section>

            {newGames.length > 0 && (
              <div className="bp-new-strip">
                <span><Sparkles size={13} /> FRESH ON THE SHELF</span>
                {newGames.slice(0, 4).map((game) => (
                  <button key={game.id} type="button" onClick={() => startGame(game)}>{game.title}</button>
                ))}
              </div>
            )}
          </motion.main>
        )}
      </AnimatePresence>

      {showParty && ticket && (
        <PartyLobby
          sessionId={ticket.sessionId}
          code={ticket.code}
          displayToken={ticket.displayToken}
          room={room}
          onClose={() => setShowParty(false)}
          onEnded={closeParty}
        />
      )}
      {showParty && !ticket && (
        <div className="bp-party-loading">
          <Search size={18} className="spin" />
          <span>{partyError || "Opening the couch link…"}</span>
          <button type="button" onClick={() => setShowParty(false)}><X size={15} /> Close</button>
        </div>
      )}
    </div>
  );
}

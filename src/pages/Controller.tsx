import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Loader2,
  Play,
  Search,
  Smartphone,
  Volume2,
  Wifi,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { games, type Game } from "@/data/games";
import {
  EMPTY_PAD,
  physicalPad,
  readDeviceId,
  readPadName,
  savePadName,
  type PadState,
  type PartyRoom,
} from "@/lib/party";

const PAD_BUTTONS = [
  { id: "a", label: "A", className: "pad-a" },
  { id: "b", label: "B", className: "pad-b" },
  { id: "x", label: "X", className: "pad-x" },
  { id: "y", label: "Y", className: "pad-y" },
] as const;

type Direction = "up" | "down" | "left" | "right";

function Thumbstick({ onChange }: { onChange: (x: number, y: number, active: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activeRef = useRef(false);

  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node || !activeRef.current) return;
    const rect = node.getBoundingClientRect();
    const radius = rect.width / 2;
    let x = (event.clientX - rect.left - radius) / radius;
    let y = (event.clientY - rect.top - radius) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    setKnob({ x: x * radius * 0.55, y: y * radius * 0.55 });
    onChange(x, y, true);
  };

  const end = () => {
    activeRef.current = false;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0, false);
  };

  return (
    <div
      ref={ref}
      className="pad-stick"
      role="application"
      aria-label="Movement joystick"
      onPointerDown={(event) => {
        activeRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onPointerLeave={end}
    >
      <span className="pad-stick-ring" />
      <span className="pad-stick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      <span className="pad-stick-cross" aria-hidden="true" />
    </div>
  );
}

export default function Controller() {
  const params = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const joinRoom = useMutation(api.party.join);
  const leaveRoom = useMutation(api.party.leave);
  const heartbeat = useMutation(api.party.heartbeat);
  const sendInput = useMutation(api.party.sendInput);
  const setGame = useMutation(api.party.setGame);

  const initialCode = (params.code || searchParams.get("code") || "").toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(() => readPadName());
  const [sessionId, setSessionId] = useState<Id<"partySessions"> | null>(null);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [pad, setPad] = useState<PadState>(EMPTY_PAD);
  const [showPicker, setShowPicker] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [padConnected, setPadConnected] = useState(false);

  const deviceId = useMemo(() => readDeviceId(), []);
  const roomQuery = useQuery(api.party.byCode, sessionId ? { code } : "skip");
  const room = (roomQuery ?? null) as PartyRoom | null;
  const me = room?.devices.find((device) => device.deviceId === deviceId) ?? null;
  const isHost = me?.role === "host";
  const displayedGame = room?.session.gameId ? games.find((game) => game.id === room.session.gameId) : null;

  const padRef = useRef<PadState>(EMPTY_PAD);
  const flushTimer = useRef<number | null>(null);
  const physicalRef = useRef("");

  const queuePad = useCallback(
    (partial: Partial<PadState>) => {
      const next: PadState = { ...padRef.current, ...partial, seq: padRef.current.seq + 1 };
      padRef.current = next;
      setPad(next);
      if (!sessionId) return;
      if (flushTimer.current === null) {
        flushTimer.current = window.setTimeout(() => {
          flushTimer.current = null;
          void sendInput({ sessionId, deviceId, input: padRef.current }).catch(() => undefined);
        }, 55);
      }
    },
    [deviceId, sendInput, sessionId],
  );

  const setDirection = (direction: Direction, pressed: boolean) => {
    queuePad({ [direction]: pressed } as Partial<PadState>);
    if (pressed) navigator.vibrate?.(8);
  };

  const setPadButton = (id: "a" | "b" | "x" | "y" | "start" | "select", pressed: boolean) => {
    queuePad({ [id]: pressed } as Partial<PadState>);
    if (pressed) navigator.vibrate?.(12);
  };

  const join = async () => {
    if (!code.trim() || !name.trim()) {
      setError("Enter the room code and a pad name.");
      return;
    }
    setJoining(true);
    setError("");
    try {
      const result = await joinRoom({ code: code.trim().toUpperCase(), deviceId, name: name.trim() });
      savePadName(name.trim());
      setSessionId(result.sessionId);
      setCode(result.code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join that room.");
    } finally {
      setJoining(false);
    }
  };

  const leave = async () => {
    if (sessionId) await leaveRoom({ sessionId, deviceId }).catch(() => undefined);
    setSessionId(null);
    setPad(EMPTY_PAD);
    padRef.current = EMPTY_PAD;
  };

  const chooseGame = async (game: Game) => {
    if (!sessionId) return;
    await setGame({ sessionId, gameId: game.id, deviceId }).catch(() => undefined);
    setShowPicker(false);
    setPickerQuery("");
  };

  const stopGame = async () => {
    if (!sessionId) return;
    await setGame({ sessionId, gameId: undefined, deviceId }).catch(() => undefined);
  };

  useEffect(() => {
    if (!sessionId) return;
    const timer = window.setInterval(() => {
      void heartbeat({ sessionId, deviceId }).catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [deviceId, heartbeat, sessionId]);

  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    if (sessionId && "wakeLock" in navigator) {
      navigator.wakeLock
        .request("screen")
        .then((next) => {
          lock = next;
        })
        .catch(() => undefined);
    }
    return () => {
      void lock?.release().catch(() => undefined);
    };
  }, [sessionId]);

  /** Physical Xbox / PlayStation pads publish the same snapshots. */
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const next = physicalPad();
      setPadConnected(Boolean(next));
      if (next) {
        const signature = JSON.stringify({
          u: next.up, d: next.down, l: next.left, r: next.right,
          a: next.a, b: next.b, x: next.x, y: next.y,
          s: next.start, se: next.select,
          x0: Math.round(next.stickX * 10), y0: Math.round(next.stickY * 10),
        });
        if (signature !== physicalRef.current) {
          physicalRef.current = signature;
          queuePad(next);
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [queuePad]);

  useEffect(() => {
    return () => {
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    };
  }, []);

  const filteredGames = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    if (!query) return games.slice(0, 60);
    return games
      .filter((game) => game.title.toLowerCase().includes(query) || game.category.toLowerCase().includes(query))
      .slice(0, 60);
  }, [pickerQuery]);

  if (sessionId && room?.session.status === "ended") {
    return (
      <div className="controller-page controller-lobby">
        <div className="controller-noise" aria-hidden="true" />
        <main className="controller-lobby-main">
          <div className="controller-lobby-icon"><X size={28} /></div>
          <span className="section-kicker"><Gamepad2 size={14} /> ROOM CLOSED</span>
          <h1>The couch logged off.</h1>
          <p>The Big Picture display ended this room. Scan a fresh QR code to reconnect.</p>
          <button
            type="button"
            className="controller-join"
            onClick={() => {
              setSessionId(null);
              setPad(EMPTY_PAD);
              padRef.current = EMPTY_PAD;
            }}
          >
            <ArrowLeft size={18} /> BACK TO CODE
          </button>
        </main>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="controller-page controller-lobby">
        <div className="controller-noise" aria-hidden="true" />
        <header className="controller-lobby-head">
          <button type="button" className="controller-back" onClick={() => navigate("/bigpicture")}>
            <ArrowLeft size={16} /> Big Picture
          </button>
          <span className="controller-brand"><span>SI</span> PAD LINK</span>
        </header>
        <main className="controller-lobby-main">
          <div className="controller-lobby-icon"><Smartphone size={30} /></div>
          <span className="section-kicker"><Gamepad2 size={14} /> PHONE CONTROLLER</span>
          <h1>Join the couch.</h1>
          <p>Enter the room code from the big screen, choose a pad name, and your phone becomes a controller. The first pad in is the host.</p>
          <form
            className="controller-form"
            onSubmit={(event) => {
              event.preventDefault();
              void join();
            }}
          >
            <label>
              <span>ROOM CODE</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
                placeholder="ABCDE"
                autoCapitalize="characters"
                autoComplete="off"
                inputMode="text"
                maxLength={5}
              />
            </label>
            <label>
              <span>PAD NAME</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 18))}
                placeholder="Your name"
                autoComplete="off"
                maxLength={18}
              />
            </label>
            {error && <p className="controller-error">{error}</p>}
            <button type="submit" className="controller-join" disabled={joining}>
              {joining ? <Loader2 size={18} className="spin" /> : <Wifi size={18} />}
              {joining ? "LINKING…" : "CONNECT PAD"}
            </button>
          </form>
          <p className="controller-lobby-hint"><Crown size={13} /> The host pad can swap the game on the TV at any time.</p>
        </main>
        <footer className="controller-lobby-foot">////SPIDEY_IRAJ//// · SIX PADS · ONE SCREEN</footer>
      </div>
    );
  }

  const connected = room?.devices.length ?? 0;

  return (
    <div className="controller-page controller-live">
      <div className="controller-noise" aria-hidden="true" />
      <header className="controller-top">
        <button type="button" className="controller-back" onClick={() => void leave()}>
          <ArrowLeft size={15} /> Leave
        </button>
        <span className="controller-brand"><span>SI</span> PAD</span>
        <div className="controller-top-meta">
          <span className={`controller-role ${isHost ? "is-host" : ""}`}>{isHost ? <Crown size={12} /> : <Gamepad2 size={12} />}{isHost ? "HOST" : "PLAYER"}</span>
          <span className="controller-count">{connected}/6</span>
          <span className={`controller-signal ${padConnected ? "is-pad" : ""}`}><Wifi size={12} /> {padConnected ? "PAD" : "LIVE"}</span>
        </div>
      </header>

      <main className="controller-live-main">
        <section className={`controller-now ${displayedGame ? "has-game" : ""}`}>
          {displayedGame ? (
            <>
              <img src={displayedGame.thumbnail} alt="" />
              <div>
                <span className="controller-now-kicker"><Play size={12} fill="currentColor" /> ON THE BIG SCREEN</span>
                <h2>{displayedGame.title}</h2>
                <p>{isHost ? "You choose what plays. Swap it any time." : `${room?.devices.find((device) => device.role === "host")?.name ?? "The host"} runs the screen.`}</p>
              </div>
            </>
          ) : (
            <div>
              <span className="controller-now-kicker"><Gamepad2 size={12} /> PADS READY</span>
              <h2>{isHost ? "Pick the first game." : "Waiting for the host."}</h2>
              <p>{isHost ? "Your phone controls the TV. Open the game shelf below." : "The crown pad chooses what everyone plays."}</p>
            </div>
          )}
          {isHost && (
            <div className="controller-now-actions">
              <button type="button" className="controller-pick" onClick={() => setShowPicker(true)}>
                <Search size={15} /> {displayedGame ? "CHANGE GAME" : "CHOOSE GAME"}
              </button>
              {displayedGame && <button type="button" className="controller-stop" onClick={() => void stopGame()}>STOP</button>}
            </div>
          )}
        </section>

        <section className={`controller-deck ${padConnected ? "is-physical" : ""}`} aria-label="Game controller">
          <div className="controller-deck-head">
            <span><Gamepad2 size={13} /> LIVE PAD</span>
            <span>{isHost ? "HOST CONTROLLER" : "PLAYER CONTROLLER"}</span>
          </div>

          <div className="controller-controls">
            <div className="controller-left">
              <div className="controller-dpad" aria-label="Direction pad">
                <button
                  type="button"
                  className="dpad-up"
                  onPointerDown={() => setDirection("up", true)}
                  onPointerUp={() => setDirection("up", false)}
                  onPointerLeave={() => setDirection("up", false)}
                  onPointerCancel={() => setDirection("up", false)}
                  aria-label="Up"
                />
                <button
                  type="button"
                  className="dpad-left"
                  onPointerDown={() => setDirection("left", true)}
                  onPointerUp={() => setDirection("left", false)}
                  onPointerLeave={() => setDirection("left", false)}
                  onPointerCancel={() => setDirection("left", false)}
                  aria-label="Left"
                />
                <button
                  type="button"
                  className="dpad-right"
                  onPointerDown={() => setDirection("right", true)}
                  onPointerUp={() => setDirection("right", false)}
                  onPointerLeave={() => setDirection("right", false)}
                  onPointerCancel={() => setDirection("right", false)}
                  aria-label="Right"
                />
                <button
                  type="button"
                  className="dpad-down"
                  onPointerDown={() => setDirection("down", true)}
                  onPointerUp={() => setDirection("down", false)}
                  onPointerLeave={() => setDirection("down", false)}
                  onPointerCancel={() => setDirection("down", false)}
                  aria-label="Down"
                />
                <span className="dpad-center" />
              </div>
              <Thumbstick
                onChange={(x, y) => queuePad({ stickX: x, stickY: y })}
              />
            </div>

            <div className="controller-right">
              <div className="controller-face">
                {PAD_BUTTONS.map((button) => (
                  <button
                    key={button.id}
                    type="button"
                    className={`face-button ${button.className} ${pad[button.id] ? "is-down" : ""}`}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setPadButton(button.id, true);
                    }}
                    onPointerUp={() => setPadButton(button.id, false)}
                    onPointerLeave={() => setPadButton(button.id, false)}
                    onPointerCancel={() => setPadButton(button.id, false)}
                    aria-label={`Button ${button.label}`}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="controller-system">
            <button
              type="button"
              className={`system-button ${pad.select ? "is-down" : ""}`}
              onPointerDown={() => setPadButton("select", true)}
              onPointerUp={() => setPadButton("select", false)}
              onPointerLeave={() => setPadButton("select", false)}
              onPointerCancel={() => setPadButton("select", false)}
            >
              SELECT
            </button>
            <span className="controller-center-line"><i /><i /></span>
            <button
              type="button"
              className={`system-button ${pad.start ? "is-down" : ""}`}
              onPointerDown={() => setPadButton("start", true)}
              onPointerUp={() => setPadButton("start", false)}
              onPointerLeave={() => setPadButton("start", false)}
              onPointerCancel={() => setPadButton("start", false)}
            >
              START
            </button>
          </div>

          <div className="controller-foot">
            <button type="button" onClick={() => setShowHelp(true)}><Volume2 size={13} /> Controls</button>
            <span>ARROWS · WASD · SPACE · X</span>
            <button type="button" onClick={() => void leave()}><X size={13} /> Disconnect</button>
          </div>
        </section>

        {!isHost && (
          <p className="controller-wait"><Crown size={13} /> Host picks the game. Your pad is connected.</p>
        )}
      </main>

      {showPicker && (
        <div className="controller-sheet" role="dialog" aria-modal="true" aria-label="Choose a game">
          <div className="controller-sheet-card">
            <div className="controller-sheet-head">
              <div><span className="section-kicker"><Search size={13} /> HOST PICK</span><h2>What plays next?</h2></div>
              <button type="button" onClick={() => setShowPicker(false)} aria-label="Close game picker"><X size={18} /></button>
            </div>
            <label className="controller-search">
              <Search size={16} />
              <input value={pickerQuery} onChange={(event) => setPickerQuery(event.target.value)} placeholder="Search 1,100+ games" autoFocus />
            </label>
            <div className="controller-game-list">
              {filteredGames.map((game) => (
                <button key={game.id} type="button" onClick={() => void chooseGame(game)}>
                  <img src={game.thumbnail} alt="" loading="lazy" />
                  <span><b>{game.title}</b><small>{game.category}{game.htmlGame ? " · HTML" : ""}</small></span>
                  <ChevronRight size={16} />
                </button>
              ))}
              {filteredGames.length === 0 && <p className="controller-empty">No games match that search.</p>}
            </div>
            <p className="controller-sheet-note">The TV switches instantly. Everyone&apos;s pads stay connected.</p>
          </div>
        </div>
      )}

      {showHelp && (
        <div className="controller-sheet" role="dialog" aria-modal="true" aria-label="Controls">
          <div className="controller-sheet-card controller-help">
            <div className="controller-sheet-head">
              <div><span className="section-kicker"><Gamepad2 size={13} /> PAD MAP</span><h2>Controls</h2></div>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="Close controls"><X size={18} /></button>
            </div>
            <ul>
              <li><b>D-pad / stick</b><span>Move — arrows and WASD</span></li>
              <li><b>A</b><span>Jump / confirm — Space</span></li>
              <li><b>B</b><span>Action — X</span></li>
              <li><b>X</b><span>Use / interact — E</span></li>
              <li><b>Y</b><span>Special — F</span></li>
              <li><b>Start / Select</b><span>Enter / C</span></li>
            </ul>
            <p className="controller-sheet-note">For same-page games the TV injects these keys. For games that open their own tab, install the SI GAMES extension bridge.</p>
          </div>
        </div>
      )}
    </div>
  );
}

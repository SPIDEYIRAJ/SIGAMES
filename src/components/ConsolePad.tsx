import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { padSchemeFor, type PadButton } from "@/lib/control-scheme";
import {
  clickGameMouse,
  focusGame,
  gameInputReady,
  isMouseCode,
  mouseButton,
  moveGameMouse,
  pressGameKey,
  releaseAllGameKeys,
  releaseGameKey,
} from "@/lib/game-input";

interface ConsolePadProps {
  gameId: string;
  gameCategory: string;
  gameControls?: string;
  frameRef: RefObject<HTMLElement | null>;
}

interface StickProps {
  label: string;
  variant: "move" | "look";
  onChange: (x: number, y: number) => void;
}

/** One thumb stick. Keeps its own pointer capture so movement never sticks. */
function Stick({ label, variant, onChange }: StickProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0, offset: 38 });

  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const radius = rect.width / 2;
    let dx = (event.clientX - (rect.left + radius)) / radius;
    let dy = (event.clientY - (rect.top + radius)) / radius;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    setKnob({ x: dx, y: dy, offset: Math.max(18, radius * 0.52) });
    onChange(dx, dy);
  };

  const end = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event && activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setKnob((current) => ({ ...current, x: 0, y: 0 }));
    onChange(0, 0);
  };

  return (
    <div className={`pad-stick pad-stick--${variant}`}>
      <div
        ref={surfaceRef}
        className="pad-stick-surface"
        onPointerDown={(event) => {
          if (activePointer.current !== null) return;
          event.preventDefault();
          activePointer.current = event.pointerId;
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            // Older webviews can refuse capture; plain pointer events still work.
          }
          update(event);
        }}
        onPointerMove={(event) => {
          if (activePointer.current !== event.pointerId) return;
          update(event);
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
        role="application"
        aria-label={`${label} stick`}
      >
        <span className="pad-stick-axis" aria-hidden="true" />
        <span
          className="pad-stick-knob"
          style={{ transform: `translate(calc(-50% + ${(knob.x * knob.offset).toFixed(1)}px), calc(-50% + ${(knob.y * knob.offset).toFixed(1)}px))` }}
        />
      </div>
      <em>{label}</em>
    </div>
  );
}

/**
 * Console-mode controller deck.
 *
 * Sends real key and mouse events into the game frame: movement/look sticks,
 * four face buttons, two shoulder buttons and start. Same-origin builds receive
 * them directly; a cross-origin host is reported instead of pretending.
 */
export default function ConsolePad({ gameId, gameCategory, gameControls, frameRef }: ConsolePadProps) {
  const scheme = useMemo(
    () => padSchemeFor({ id: gameId, category: gameCategory, controls: gameControls }),
    [gameId, gameCategory, gameControls]
  );
  const [linked, setLinked] = useState(false);
  const cursor = useRef({ x: 0.5, y: 0.5 });
  const directions = useRef({ up: false, down: false, left: false, right: false });

  const iframe = useCallback(
    () => (frameRef.current?.querySelector("iframe") ?? null) as HTMLIFrameElement | null,
    [frameRef]
  );

  const moveKeys = useMemo(
    () =>
      scheme.move === "wasd"
        ? { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" }
        : { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" },
    [scheme.move]
  );

  /** Check whether the browser lets this frame accept injected input. */
  useEffect(() => {
    const check = () => setLinked(gameInputReady(iframe()));
    check();
    const timer = window.setInterval(check, 1600);
    window.addEventListener("si-games-game-loaded", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("si-games-game-loaded", check);
    };
  }, [iframe]);

  /** Never leave a key down when the deck closes or the tab loses focus. */
  useEffect(() => {
    const release = () => {
      releaseAllGameKeys(iframe());
      directions.current = { up: false, down: false, left: false, right: false };
    };
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("blur", release);
      releaseAllGameKeys(iframe());
    };
  }, [iframe]);

  const setDirection = (direction: keyof typeof directions.current, active: boolean) => {
    if (directions.current[direction] === active) return;
    directions.current[direction] = active;
    const code = moveKeys[direction];
    if (active) pressGameKey(iframe(), code);
    else releaseGameKey(iframe(), code);
  };

  const handleMove = (x: number, y: number) => {
    setDirection("left", x < -0.32);
    setDirection("right", x > 0.32);
    setDirection("up", y < -0.32);
    setDirection("down", y > 0.32);
  };

  const handleLook = (x: number, y: number) => {
    if (!x && !y) return;
    const speed = 0.016;
    cursor.current.x = Math.min(1, Math.max(0, cursor.current.x + x * speed));
    cursor.current.y = Math.min(1, Math.max(0, cursor.current.y + y * speed));
    moveGameMouse(iframe(), cursor.current.x, cursor.current.y, x * 14, y * 14);
  };

  const pressButton = (button: PadButton) => {
    if (isMouseCode(button.code)) {
      clickGameMouse(iframe(), cursor.current.x, cursor.current.y, mouseButton(button.code));
      return;
    }
    pressGameKey(iframe(), button.code);
  };

  const releaseButton = (button: PadButton) => {
    if (isMouseCode(button.code)) return;
    releaseGameKey(iframe(), button.code);
  };

  const press = (event: ReactPointerEvent<HTMLButtonElement>, button: PadButton) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only a convenience for release-outside; the press still lands.
    }
    focusGame(iframe());
    pressButton(button);
  };

  const release = (button: PadButton) => {
    releaseButton(button);
  };

  return (
    <div className="console-deck-pad">
      <span
        className={`pad-link ${linked ? "is-linked" : "is-blocked"}`}
        role="status"
        title={linked ? "The deck is delivering real keys and mouse input to this game." : "This game runs on another origin. Browsers block synthetic input across origins; open it in its own tab for the deck-free experience."}
      >
        <i /> {linked ? "INPUT LINKED" : "HOST BLOCKS INJECTED INPUT"}
      </span>

      <Stick label="MOVE" variant="move" onChange={handleMove} />

      {scheme.look && <Stick label="LOOK" variant="look" onChange={handleLook} />}

      <div className="pad-center">
        <div className="pad-shoulders">
          {scheme.triggers.map((trigger) => (
            <button
              key={trigger.id}
              type="button"
              className={`pad-shoulder pad-shoulder--${trigger.id}`}
              onPointerDown={(event) => press(event, trigger)}
              onPointerUp={() => release(trigger)}
              onPointerLeave={() => release(trigger)}
              onPointerCancel={() => release(trigger)}
              onContextMenu={(event) => event.preventDefault()}
            >
              <b>{trigger.label}</b>
              <small>{trigger.detail}</small>
            </button>
          ))}
        </div>

        <div className="pad-face" role="group" aria-label="Action buttons">
          {scheme.face.map((button) => (
            <button
              key={button.id}
              type="button"
              className={`pad-face-btn pad-face-btn--${button.id}`}
              onPointerDown={(event) => press(event, button)}
              onPointerUp={() => release(button)}
              onPointerLeave={() => release(button)}
              onPointerCancel={() => release(button)}
              onContextMenu={(event) => event.preventDefault()}
              aria-label={`${button.label}: ${button.detail}`}
            >
              <b>{button.label}</b>
              <small>{button.detail}</small>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="pad-start"
          onPointerDown={(event) => press(event, { id: "a", label: "START", detail: "Pause", code: scheme.start.code })}
          onPointerUp={() => releaseGameKey(iframe(), scheme.start.code)}
          onPointerLeave={() => releaseGameKey(iframe(), scheme.start.code)}
          onPointerCancel={() => releaseGameKey(iframe(), scheme.start.code)}
        >
          <i /> {scheme.start.label}
        </button>
      </div>
    </div>
  );
}

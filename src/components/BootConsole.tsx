import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Gamepad2, Loader2, Power, Signal } from "lucide-react";
import type { LaunchSource } from "@/lib/launch";

/** The card needs a beat on screen before it is swallowed by the TV. */
const FLIGHT_MS = 780;
/** How long the loaded game stays visible in the TV before the zoom. */
const TV_LIVE_MS = 500;
/** Chrome fade before the FLIP takes over. */
const LEAVE_MS = 280;
/** Never hold the player hostage on a host that will not answer. */
const GIVE_UP_MS = 15000;

export interface BootBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Measures the TV screen for the current viewport. The player's frame is pinned
 * to this box while booting, so the console chrome and the real iframe always
 * agree on where the screen is.
 */
export function measureBootBox(): BootBox {
  const width = Math.min(window.innerWidth - 48, 880, window.innerHeight * 0.62 * (16 / 9));
  const height = width * (9 / 16);
  return {
    width,
    height,
    left: (window.innerWidth - width) / 2,
    top: Math.max(64, (window.innerHeight - height) / 2 - 14),
  };
}

/**
 * The launch theatre: the clicked game card flies into a cartridge slot, the
 * console powers a CRT on, and the actual game iframe (already mounted and
 * loading underneath this overlay) is revealed for half a second before the
 * player page zooms in around it.
 */
export default function BootConsole({
  title,
  image,
  box,
  source,
  ready,
  onFinish,
}: {
  title: string;
  image: string;
  box: BootBox;
  source: LaunchSource | null;
  ready: boolean;
  onFinish: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);
  const finished = useRef(false);
  const [phase, setPhase] = useState<"loading" | "live" | "leaving">("loading");
  const [flying, setFlying] = useState(false);

  /** Start the card at its old spot, then let CSS transition it into the TV. */
  useEffect(() => {
    startedAt.current = performance.now();
    const frame = window.requestAnimationFrame(() => setFlying(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  /** Wait for the iframe *and* the card-flight beat before showing the game. */
  useEffect(() => {
    if (!ready || phase !== "loading") return;
    const elapsed = performance.now() - startedAt.current;
    const wait = Math.max(0, FLIGHT_MS + 700 - elapsed);
    const timer = window.setTimeout(() => setPhase("live"), wait);
    return () => window.clearTimeout(timer);
  }, [ready, phase]);

  useEffect(() => {
    if (phase !== "live") return;
    const timer = window.setTimeout(() => setPhase("leaving"), TV_LIVE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onFinish();
    }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [phase, onFinish]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      onFinish();
    }, GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  // Clamp the launch point so a card clicked far down the shelf still starts
  // inside the viewport instead of flying in from off-screen.
  const start = source
    ? {
        left: Math.min(Math.max(source.rect.left, 10), window.innerWidth - 70),
        top: Math.min(Math.max(source.rect.top, 10), window.innerHeight - 70),
        width: source.rect.width,
        height: source.rect.height,
      }
    : { left: box.left + box.width / 2 - 150, top: box.top + box.height / 2 - 95, width: 300, height: 190 };

  const scaleX = Math.max(0.2, start.width / box.width);
  const scaleY = Math.max(0.2, start.height / box.height);
  const dx = start.left - box.left;
  const dy = start.top - box.top;

  const cardStyle: CSSProperties = {
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    transform: flying ? "translate(0px, 0px) scale(1, 1)" : `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`,
  };

  return (
    <div className={`boot-console ${phase === "live" ? "is-live" : ""} ${phase === "leaving" ? "is-leaving" : ""}`}>
      <div className="boot-room" aria-hidden="true">
        <span className="boot-room-grid" />
        <span className="boot-room-glow" />
        <span className="boot-room-tvlight" style={{ left: box.left, top: box.top, width: box.width, height: box.height }} />
      </div>

      <div className="boot-tv-chrome" aria-hidden="true" style={{ left: box.left - 18, top: box.top - 18, width: box.width + 36, height: box.height + 36 }}>
        <span className="boot-tv-bezel" />
        <span className="boot-tv-notch" />
        <span className="boot-tv-led" />
        <span className="boot-tv-brand">SI · CRT 01</span>
      </div>

      <div className="boot-deck" aria-hidden="true" style={{ left: box.left - 26, top: box.top + box.height + 18, width: box.width + 52 }}>
        <span className="boot-deck-slot" />
        <span className="boot-deck-stripe" />
        <span className="boot-deck-power"><Power size={13} /> SI GAMES</span>
        <span className="boot-deck-dials"><i /><i /><i /></span>
      </div>

      <div
        ref={cardRef}
        className={`boot-card ${flying ? "is-flying" : ""}`}
        style={cardStyle}
        aria-hidden="true"
      >
        <img src={image} alt="" />
        <span className="boot-card-shade" />
        <span className="boot-scanlines" />
        <span className="boot-card-tag">
          <Gamepad2 size={13} /> CARTRIDGE · {title}
        </span>
        {phase === "loading" && (
          <span className="boot-card-loading">
            <Loader2 size={22} className="spin" />
            <b>{flying ? "SIGNAL HANDSHAKE" : "INSERTING CARTRIDGE"}</b>
            <small><Signal size={11} /> {ready ? "SIGNAL LOCKED — WARMING THE TUBE" : "POWERING THE TUBE"}</small>
          </span>
        )}
      </div>

      <p className="boot-live-label" role="status" aria-live="polite">
        {phase === "live" ? `${title} is live in the TV` : `Loading ${title}`}
      </p>
    </div>
  );
}

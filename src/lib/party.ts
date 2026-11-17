/**
 * Shared couch-play plumbing: pad snapshots, keyboard translation, and the
 * tiny bridge that lets the browser extension drive a game opened in its own
 * tab.
 */

export interface PadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  a: boolean;
  b: boolean;
  x: boolean;
  y: boolean;
  start: boolean;
  select: boolean;
  stickX: number;
  stickY: number;
  seq: number;
}

export interface PartyDevice {
  id: string;
  deviceId: string;
  name: string;
  role: "host" | "player";
  joinedAt: number;
  lastSeen: number;
  input: PadState | null;
}

export interface PartyRoom {
  session: {
    id: string;
    code: string;
    status: "lobby" | "live" | "ended";
    gameId: string | null;
    hostDeviceId: string | null;
    createdAt: number;
  };
  devices: PartyDevice[];
}

export const EMPTY_PAD: PadState = {
  up: false,
  down: false,
  left: false,
  right: false,
  a: false,
  b: false,
  x: false,
  y: false,
  start: false,
  select: false,
  stickX: 0,
  stickY: 0,
  seq: 0,
};

export function readDeviceId(): string {
  try {
    const saved = localStorage.getItem("si-games-device-id");
    if (saved) return saved;
    const next = `dev-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    localStorage.setItem("si-games-device-id", next);
    return next;
  } catch {
    return `dev-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function readPadName(): string {
  try {
    return localStorage.getItem("si-games-pad-name") ?? "";
  } catch {
    return "";
  }
}

export function savePadName(name: string): void {
  try {
    localStorage.setItem("si-games-pad-name", name.slice(0, 18));
  } catch {
    // Private mode: the name stays in component state.
  }
}

/** A phone-shaped joystick maps to the same directions as the D-pad. */
export function stickToDirections(stickX: number, stickY: number): Pick<PadState, "up" | "down" | "left" | "right"> {
  const dead = 0.32;
  return {
    up: stickY < -dead,
    down: stickY > dead,
    left: stickX < -dead,
    right: stickX > dead,
  };
}

/** Every key a pad snapshot represents, in a stable order. */
export function padToKeys(pad: PadState): string[] {
  const keys: string[] = [];
  if (pad.up) keys.push("ArrowUp", "KeyW");
  if (pad.down) keys.push("ArrowDown", "KeyS");
  if (pad.left) keys.push("ArrowLeft", "KeyA");
  if (pad.right) keys.push("ArrowRight", "KeyD");
  if (pad.a) keys.push("Space");
  if (pad.b) keys.push("KeyX");
  if (pad.x) keys.push("KeyE");
  if (pad.y) keys.push("KeyF");
  if (pad.start) keys.push("Enter");
  if (pad.select) keys.push("KeyC");

  const dirs = stickToDirections(pad.stickX, pad.stickY);
  if (dirs.up) keys.push("ArrowUp", "KeyW");
  if (dirs.down) keys.push("ArrowDown", "KeyS");
  if (dirs.left) keys.push("ArrowLeft", "KeyA");
  if (dirs.right) keys.push("ArrowRight", "KeyD");
  return Array.from(new Set(keys));
}

const KEY_VALUES: Record<string, string> = {
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Space: " ",
  Enter: "Enter",
  KeyW: "w",
  KeyA: "a",
  KeyS: "s",
  KeyD: "d",
  KeyX: "x",
  KeyE: "e",
  KeyF: "f",
  KeyC: "c",
};

function keyEvent(type: "keydown" | "keyup", code: string): KeyboardEvent {
  return new KeyboardEvent(type, {
    key: KEY_VALUES[code] ?? code,
    code,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
}

/**
 * Sends only the edge transitions into a same-origin frame. Cross-origin
 * frames cannot be scripted by the browser; the extension bridge handles
 * those when it is installed.
 */
export function dispatchPadEdges(
  frame: HTMLIFrameElement | null,
  next: PadState,
  previous: PadState,
): void {
  if (!frame) return;
  const before = new Set(padToKeys(previous));
  const after = new Set(padToKeys(next));
  if (before.size === after.size && [...after].every((key) => before.has(key))) return;

  try {
    const win = frame.contentWindow;
    const doc = frame.contentDocument;
    if (!win || !doc) return;
    frame.focus({ preventScroll: true });
    win.focus();
    for (const code of after) {
      if (!before.has(code)) {
        doc.dispatchEvent(keyEvent("keydown", code));
        win.dispatchEvent(keyEvent("keydown", code));
      }
    }
    for (const code of before) {
      if (!after.has(code)) {
        doc.dispatchEvent(keyEvent("keyup", code));
        win.dispatchEvent(keyEvent("keyup", code));
      }
    }
  } catch {
    // Cross-origin: nothing to inject. The extension is the only route there.
  }
}

/** Latest pad from a physical controller, or null when none is connected. */
export function physicalPad(index = 0): PadState | null {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return null;
  const gamepad = navigator.getGamepads()[index];
  if (!gamepad) return null;
  const button = (slot: number) => Boolean(gamepad.buttons[slot]?.pressed);
  const axisX = gamepad.axes[0] ?? 0;
  const axisY = gamepad.axes[1] ?? 0;
  return {
    up: button(12) || axisY < -0.4,
    down: button(13) || axisY > 0.4,
    left: button(14) || axisX < -0.4,
    right: button(15) || axisX > 0.4,
    a: button(0),
    b: button(1),
    x: button(2),
    y: button(3),
    start: button(9),
    select: button(8),
    stickX: Math.abs(axisX) > 0.22 ? axisX : 0,
    stickY: Math.abs(axisY) > 0.22 ? axisY : 0,
    seq: 0,
  };
}

/** True when at least one physical controller is connected. */
export function hasPhysicalPad(): boolean {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return false;
  return Array.from(navigator.getGamepads()).some(Boolean);
}

/**
 * Broadcasts the latest pad snapshots to the SI GAMES extension content
 * script. It is inert when the extension is not installed.
 */
export function postPartyInputs(devices: PartyDevice[]): void {
  if (typeof window === "undefined") return;
  window.postMessage(
    {
      type: "si-games-party-inputs",
      devices: devices.map((device) => ({
        name: device.name,
        role: device.role,
        input: device.input,
      })),
    },
    "*",
  );
}

export function joinUrlFor(code: string): string {
  return `${window.location.origin}/controller?code=${encodeURIComponent(code)}`;
}

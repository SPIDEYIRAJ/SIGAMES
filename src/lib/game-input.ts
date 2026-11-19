/**
 * Direct game input for console mode.
 *
 * The deck sends real KeyboardEvent / MouseEvent objects into the game's own
 * document. Same-origin builds (local HTML games and fetched builds rendered
 * as srcDoc) accept them exactly like a physical keyboard. For a cross-origin
 * frame the browser does not allow that; the helpers then post a message the
 * page could opt into, and `gameInputReady` reports the limitation honestly.
 */

export interface KeySpec {
  key: string;
  keyCode: number;
}

const RAW_KEYS: Array<[string, string, number]> = [
  ["KeyW", "w", 87], ["KeyA", "a", 65], ["KeyS", "s", 83], ["KeyD", "d", 68],
  ["KeyE", "e", 69], ["KeyF", "f", 70], ["KeyG", "g", 71], ["KeyH", "h", 72],
  ["KeyQ", "q", 81], ["KeyR", "r", 82], ["KeyT", "t", 84], ["KeyX", "x", 88],
  ["KeyC", "c", 67], ["KeyV", "v", 86], ["KeyZ", "z", 90], ["KeyB", "b", 66],
  ["KeyI", "i", 73], ["KeyJ", "j", 74], ["KeyK", "k", 75], ["KeyL", "l", 76],
  ["KeyM", "m", 77], ["KeyN", "n", 78], ["KeyO", "o", 79], ["KeyP", "p", 80],
  ["KeyU", "u", 85], ["KeyY", "y", 89],
  ["ArrowUp", "ArrowUp", 38], ["ArrowDown", "ArrowDown", 40],
  ["ArrowLeft", "ArrowLeft", 37], ["ArrowRight", "ArrowRight", 39],
  ["Space", " ", 32], ["Enter", "Enter", 13], ["Escape", "Escape", 27],
  ["Tab", "Tab", 9], ["Backspace", "Backspace", 8],
  ["ShiftLeft", "Shift", 16], ["ControlLeft", "Control", 17],
  ["AltLeft", "Alt", 18],
];

const KEY_TABLE = new Map<string, KeySpec>(
  RAW_KEYS.map(([code, key, keyCode]) => [code, { key, keyCode }])
);

export function keySpec(code: string): KeySpec {
  return KEY_TABLE.get(code) ?? { key: code.replace(/^Key/, "").toLowerCase(), keyCode: 0 };
}

/** The game document when the frame is same-origin, otherwise null. */
export function gameDocument(iframe: HTMLIFrameElement | null): Document | null {
  if (!iframe) return null;
  try {
    return iframe.contentDocument ?? null;
  } catch {
    return null;
  }
}

export function gameInputReady(iframe: HTMLIFrameElement | null): boolean {
  return Boolean(gameDocument(iframe));
}

export function focusGame(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;
  try {
    iframe.focus({ preventScroll: true });
    iframe.contentWindow?.focus();
  } catch {
    // Cross-origin frames still accept a plain focus call.
    iframe.focus({ preventScroll: true });
  }
}

function sendKey(iframe: HTMLIFrameElement | null, type: "keydown" | "keyup", code: string): void {
  if (!iframe) return;
  const doc = gameDocument(iframe);
  if (!doc) {
    // Same-origin is required for synthetic input; a guest page may still opt
    // into these messages, everything else is blocked by the browser itself.
    try {
      iframe.contentWindow?.postMessage({ source: "si-games-input", type, code }, "*");
    } catch {
      // Nothing more can be done for this frame.
    }
    return;
  }

  const spec = keySpec(code);
  const target = (doc.activeElement as HTMLElement | null) ?? doc.body ?? doc.documentElement;
  if (!target) return;
  const event = new KeyboardEvent(type, {
    key: spec.key,
    code,
    keyCode: spec.keyCode,
    which: spec.keyCode,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  // Chrome ignores keyCode/which in the init dict; older games still read them.
  try {
    Object.defineProperty(event, "keyCode", { get: () => spec.keyCode });
    Object.defineProperty(event, "which", { get: () => spec.keyCode });
    Object.defineProperty(event, "charCode", { get: () => 0 });
  } catch {
    // Read-only in a few engines; the modern key/code fields remain set.
  }
  target.dispatchEvent(event);
}

const heldKeys = new Set<string>();

export function pressGameKey(iframe: HTMLIFrameElement | null, code: string): void {
  if (heldKeys.has(code)) return;
  heldKeys.add(code);
  focusGame(iframe);
  sendKey(iframe, "keydown", code);
}

export function releaseGameKey(iframe: HTMLIFrameElement | null, code: string): void {
  if (!heldKeys.has(code)) return;
  heldKeys.delete(code);
  sendKey(iframe, "keyup", code);
}

export function releaseAllGameKeys(iframe: HTMLIFrameElement | null): void {
  for (const code of Array.from(heldKeys)) releaseGameKey(iframe, code);
}

function mouseTarget(doc: Document, x: number, y: number): HTMLElement {
  try {
    const hit = doc.elementFromPoint(x, y);
    if (hit instanceof HTMLElement) return hit;
  } catch {
    // Some documents throw before layout; the body is still a fine target.
  }
  return doc.body ?? doc.documentElement;
}

export function moveGameMouse(
  iframe: HTMLIFrameElement | null,
  nx: number,
  ny: number,
  movementX: number,
  movementY: number
): void {
  const doc = gameDocument(iframe);
  if (!doc) return;
  const width = doc.documentElement?.clientWidth || iframe?.clientWidth || 1;
  const height = doc.documentElement?.clientHeight || iframe?.clientHeight || 1;
  const x = Math.max(0, Math.min(width - 1, nx * width));
  const y = Math.max(0, Math.min(height - 1, ny * height));
  const target = mouseTarget(doc, x, y);
  const init: MouseEventInit = {
    clientX: x,
    clientY: y,
    screenX: x,
    screenY: y,
    movementX,
    movementY,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: doc.defaultView,
  };
  target.dispatchEvent(new MouseEvent("mousemove", init));
  target.dispatchEvent(new PointerEvent("pointermove", { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true }));
}

export function clickGameMouse(
  iframe: HTMLIFrameElement | null,
  nx: number,
  ny: number,
  button = 0
): void {
  const doc = gameDocument(iframe);
  if (!doc) return;
  focusGame(iframe);
  const width = doc.documentElement?.clientWidth || iframe?.clientWidth || 1;
  const height = doc.documentElement?.clientHeight || iframe?.clientHeight || 1;
  const x = Math.max(0, Math.min(width - 1, nx * width));
  const y = Math.max(0, Math.min(height - 1, ny * height));
  const target = mouseTarget(doc, x, y);
  const init: MouseEventInit = {
    clientX: x,
    clientY: y,
    button,
    buttons: 1,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: doc.defaultView,
  };
  target.dispatchEvent(new MouseEvent("mousedown", init));
  target.dispatchEvent(new PointerEvent("pointerdown", { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true }));
  target.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
  target.dispatchEvent(new PointerEvent("pointerup", { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true, buttons: 0 }));
  target.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }));
}

export function isMouseCode(code: string): boolean {
  return code.startsWith("Mouse:");
}

export function mouseButton(code: string): number {
  const value = Number.parseInt(code.split(":")[1] ?? "0", 10);
  return Number.isFinite(value) ? value : 0;
}

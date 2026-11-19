/**
 * Virtual controller support (OmniPad — https://github.com/omnipad-js/OmniPad).
 *
 * The engine itself is the UMD build loaded in index.html; it lands on
 * `window.OmniPad`. This module owns the four pieces the app needs around it:
 *
 *  1. A thin, read-only type surface for the CDN globals we touch.
 *  2. The enabled/disabled setting behind the hidden settings toggle
 *     (persisted in localStorage, announced with a window event).
 *  3. Profile factories — the flat OmniPadProfile JSON the docs' "data-driven
 *     mode" consumes (D-pad / joystick / buttons mapped to key + mouse events).
 *  4. Per-game controller profiles, read from each title's documented controls
 *     so the deck matches the keys the game actually listens for.
 *
 * Two placements share those profiles: `overlay` floats the controls over the
 * game frame, and `deck` pins them to the bottom half of console mode while the
 * target stage sits over the top half.
 */

/** A string (or structured mapping) the OmniPad engine accepts for a control. */
export type OmniPadMapping = string | Record<string, unknown>;

export interface OmniPadProfileItemConfig {
  label?: string;
  cursorEnabled?: boolean;
  cursorMode?: boolean;
  cursorSensitivity?: number;
  targetStageId?: string;
  mapping?: OmniPadMapping;
  layout?: Record<string, unknown>;
  [extra: string]: unknown;
}

export interface OmniPadProfileItem {
  id: string;
  type: "root-layer" | "target-zone" | "d-pad" | "button" | "joystick";
  parentId?: string;
  config: OmniPadProfileItemConfig;
}

export interface OmniPadProfile {
  meta: { name: string };
  items: OmniPadProfileItem[];
  gamepadMappings?: Array<Record<string, unknown>>;
}

/** The forest returned by parseProfileForest: rooted nodes + gamepad table. */
export interface OmniPadForest {
  roots: Record<string, unknown>;
  runtimeGamepadMappings?: unknown;
}

/** Only the members of window.OmniPad this feature uses. */
export interface OmniPadApi {
  parseProfileForest: (profile: OmniPadProfile) => OmniPadForest;
  RootLayer: new (
    container: Element,
    options: { treeNode: unknown }
  ) => { destroy?: () => void } & Record<string, unknown>;
  GamepadManager: {
    getInstance: () => {
      setConfig: (mapping: unknown) => void;
      start: () => void;
      stop?: () => void;
    };
  };
  IframeManager: {
    getInstance: () => {
      addTrustedOrigin: (origin: string) => void;
    };
  };
}

declare global {
  interface Window {
    OmniPad?: OmniPadApi;
  }
}

/** Reads the CDN engine. Undefined when the CDN is blocked — callers must no-op. */
export function getOmniPad(): OmniPadApi | undefined {
  return typeof window !== "undefined" ? window.OmniPad : undefined;
}

/* ------------------------------------------------------------------ */
/* Hidden settings storage: is the controller overlay enabled at all? */
/* ------------------------------------------------------------------ */

export const CONTROLLERS_STORAGE_KEY = "si-games-controllers";
export const CONTROLLERS_CHANGE_EVENT = "si-games-controllers-change";

export function isControllersEnabled(): boolean {
  try {
    return localStorage.getItem(CONTROLLERS_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setControllersEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(CONTROLLERS_STORAGE_KEY, "1");
    else localStorage.removeItem(CONTROLLERS_STORAGE_KEY);
  } catch {
    // Storage may be blocked (private mode) — the toggle stays session-only.
  }
  window.dispatchEvent(new Event(CONTROLLERS_CHANGE_EVENT));
}

/* ------------------------------------------------------------------ */
/* Controller profiles                                                 */
/* ------------------------------------------------------------------ */

const STAGE = "$stage";

export type ControllerLayoutId = "platform" | "wasd" | "shoot" | "drive";
export type ControllerMode = "overlay" | "deck";

export interface ControllerGameInfo {
  id: string;
  category: string;
  /** The title's documented keyboard/mouse controls, used to pick the keys. */
  controls?: string;
}

type ControlHints = {
  move: "wasd" | "arrows";
  look: boolean;
  click: boolean;
  jump: boolean;
  reload: boolean;
  use: boolean;
  sprint: boolean;
  enter: boolean;
  drive: boolean;
};

/**
 * Reads the control sentence every title ships with. The wording across the
 * library is consistent enough ("W A S D to move", "arrow keys", "Space to
 * jump", "click to fire", "R to reload"), so a controller can follow the same
 * input scheme without a hand-written table per game.
 */
function readControls(game: ControllerGameInfo): ControlHints {
  const text = (game.controls ?? "").toLowerCase();
  const wasd = /w\s*a\s*s\s*d|wasd|w or arrow/.test(text);
  const arrows = /arrow/.test(text);
  const drive = game.category === "Racing" || /drive|steer|accelerat/.test(text);
  const mouse = /mouse|look|aim|cursor/.test(text);
  const click = /click|tap|fire|shoot|bite/.test(text);

  return {
    // Most titles document WASD; arrows-only titles keep their arrow keys.
    move: wasd ? "wasd" : arrows ? "arrows" : "wasd",
    look: mouse,
    click,
    jump: /jump|space/.test(text) && !/handbrake|brake/.test(text),
    reload: /reload/.test(text) || /\br\b/.test(text),
    use: /\be\b|\bf\b/.test(text),
    sprint: /shift|sprint|boost/.test(text),
    enter: /enter/.test(text),
    drive,
  };
}

/** Movement is a D-pad so the keys are exact, never an analog approximation. */
function dpadItem(keys: { up: string; down: string; left: string; right: string }, deck: boolean): OmniPadProfileItem {
  return {
    id: "pad-dpad",
    type: "d-pad",
    parentId: "$ui",
    config: {
      mapping: keys,
      targetStageId: STAGE,
      layout: deck
        ? { left: "4%", top: "56%", height: "30%", isSquare: true, zIndex: 10 }
        : { left: "4%", bottom: "6%", height: "32%", isSquare: true, zIndex: 10 },
    },
  };
}

/** Mouse-look stick: turns thumb movement into a virtual cursor. */
function lookItem(deck: boolean): OmniPadProfileItem {
  return {
    id: "pad-stick",
    type: "joystick",
    parentId: "$ui",
    config: {
      cursorMode: true,
      cursorSensitivity: 1.1,
      targetStageId: STAGE,
      mapping: { stick: { type: "mouse", button: 0 } },
      layout: deck
        ? { right: "4%", top: "62%", width: "24%", zIndex: 10 }
        : { right: "4%", bottom: "6%", width: "29%", zIndex: 10 },
    },
  };
}

function buttonItem(
  id: string,
  label: string,
  code: string,
  slot: number,
  deck: boolean,
  compact: boolean
): OmniPadProfileItem {
  const layout = deck
    ? compact
      ? slot === 0
        ? { right: "5%", top: "52%", height: "11%", isSquare: true, zIndex: 10 }
        : { right: "30%", top: "51%", height: "9%", isSquare: true, zIndex: 10 }
      : slot === 0
        ? { right: "5%", top: "55%", height: "15%", isSquare: true, zIndex: 10 }
        : { right: "24%", top: "55%", height: "12%", isSquare: true, zIndex: 10 }
    : slot === 0
      ? { right: "5%", bottom: "39%", height: "15%", isSquare: true, zIndex: 10 }
      : { right: "24%", bottom: "39%", height: "13%", isSquare: true, zIndex: 10 };

  return {
    id,
    type: "button",
    parentId: "$ui",
    config: {
      label,
      mapping: code,
      targetStageId: STAGE,
      layout,
    },
  };
}

/** The two most useful actions for this title, in priority order. */
function actionButtons(hints: ControlHints): Array<{ label: string; code: string }> {
  if (hints.drive) {
    const gas = hints.move === "arrows" ? "ArrowUp" : "KeyW";
    return [
      { label: "GAS", code: gas },
      { label: "BRAKE", code: "Space" },
    ];
  }

  const actions: Array<{ label: string; code: string }> = [];
  // Enter leads: several titles need it before the game even starts.
  if (hints.enter) actions.push({ label: "ENTER", code: "Enter" });
  if ((hints.click || hints.look) && actions.length < 2) {
    actions.push({ label: hints.look ? "FIRE" : "TAP", code: "Mouse:0" });
  }
  if (hints.jump && actions.length < 2) actions.push({ label: "JUMP", code: "Space" });
  if (hints.use && actions.length < 2) actions.push({ label: "USE", code: "KeyE" });
  if (hints.reload && actions.length < 2) actions.push({ label: "RELOAD", code: "KeyR" });
  if (hints.sprint && actions.length < 2) actions.push({ label: "SPRINT", code: "ShiftLeft" });
  if (actions.length < 2) actions.push({ label: "ACT", code: "KeyX" });
  return actions.slice(0, 2);
}

function buildProfile(hints: ControlHints, mode: ControllerMode): OmniPadProfile {
  const deck = mode === "deck";
  // A cursor stick earns its space when the game aims or moves by mouse. Tap
  // games (jump on click) only need the action button.
  const cursor = hints.look || (hints.click && !hints.jump);
  const items: OmniPadProfileItem[] = [
    { id: "$ui", type: "root-layer", config: { layout: { width: "100%", height: "100%" } } },
    {
      id: STAGE,
      type: "target-zone",
      parentId: "$ui",
      config: {
        cursorEnabled: cursor,
        layout: deck
          ? { left: 0, top: 0, width: "100%", height: "50%" }
          : { left: 0, top: 0, width: "100%", height: "100%" },
      },
    },
  ];

  const keys = hints.move === "wasd"
    ? { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" }
    : { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };

  items.push(dpadItem(keys, deck));
  if (cursor) items.push(lookItem(deck));

  actionButtons(hints).forEach((action, index) => {
    items.push(buttonItem(`pad-${index === 0 ? "a" : "b"}`, action.label, action.code, index, deck, cursor));
  });

  return {
    meta: { name: "SI GAMES controller" },
    items,
    // Physical Xbox / PlayStation controllers drive the same overlay buttons.
    gamepadMappings: [
      { buttons: { A: "pad-a", B: "pad-b", X: "pad-b" } },
    ],
  };
}

/** Layout id kept for callers that only need a label for the scheme. */
export function controllerLayoutIdFor(game: ControllerGameInfo): ControllerLayoutId {
  if (game.id === "minecraft-eaglercraft") return "wasd";
  if (game.category === "Racing") return "drive";
  const hints = readControls(game);
  if (hints.look || game.category === "Shooter" || game.category === "FPS") return "shoot";
  if (hints.move === "wasd") return "wasd";
  return "platform";
}

const profileCache = new Map<string, OmniPadProfile>();

/** Builds (and caches) the profile a title needs for the chosen placement. */
export function controllerProfileFor(
  game: ControllerGameInfo,
  mode: ControllerMode = "overlay"
): OmniPadProfile {
  const key = `${game.id}|${game.category}|${game.controls ?? ""}|${mode}`;
  const cached = profileCache.get(key);
  if (cached) return cached;
  const profile = buildProfile(readControls(game), mode);
  profileCache.set(key, profile);
  return profile;
}

/** Physical gamepad support also needs the frame host whitelisted. */
export function trustedFrameOrigin(src: string): string | null {
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}

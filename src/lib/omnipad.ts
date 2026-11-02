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
 *  4. `controllerLayoutIdFor(game)` — every game gets a controller; the layout
 *     is picked from a few explicit per-game overrides, then from the game's
 *     category, with a sensible keyboard default left over.
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
/* Controller layouts                                                  */
/* ------------------------------------------------------------------ */

const STAGE = "$stage";

/** Shared target-zone item: it fills the mounted container (the game frame). */
function stageItem(cursor: boolean): OmniPadProfileItem {
  return {
    id: STAGE,
    type: "target-zone",
    parentId: "$ui",
    config: {
      cursorEnabled: cursor,
      layout: { left: 0, top: 0, width: "100%", height: "100%" },
    },
  };
}

function dpadItem(mapping: { up: string; down: string; left: string; right: string }): OmniPadProfileItem {
  return {
    id: "pad-dpad",
    type: "d-pad",
    parentId: "$ui",
    config: {
      mapping,
      targetStageId: STAGE,
      layout: { left: "4%", bottom: "6%", height: "34%", isSquare: true, zIndex: 10 },
    },
  };
}

function buttonItem(id: string, label: string, code: string, right: string, bottom: string, size: string): OmniPadProfileItem {
  return {
    id,
    type: "button",
    parentId: "$ui",
    config: {
      label,
      mapping: code,
      targetStageId: STAGE,
      layout: { right, bottom, height: size, isSquare: true, zIndex: 10 },
    },
  };
}

function joystickItem(cursorMode: boolean): OmniPadProfileItem {
  return {
    id: "pad-stick",
    type: "joystick",
    parentId: "$ui",
    config: {
      cursorMode,
      cursorSensitivity: 1.1,
      targetStageId: STAGE,
      mapping: cursorMode
        ? { stick: { type: "mouse", button: 0 } }
        : { stick: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" } },
      layout: { left: "4%", bottom: "6%", width: "30%", zIndex: 10 },
    },
  };
}

/** The three layouts: action/D-pad, WASD pad, and mouse-aim shoot layout. */
function buildLayout(layout: ControllerLayoutId): OmniPadProfile {
  const items: OmniPadProfileItem[] = [
    { id: "$ui", type: "root-layer", config: { layout: { width: "100%", height: "100%" } } },
  ];

  if (layout === "wasd") {
    // WASD movers (Minecraft-style): WASD stick + jump/use + look-to-aim.
    items.push(stageItem(true));
    items.push(joystickItem(false));
    items.push(buttonItem("pad-a", "JUMP", "Space", "5%", "22%", "16%"));
    items.push(buttonItem("pad-b", "USE", "KeyE", "20%", "6%", "14%"));
  } else if (layout === "shoot") {
    // Aiming games: arrows to move, right stick steers a virtual cursor that
    // left-clicks, plus a tap button that fires a mouse click.
    items.push(stageItem(true));
    items.push(dpadItem({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }));
    items.push(joystickItem(true));
    items.push(buttonItem("pad-a", "FIRE", "Space", "5%", "20%", "16%"));
    items.push(buttonItem("pad-b", "CLICK", "Mouse:0", "22%", "6%", "13%"));
  } else {
    // Platform/action default: D-pad on arrows, jump and action on Space/KeyX.
    items.push(stageItem(false));
    items.push(dpadItem({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }));
    items.push(buttonItem("pad-a", "JUMP", "Space", "5%", "20%", "16%"));
    items.push(buttonItem("pad-b", "ACT", "KeyX", "20%", "6%", "13%"));
  }

  return {
    meta: { name: "SI GAMES controller" },
    items,
    // Physical Xbox / PlayStation controllers drive the same overlay buttons.
    gamepadMappings: [
      { buttons: { A: "pad-a", B: "pad-b", X: "pad-b" }, ...(layout === "wasd" ? { leftStick: "pad-stick" } : {}) },
    ],
  };
}

export type ControllerLayoutId = "platform" | "wasd" | "shoot";

const LAYOUTS: Record<ControllerLayoutId, OmniPadProfile> = {
  platform: buildLayout("platform"),
  wasd: buildLayout("wasd"),
  shoot: buildLayout("shoot"),
};

/** Per-game overrides where the game's documented controls justify one. */
const LAYOUT_OVERRIDES: Record<string, ControllerLayoutId> = {
  "minecraft-eaglercraft": "wasd",
};

/** Category → layout. Everything missing here falls back to the default. */
const CATEGORY_LAYOUTS: Record<string, ControllerLayoutId> = {
  Shooter: "shoot",
  FPS: "shoot",
  "Tower Defense": "shoot",
  Minecraft: "wasd",
  Sandbox: "wasd",
};

/** Every game gets a controller: overrides, then category, then the default. */
export function controllerLayoutIdFor(game: { id: string; category: string }): ControllerLayoutId {
  return LAYOUT_OVERRIDES[game.id] ?? CATEGORY_LAYOUTS[game.category] ?? "platform";
}

export function controllerProfileFor(game: { id: string; category: string }): OmniPadProfile {
  return LAYOUTS[controllerLayoutIdFor(game)];
}

/** Physical gamepad support also needs the frame host whitelisted. */
export function trustedFrameOrigin(src: string): string | null {
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}

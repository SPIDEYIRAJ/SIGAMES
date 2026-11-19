/**
 * Per-game console-deck scheme.
 *
 * Every title in the library ships a `controls` sentence describing the keys
 * it listens for ("W A S D to move", "click to fire", "R to reload", "Space to
 * jump"...). The deck reads that sentence so its sticks and buttons send the
 * same keys the game already expects, instead of one generic layout.
 */

export interface PadButton {
  id: "a" | "b" | "x" | "y" | "l" | "r";
  label: string;
  detail: string;
  code: string;
}

export interface PadScheme {
  move: "wasd" | "arrows";
  look: boolean;
  fire: boolean;
  face: PadButton[];
  triggers: PadButton[];
  start: { label: string; code: string };
}

export interface GameControlInfo {
  id: string;
  category: string;
  controls?: string;
}

/** Explicit overrides where a title's controls sentence needs a nudge. */
const OVERRIDES: Record<string, Partial<PadScheme>> = {
  "cs16": {
    move: "wasd",
    look: true,
    face: [
      { id: "a", label: "A", detail: "Jump", code: "Space" },
      { id: "b", label: "B", detail: "Use", code: "KeyE" },
      { id: "x", label: "X", detail: "Reload", code: "KeyR" },
      { id: "y", label: "Y", detail: "Fire", code: "Mouse:0" },
    ],
    triggers: [
      { id: "l", label: "L1", detail: "Buy", code: "KeyB" },
      { id: "r", label: "R1", detail: "Walk", code: "ShiftLeft" },
    ],
  },
  "gta-v": {
    move: "wasd",
    look: true,
    face: [
      { id: "a", label: "A", detail: "Jump", code: "Space" },
      { id: "b", label: "B", detail: "Vehicle", code: "KeyF" },
      { id: "x", label: "X", detail: "Reload", code: "KeyR" },
      { id: "y", label: "Y", detail: "Fire", code: "Mouse:0" },
    ],
    triggers: [
      { id: "l", label: "L1", detail: "Cover", code: "KeyQ" },
      { id: "r", label: "R1", detail: "Sprint", code: "ShiftLeft" },
    ],
  },
  "geometry-dash-lite": {
    look: false,
    fire: false,
    face: [
      { id: "a", label: "A", detail: "Jump", code: "Space" },
      { id: "b", label: "B", detail: "Restart", code: "KeyR" },
      { id: "x", label: "X", detail: "Practice", code: "KeyP" },
      { id: "y", label: "Y", detail: "Menu", code: "Escape" },
    ],
  },
  "minecraft-eaglercraft": {
    move: "wasd",
    look: true,
    face: [
      { id: "a", label: "A", detail: "Jump", code: "Space" },
      { id: "b", label: "B", detail: "Inventory", code: "KeyE" },
      { id: "x", label: "X", detail: "Drop", code: "KeyQ" },
      { id: "y", label: "Y", detail: "Attack", code: "Mouse:0" },
    ],
  },
};

export function padSchemeFor(game: GameControlInfo): PadScheme {
  const text = (game.controls ?? "").toLowerCase();
  const override = OVERRIDES[game.id] ?? {};
  const wasd = /w\s*a\s*s\s*d|wasd/.test(text);
  const arrows = /arrow/.test(text);
  const look = /mouse|aim|look around|look/.test(text);
  const click = /click|tap|fire|shoot|bite/.test(text);
  const jump = /jump|space/.test(text);
  const reload = /reload/.test(text) || /\br\b/.test(text);
  const use = /\be\b|\bf\b|interact|use/.test(text);
  const sprint = /shift|sprint|boost/.test(text);
  const drive = game.category === "Racing" || /drive|steer|accelerat/.test(text);

  const face: PadButton[] = drive
    ? [
        { id: "a", label: "A", detail: "Brake", code: "Space" },
        { id: "b", label: "B", detail: "Boost", code: shiftCode(text) },
        { id: "x", label: "X", detail: "Reset", code: "KeyR" },
        { id: "y", label: "Y", detail: "Camera", code: "KeyC" },
      ]
    : [
        {
          id: "a",
          label: "A",
          detail: jump ? "Jump" : "Confirm",
          code: jump ? "Space" : "Enter",
        },
        {
          id: "b",
          label: "B",
          detail: use ? "Use" : "Action",
          code: use ? "KeyE" : "KeyF",
        },
        {
          id: "x",
          label: "X",
          detail: reload ? "Reload" : "Action",
          code: reload ? "KeyR" : "KeyX",
        },
        {
          id: "y",
          label: "Y",
          detail: click || look ? "Fire" : "Interact",
          code: click || look ? "Mouse:0" : "KeyF",
        },
      ];

  return {
    move: override.move ?? (wasd || !arrows ? "wasd" : "arrows"),
    look: override.look ?? look,
    fire: override.fire ?? (click || look),
    face: override.face ?? face,
    triggers: override.triggers ?? [
      { id: "l", label: "L1", detail: "Quick", code: "KeyQ" },
      { id: "r", label: "R1", detail: sprint ? "Sprint" : "Alt", code: shiftCode(text) },
    ],
    start: override.start ?? { label: "START", code: "Enter" },
  };
}

function shiftCode(text: string): string {
  return /shift|sprint|boost/.test(text) ? "ShiftLeft" : "ShiftLeft";
}

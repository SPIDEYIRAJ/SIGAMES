/**
 * SI GAMES colour themes.
 *
 * Every palette lives in `index.css` as a set of custom properties declared on
 * `:root[data-theme="…"]`. This module only decides which palette is active:
 * it stamps the id on <html>, keeps the browser chrome in step and remembers
 * the choice in localStorage.
 */

export type ThemeId = "nebula" | "plasma" | "crimson" | "tidal" | "toxic" | "solar";

export type Theme = {
  id: ThemeId;
  label: string;
  /** One-line description shown under the name in the picker. */
  note: string;
  /** Colour painted on the browser chrome (the theme-color meta tag). */
  chrome: string;
  /** Accent and glow used to draw the swatch. */
  accent: string;
  glow: string;
};

export const THEMES: Theme[] = [
  { id: "nebula", label: "Nebula", note: "Neon blue · violet", chrome: "#050816", accent: "#5608f8", glow: "#3efeff" },
  { id: "plasma", label: "Plasma", note: "Violet · hot pink", chrome: "#16061f", accent: "#c31ff9", glow: "#ff70cf" },
  { id: "crimson", label: "Crimson", note: "Red · amber", chrome: "#200509", accent: "#f61e42", glow: "#ffb433" },
  { id: "tidal", label: "Tidal", note: "Azure · aqua", chrome: "#021422", accent: "#0099ff", glow: "#47ffff" },
  { id: "toxic", label: "Toxic", note: "Green · lime", chrome: "#052014", accent: "#0edd7c", glow: "#c2ff33" },
  { id: "solar", label: "Solar", note: "Orange · gold", chrome: "#251304", accent: "#ff740a", glow: "#ffda47" },
];

const STORAGE_KEY = "si-games-theme";
const DEFAULT_THEME: ThemeId = "nebula";

/** Fired on <html> whenever the active palette changes — the landing
 *  starfield listens so its tints follow the theme instead of staying fixed. */
export const THEME_CHANGE_EVENT = "si-theme-change";

/** The stored palette, or the default when storage is empty or unreadable. */
export function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && THEMES.some((theme) => theme.id === stored)) return stored as ThemeId;
  } catch {
    // Private mode or disabled storage — fall through to the default.
  }
  return DEFAULT_THEME;
}

/** Switches the whole shell to `id` and remembers the pick. */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0];
  document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.chrome);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  try {
    localStorage.setItem(STORAGE_KEY, theme.id);
  } catch {
    // Storage failures only cost persistence, not the switch itself.
  }
}

/** Runs once before the first render so the saved palette paints immediately. */
export function initTheme(): void {
  applyTheme(readStoredTheme());
}

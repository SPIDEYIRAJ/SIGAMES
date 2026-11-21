/**
 * Motion preference for the site's decorative layer.
 *
 * `full` keeps the orbit graphics, floating glyphs and scroll reveals. `reduced`
 * removes them without touching gameplay, page transitions or required UI
 * feedback. The operating-system preference always wins.
 */

export type MotionPreference = "full" | "reduced";

const STORAGE_KEY = "si-games-motion";
export const MOTION_CHANGE_EVENT = "si-games-motion-change";

export function readMotionPreference(): MotionPreference {
  try {
    return localStorage.getItem(STORAGE_KEY) === "reduced" ? "reduced" : "full";
  } catch {
    return "full";
  }
}

export function motionIsReduced(): boolean {
  if (typeof window === "undefined") return true;
  return (
    readMotionPreference() === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function setMotionPreference(preference: MotionPreference): void {
  try {
    if (preference === "reduced") localStorage.setItem(STORAGE_KEY, "reduced");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode: the choice still applies to this visit.
  }
  document.documentElement.dataset.motion = preference;
  window.dispatchEvent(new Event(MOTION_CHANGE_EVENT));
}

/** Stamps the saved choice before the first paint. */
export function initMotion(): void {
  document.documentElement.dataset.motion = readMotionPreference();
}

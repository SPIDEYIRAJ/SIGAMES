/**
 * Per-game playtime, kept on this device.
 *
 * The player page opens a session when it mounts and flushes the elapsed time
 * every 20 seconds, when the tab is hidden and when the page is left. Nothing
 * leaves the browser; the Big Picture shelves read the same map.
 */

const STORAGE_KEY = "si-games-playtime";

export type PlaytimeMap = Record<string, number>;

export function readPlaytime(): PlaytimeMap {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!raw || typeof raw !== "object") return {};
    const map: PlaytimeMap = {};
    for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) map[id] = value;
    }
    return map;
  } catch {
    return {};
  }
}

function writePlaytime(map: PlaytimeMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage can be unavailable in private modes; the session still runs.
  }
}

/** Adds elapsed milliseconds, ignoring blips under a second. */
export function addPlaytime(id: string, ms: number): void {
  if (!id || ms < 1000) return;
  const map = readPlaytime();
  map[id] = (map[id] ?? 0) + ms;
  writePlaytime(map);
}

/** "Not played", "4 min", "3 h 12 min" — short enough for a 10-foot shelf tile. */
export function formatPlaytime(ms: number | undefined): string {
  if (!ms || ms < 60_000) return ms && ms > 0 ? "<1 min" : "Not played";
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Starts a session for one title and returns the function that closes it. */
export function trackSession(id: string): () => void {
  let last = Date.now();

  const flush = () => {
    const now = Date.now();
    addPlaytime(id, now - last);
    last = now;
  };

  const timer = window.setInterval(flush, 20_000);
  const onVisibility = () => {
    if (document.hidden) flush();
  };
  const onLeave = () => flush();

  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onLeave);

  return () => {
    flush();
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onLeave);
  };
}

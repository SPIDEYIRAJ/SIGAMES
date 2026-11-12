/**
 * GLOBAL PUBLIC LIMIT — one comment per game, per player.
 *
 * This is the single source of truth the UI reads; the Convex mutation enforces
 * the same number server-side with the (gameId, userId) index, so the rule
 * cannot be bypassed from the client.
 */
export const COMMENTS_PER_GAME_PER_PLAYER = 1;

/** Wording for each star step, used as the button title + aria label tail. */
export const STAR_LABELS = ["", "Not for me", "It's alright", "Solid", "Great", "Masterpiece"] as const;

/** 4.25 -> "4.3", 0 -> "—" (no ratings yet). */
export function formatAverage(average: number): string {
  return average > 0 ? average.toFixed(1) : "—";
}

/** Compact relative time for comment rows ("just now", "3h ago", "2 Sep"). */
export function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

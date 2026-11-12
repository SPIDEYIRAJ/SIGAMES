/**
 * Hands the game card the player clicked over to the player page.
 *
 * The card's on-screen rectangle is captured before navigation so the boot
 * sequence can start with that exact card flying into the console's cartridge
 * slot, even though the landing page has already unmounted.
 */
export interface LaunchSource {
  gameId: string;
  image: string;
  rect: { left: number; top: number; width: number; height: number };
}

let pending: LaunchSource | null = null;

/** Reads the card's art (or the card itself) and remembers where it was. */
export function captureLaunchSource(gameId: string, image: string, element: Element | null): void {
  const art = element?.querySelector(".game-art, .shelf-art") ?? element;
  const rect = art?.getBoundingClientRect();
  pending = rect
    ? { gameId, image, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } }
    : { gameId, image, rect: { left: window.innerWidth / 2 - 140, top: window.innerHeight / 2 - 90, width: 280, height: 180 } };
}

/** Used by the player page for titles that stop at the entrance first. */
export function peekLaunchSource(gameId: string): LaunchSource | null {
  return pending && pending.gameId === gameId ? pending : null;
}

/** Consumed once, when the console actually boots. */
export function takeLaunchSource(gameId: string): LaunchSource | null {
  const source = peekLaunchSource(gameId);
  pending = null;
  return source;
}

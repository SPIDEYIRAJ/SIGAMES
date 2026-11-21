/**
 * SI GAMES theme song.
 *
 * One looped audio element for the whole site. It rises from silence on the
 * first visit, ducks while a game page is open, then fades out for good once
 * the game itself has loaded. Stopping for a game is remembered, so leaving
 * the game brings the theme back with another fade-up.
 *
 * The track lives in `public/audio`, so it loads from the same origin as the
 * app and never waits on a storage query or a cross-origin CORS check.
 */

const STORAGE_KEY = "si-games-theme-song";

/** Full listening level and the low level held while a game page is open. */
export const BASE_VOLUME = 0.5;
export const DUCK_VOLUME = 0.08;

const THEME_SONG_FILE = "/audio/si-theme.mp3";

let audio: HTMLAudioElement | null = null;
let sourceUrl = THEME_SONG_FILE;
let rampFrame = 0;
let ducked = false;
let stoppedForGame = false;
let fadeToken = 0;
let gestureBound = false;

export function isThemeSongEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setThemeSongEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, "0");
  } catch {
    // Private mode: the toggle stays session-only.
  }
  if (enabled) {
    stoppedForGame = false;
    startThemeSong();
  } else {
    fadeToken += 1;
    stopThemeSong(700);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("si-games-theme-song-change"));
  }
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    // iOS refuses inline playback without this even after a gesture.
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
  }
  if (sourceUrl && audio.getAttribute("src") !== sourceUrl) {
    audio.src = sourceUrl;
    audio.load();
  }
  return audio;
}

/** Smooth volume ramp; short fades for ducking, long ones for the opening rise. */
function rampTo(target: number, ms: number): void {
  const element = audio;
  if (!element) return;
  if (rampFrame) {
    window.cancelAnimationFrame(rampFrame);
    rampFrame = 0;
  }
  if (ms <= 0) {
    element.volume = Math.min(1, Math.max(0, target));
    return;
  }
  const from = element.volume;
  const begin = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - begin) / ms);
    // Smoothstep keeps the fade calm instead of linear and abrupt at the ends.
    const eased = progress * progress * (3 - 2 * progress);
    element.volume = Math.min(1, Math.max(0, from + (target - from) * eased));
    rampFrame = progress < 1 ? window.requestAnimationFrame(step) : 0;
  };
  rampFrame = window.requestAnimationFrame(step);
}

function stopThemeSong(ms: number): void {
  const element = audio;
  if (!element) return;
  if (element.paused) {
    element.volume = 0;
    return;
  }
  rampTo(0, ms);
  const token = fadeToken;
  window.setTimeout(() => {
    if (token !== fadeToken) return;
    element.pause();
    element.currentTime = 0;
  }, ms + 60);
}

/** Quiet the Convex theme without touching the player's saved preference. */
export function silenceThemeSong(ms = 800): void {
  fadeToken += 1;
  stopThemeSong(ms);
}

/** Browsers only allow audio after a gesture, so retry on the next one. */
function bindFirstGesture(): void {
  if (gestureBound || typeof window === "undefined") return;
  gestureBound = true;
  const wake = () => {
    gestureBound = false;
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
    startThemeSong();
  };
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

/**
 * Start the loop from silence and fade up slowly. When a game page is already
 * open the rise targets the ducked level instead of full volume.
 */
export function startThemeSong(): void {
  if (!isThemeSongEnabled()) return;
  const element = ensureAudio();
  if (!element) return;

  fadeToken += 1;
  stoppedForGame = false;
  const target = ducked ? DUCK_VOLUME : BASE_VOLUME;

  if (!element.paused) {
    rampTo(target, 900);
    return;
  }

  element.volume = 0;
  element.currentTime = 0;
  void element
    .play()
    .then(() => rampTo(target, 1_600))
    .catch(() => bindFirstGesture());
}

/** Game page opened: drop under the game, never fully silent. */
export function duckThemeSong(): void {
  ducked = true;
  const element = audio;
  if (!element || element.paused) return;
  rampTo(DUCK_VOLUME, 1_200);
}

/** Back on the shelf: return to the normal level. */
export function unduckThemeSong(): void {
  ducked = false;
  const element = audio;
  if (stoppedForGame || !element || element.paused) return;
  rampTo(BASE_VOLUME, 1_500);
}

/** The game has loaded: fade the theme out and stop it. */
export function fadeThemeSongForGame(): void {
  const element = audio;
  // Only remember a stop for the player that was actually sounding, so leaving
  // the game never restarts both the theme and a local playlist at once.
  if (!element || element.paused) {
    stoppedForGame = false;
    return;
  }
  stoppedForGame = true;
  ducked = false;
  fadeToken += 1;
  const token = fadeToken;
  rampTo(0, 2_600);
  window.setTimeout(() => {
    if (token !== fadeToken) return;
    element.pause();
    element.currentTime = 0;
  }, 2_700);
}

/** Leaving the game page after the theme stopped: bring it back from silence. */
export function resumeThemeSongAfterGame(): void {
  if (!stoppedForGame) return;
  stoppedForGame = false;
  startThemeSong();
}

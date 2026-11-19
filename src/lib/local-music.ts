/**
 * Local soundtrack player.
 *
 * Plays the audio files found in the player's chosen folders as a looping
 * playlist. It mirrors the theme song's lifecycle: slow fade-up, duck while a
 * game page is open, fade out once the game loads, and resume on the shelf.
 */

import { BASE_VOLUME, DUCK_VOLUME } from "./theme-song";
import type { TrackFile } from "./music-library";

export const LOCAL_TRACK_EVENT = "si-games-local-track";

interface PlaylistTrack {
  name: string;
  url: string;
}

let audio: HTMLAudioElement | null = null;
let playlist: PlaylistTrack[] = [];
let playlistKey = "";
let index = 0;
let rampFrame = 0;
let ducked = false;
let stoppedForGame = false;
let fadeToken = 0;
let failures = 0;
let swapping = false;
let gestureBound = false;

/** Browsers only allow audio after a gesture, so retry on the next one. */
function bindFirstGesture(): void {
  if (gestureBound || typeof window === "undefined") return;
  gestureBound = true;
  const wake = () => {
    gestureBound = false;
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
    startLocalMusic();
  };
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

function announceTrack(): void {
  if (typeof window === "undefined") return;
  const name = playlist[index]?.name ?? "";
  window.dispatchEvent(new CustomEvent(LOCAL_TRACK_EVENT, { detail: { name } }));
}

function ensureAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.volume = 0;
    audio.addEventListener("ended", () => {
      if (!playlist.length) return;
      index = (index + 1) % playlist.length;
      playCurrent();
    });
    audio.addEventListener("error", () => {
      if (swapping || !playlist.length) return;
      failures += 1;
      // Never loop forever over a folder of unreadable files.
      if (failures > playlist.length) {
        audio?.pause();
        return;
      }
      index = (index + 1) % playlist.length;
      playCurrent();
    });
  }
  return audio;
}

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
    const eased = progress * progress * (3 - 2 * progress);
    element.volume = Math.min(1, Math.max(0, from + (target - from) * eased));
    rampFrame = progress < 1 ? window.requestAnimationFrame(step) : 0;
  };
  rampFrame = window.requestAnimationFrame(step);
}

function playCurrent(): void {
  if (!playlist.length) return;
  const element = ensureAudio();
  const track = playlist[index % playlist.length];
  element.src = track.url;
  element.currentTime = 0;
  announceTrack();
  void element
    .play()
    .then(() => {
      failures = 0;
      rampTo(ducked ? DUCK_VOLUME : BASE_VOLUME, 12_000);
    })
    .catch(() => bindFirstGesture());
}

export function setLocalPlaylist(tracks: TrackFile[]): void {
  // A rescan that finds the same songs must not interrupt the one playing.
  const nextKey = tracks.map((track) => `${track.name}-${track.file.size}`).join("|");
  if (nextKey === playlistKey && playlist.length) return;
  playlistKey = nextKey;

  const element = audio;
  swapping = true;
  if (element) {
    element.pause();
    element.removeAttribute("src");
    element.load();
  }
  for (const track of playlist) URL.revokeObjectURL(track.url);
  playlist = tracks.map((track) => ({ name: track.name, url: URL.createObjectURL(track.file) }));
  index = 0;
  failures = 0;
  fadeToken += 1;
  announceTrack();
  // Ignore the error event a cleared src can emit while the list changes.
  window.setTimeout(() => {
    swapping = false;
  }, 120);
}

export function hasLocalPlaylist(): boolean {
  return playlist.length > 0;
}

export function localTrackCount(): number {
  return playlist.length;
}

export function currentLocalTrack(): string {
  return playlist[index]?.name ?? "";
}

export function startLocalMusic(): void {
  if (!playlist.length) return;
  const element = ensureAudio();
  fadeToken += 1;
  stoppedForGame = false;
  const target = ducked ? DUCK_VOLUME : BASE_VOLUME;
  if (!element.paused && element.src) {
    rampTo(target, 900);
    return;
  }
  element.volume = 0;
  playCurrent();
}

export function stopLocalMusic(ms = 700): void {
  const element = audio;
  if (!element) return;
  index = 0;
  fadeToken += 1;
  const token = fadeToken;
  if (element.paused) {
    element.volume = 0;
    return;
  }
  rampTo(0, ms);
  window.setTimeout(() => {
    if (token !== fadeToken) return;
    element.pause();
    element.currentTime = 0;
  }, ms + 60);
}

export function duckLocalMusic(): void {
  ducked = true;
  if (!audio || audio.paused) return;
  rampTo(DUCK_VOLUME, 1_200);
}

export function unduckLocalMusic(): void {
  ducked = false;
  if (stoppedForGame || !audio || audio.paused) return;
  rampTo(BASE_VOLUME, 1_500);
}

export function fadeLocalMusicForGame(): void {
  const element = audio;
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

export function resumeLocalMusicAfterGame(): void {
  if (!stoppedForGame) return;
  stoppedForGame = false;
  startLocalMusic();
}

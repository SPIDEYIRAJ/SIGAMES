/**
 * Optional interface sounds.
 *
 * Everything is synthesised with the Web Audio API at runtime, so there are no
 * audio files to license, download or cache. The context is only created after
 * the first real gesture, and hover sounds stay silent until that gesture, so
 * nothing autoplays.
 */

export type UiSoundKind = "hover" | "click" | "nav" | "launch" | "back";

const ENABLED_KEY = "si-games-ui-sounds";
const VOLUME_KEY = "si-games-ui-volume";
export const UI_SOUND_CHANGE_EVENT = "si-games-ui-sound-change";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let unlocked = false;

export function isUiSoundEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function readUiSoundVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
  } catch {
    // Private mode: use the default level.
  }
  return 0.42;
}

export function setUiSoundEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.removeItem(ENABLED_KEY);
    else localStorage.setItem(ENABLED_KEY, "0");
  } catch {
    // Session-only preference.
  }
  window.dispatchEvent(new Event(UI_SOUND_CHANGE_EVENT));
  if (enabled) void unlockUiSound();
}

export function setUiSoundVolume(volume: number): void {
  const next = Math.min(1, Math.max(0, volume));
  try {
    localStorage.setItem(VOLUME_KEY, String(next));
  } catch {
    // Session-only preference.
  }
  if (master && context) master.gain.setTargetAtTime(next, context.currentTime, 0.02);
  window.dispatchEvent(new Event(UI_SOUND_CHANGE_EVENT));
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const AudioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextClass = window.AudioContext ?? AudioWindow.webkitAudioContext;
    if (!AudioContextClass) return null;
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = readUiSoundVolume();
    master.connect(context.destination);
  }
  return context;
}

/** Must be called from a real user gesture before any sound can play. */
export async function unlockUiSound(): Promise<void> {
  if (!isUiSoundEnabled()) return;
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);
  unlocked = ctx.state === "running";
}

type Tone = {
  from: number;
  to?: number;
  duration: number;
  gain: number;
  type?: OscillatorType;
  delay?: number;
};

function tone(ctx: AudioContext, spec: Tone): void {
  if (!master) return;
  const start = ctx.currentTime + (spec.delay ?? 0);
  const end = start + spec.duration;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = spec.type ?? "sine";
  oscillator.frequency.setValueAtTime(spec.from, start);
  if (spec.to && spec.to !== spec.from) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, spec.to), end);
  }
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, spec.gain), start + Math.min(0.018, spec.duration * 0.3));
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

/** Play one interface cue. No-op before the first gesture or when disabled. */
export function playUiSound(kind: UiSoundKind = "click"): void {
  if (!unlocked || !isUiSoundEnabled() || readUiSoundVolume() <= 0) return;
  const ctx = ensureContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
    return;
  }

  switch (kind) {
    case "hover":
      tone(ctx, { from: 620, to: 760, duration: 0.055, gain: 0.018, type: "sine" });
      break;
    case "nav":
      tone(ctx, { from: 330, to: 510, duration: 0.1, gain: 0.035, type: "triangle" });
      break;
    case "back":
      tone(ctx, { from: 360, to: 210, duration: 0.11, gain: 0.03, type: "triangle" });
      break;
    case "launch":
      tone(ctx, { from: 130, to: 470, duration: 0.34, gain: 0.05, type: "sine" });
      tone(ctx, { from: 640, to: 980, duration: 0.2, gain: 0.025, type: "triangle", delay: 0.08 });
      break;
    default:
      tone(ctx, { from: 240, to: 155, duration: 0.065, gain: 0.045, type: "triangle" });
      tone(ctx, { from: 760, duration: 0.035, gain: 0.012, type: "sine" });
      break;
  }
}

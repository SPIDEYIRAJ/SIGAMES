/**
 * SI GAMES ambient bed.
 *
 * Everything is synthesised in the browser with Web Audio — no audio files and
 * no extra network requests. Two slow, detuned oscillators and a filtered
 * noise wash make a quiet console-room hum; a soft chime lands every so often
 * so the room feels alive rather than looping.
 */

const STORAGE_KEY = "si-games-ambient";

type AudioGraph = {
  context: AudioContext;
  master: GainNode;
  chimeTimer: number;
  nodes: AudioScheduledSourceNode[];
};

let graph: AudioGraph | null = null;

export function isAmbientEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAmbientEnabled(enabled: boolean): void {
  try {
    if (enabled) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode: the toggle stays session-only.
  }
  if (enabled) void startAmbient();
  else stopAmbient();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("si-games-ambient-change"));
  }
}

function noiseBuffer(context: AudioContext): AudioBuffer {
  const length = context.sampleRate * 4;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let index = 0; index < length; index += 1) {
    // Brown-ish noise is warmer than white noise under a low pass.
    last = (last + Math.random() * 0.04 - 0.02) * 0.995;
    data[index] = last;
  }
  return buffer;
}

function buildGraph(): AudioGraph | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const context = new Ctor();

  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 520;
  filter.Q.value = 0.7;
  filter.connect(master);

  const padGain = context.createGain();
  padGain.gain.value = 0.12;
  padGain.connect(filter);

  const nodes: AudioScheduledSourceNode[] = [];

  const padA = context.createOscillator();
  padA.type = "triangle";
  padA.frequency.value = 55;
  const padAGain = context.createGain();
  padAGain.gain.value = 0.28;
  padA.connect(padAGain).connect(padGain);
  padA.start();
  nodes.push(padA);

  const padB = context.createOscillator();
  padB.type = "sine";
  padB.frequency.value = 82.4;
  const padBGain = context.createGain();
  padBGain.gain.value = 0.16;
  padB.connect(padBGain).connect(padGain);
  padB.start();
  nodes.push(padB);

  const drift = context.createOscillator();
  drift.type = "sine";
  drift.frequency.value = 0.055;
  const driftGain = context.createGain();
  driftGain.gain.value = 140;
  drift.connect(driftGain).connect(filter.frequency);
  drift.start();
  nodes.push(drift);

  const air = context.createBufferSource();
  air.buffer = noiseBuffer(context);
  air.loop = true;
  const airFilter = context.createBiquadFilter();
  airFilter.type = "bandpass";
  airFilter.frequency.value = 780;
  airFilter.Q.value = 0.5;
  const airGain = context.createGain();
  airGain.gain.value = 0.05;
  air.connect(airFilter).connect(airGain).connect(master);
  air.start();
  nodes.push(air);

  const chime = () => {
    if (!graph) return;
    const now = context.currentTime;
    const notes = [523.25, 659.25, 783.99, 987.77];
    const base = notes[Math.floor(Math.random() * notes.length)];
    for (const [offset, gainValue] of [[0, 0.035], [0.18, 0.018]] as const) {
      const voice = context.createOscillator();
      voice.type = "sine";
      voice.frequency.value = base * (offset ? 1.5 : 1);
      const envelope = context.createGain();
      envelope.gain.setValueAtTime(0, now + offset);
      envelope.gain.linearRampToValueAtTime(gainValue, now + offset + 0.04);
      envelope.gain.exponentialRampToValueAtTime(0.0001, now + offset + 2.8);
      voice.connect(envelope).connect(master);
      voice.start(now + offset);
      voice.stop(now + offset + 3);
    }
  };

  const chimeTimer = window.setInterval(chime, 17_000);

  return { context, master, chimeTimer, nodes };
}

export async function startAmbient(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!graph) graph = buildGraph();
  if (!graph) return;
  try {
    await graph.context.resume();
  } catch {
    return;
  }
  const now = graph.context.currentTime;
  graph.master.gain.cancelScheduledValues(now);
  graph.master.gain.setValueAtTime(Math.max(0.0001, graph.master.gain.value), now);
  graph.master.gain.linearRampToValueAtTime(0.16, now + 3.2);
}

export function stopAmbient(): void {
  if (!graph) return;
  const now = graph.context.currentTime;
  graph.master.gain.cancelScheduledValues(now);
  graph.master.gain.setValueAtTime(graph.master.gain.value, now);
  graph.master.gain.linearRampToValueAtTime(0.0001, now + 0.7);
}

/** A short one-off console start-up chime, safe to play from a click. */
export function playEntryChime(): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  const context = new Ctor();
  const now = context.currentTime;
  const notes = [392, 523.25, 659.25, 783.99];
  notes.forEach((frequency, index) => {
    const voice = context.createOscillator();
    voice.type = "triangle";
    voice.frequency.value = frequency;
    const envelope = context.createGain();
    const at = now + index * 0.11;
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(0.08, at + 0.03);
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
    voice.connect(envelope).connect(context.destination);
    voice.start(at);
    voice.stop(at + 1.2);
  });
  window.setTimeout(() => void context.close().catch(() => undefined), 1800);
}

/** Call once on boot: if the player opted in, wait for their first gesture. */
export function armAmbientOnFirstGesture(): () => void {
  if (!isAmbientEnabled()) return () => undefined;
  const wake = () => {
    void startAmbient();
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
  };
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
  return () => {
    window.removeEventListener("pointerdown", wake);
    window.removeEventListener("keydown", wake);
  };
}

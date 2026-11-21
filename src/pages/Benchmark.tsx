import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowLeft,
  Cpu,
  Gauge,
  HardDrive,
  Monitor,
  RefreshCw,
  Wifi,
  Zap,
} from "lucide-react";
import ShareButton from "@/components/ShareButton";

interface Spec {
  label: string;
  value: string;
  hint?: string;
}

interface Result {
  fps: number;
  cpu: number;
  gpu: number;
  overall: number;
  grade: string;
  gpuMs: number;
  samples: number[];
}

type ExtendedNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  userAgentData?: { platform?: string };
};

const FPS_WINDOW = 2400;
const CPU_WINDOW = 900;
const GPU_SIZE = 512;
const GPU_DRAWS = 24;

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function browserName(ua: string) {
  const checks: Array<[RegExp, string]> = [
    [/Edg\/([\d.]+)/, "Edge"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    [/Version\/([\d.]+).*Safari/, "Safari"],
  ];
  for (const [pattern, name] of checks) {
    const match = ua.match(pattern);
    if (match) return `${name} ${match[1].split(".")[0]}`;
  }
  return "Unknown browser";
}

function osName(ua: string, platform: string) {
  if (/Windows NT 10/.test(ua)) return "Windows 10 / 11";
  if (/Windows/.test(ua)) return "Windows";
  if (/Android ([\d.]+)/.test(ua)) return `Android ${ua.match(/Android ([\d.]+)/)?.[1] ?? ""}`.trim();
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS / iPadOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Linux/.test(ua)) return "Linux";
  return platform || "Unknown OS";
}

function gpuDetails() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return { vendor: "—", renderer: "WebGL unavailable", version: "—" };
    const debug = gl.getExtension("WEBGL_debug_renderer_info") as {
      UNMASKED_VENDOR_WEBGL: number;
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    const vendor = debug ? String(gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)) : "Masked by browser";
    const renderer = debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : "Masked by browser";
    const version = String(gl.getParameter(gl.VERSION));
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();
    return { vendor, renderer, version };
  } catch {
    return { vendor: "—", renderer: "WebGL unavailable", version: "—" };
  }
}

/** rAF frame pacing over a short window: average FPS plus per-frame samples. */
function measureFps(duration = FPS_WINDOW): Promise<{ fps: number; samples: number[] }> {
  return new Promise((resolve) => {
    const samples: number[] = [];
    const start = performance.now();
    let last = start;

    const frame = (now: number) => {
      const delta = now - last;
      last = now;
      if (delta > 0 && delta < 500) samples.push(1000 / delta);
      if (now - start < duration) {
        requestAnimationFrame(frame);
      } else {
        const recent = samples.slice(-150);
        const fps = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
        resolve({
          fps: Math.round(fps * 10) / 10,
          samples: recent.map((value) => Math.round(value)),
        });
      }
    };
    requestAnimationFrame(frame);
  });
}

/** Deterministic integer workload, sliced so the page can repaint between chunks. */
async function measureCpu(duration = CPU_WINDOW): Promise<number> {
  let operations = 0;
  let seed = 0x9e3779b9;
  const start = performance.now();

  while (performance.now() - start < duration) {
    const chunkEnd = performance.now() + 8;
    while (performance.now() < chunkEnd) {
      for (let i = 0; i < 1200; i += 1) {
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
        seed ^= seed >>> 13;
        seed = Math.imul(seed, 1274126177) | 0;
      }
      operations += 1200;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  const seconds = (performance.now() - start) / 1000;
  return Math.round((operations / seconds / 1_000_000) * 10) / 10;
}

/** Fullscreen shader pass: heavy per-pixel math, timed through readPixels. */
function measureGpu(): { score: number; ms: number } {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = GPU_SIZE;
    canvas.height = GPU_SIZE;
    const gl = canvas.getContext("webgl", { antialias: false, powerPreference: "high-performance" });
    if (!gl) return { score: 0, ms: 0 };

    const vertex = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
    const fragment = `
      precision highp float;
      uniform float t;
      void main() {
        vec2 uv = gl_FragCoord.xy / 512.0 - 0.5;
        float v = 0.0;
        vec2 z = uv * 3.0;
        for (int i = 0; i < 42; i++) {
          z = abs(z) / max(dot(z, z), 0.15) - vec2(0.72 + t * 0.02, 0.41);
          v += sin(z.x * 2.7 + z.y * 1.9) * 0.5 + 0.5;
        }
        gl_FragColor = vec4(vec3(v / 42.0), 1.0);
      }`;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = vs && fs ? gl.createProgram() : null;
    if (!vs || !fs || !program) {
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return { score: 0, ms: 0 };
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      return { score: 0, ms: 0 };
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, "t");

    const start = performance.now();
    for (let i = 0; i < GPU_DRAWS; i += 1) {
      if (time) gl.uniform1f(time, i);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.finish();
    const pixel = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const ms = performance.now() - start;

    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const lose = gl.getExtension("WEBGL_lose_context");
    lose?.loseContext();

    return { score: Math.round(clamp(2200 / Math.max(ms, 1), 0, 100)), ms: Math.round(ms * 10) / 10 };
  } catch {
    return { score: 0, ms: 0 };
  }
}

function Sparkline({ samples }: { samples: number[] }) {
  if (samples.length < 2) {
    return <div className="bench-spark-empty">Run the test to trace frame pacing.</div>;
  }
  const max = Math.max(70, ...samples);
  const points = samples
    .map((value, index) => `${(index / (samples.length - 1)) * 100},${100 - (value / max) * 100}`)
    .join(" ");
  return (
    <svg className="bench-spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="bench-spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--si-glow)" stopOpacity=".35" />
          <stop offset="100%" stopColor="var(--si-glow)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline className="bench-spark-area" points={`0,100 ${points} 100,100`} />
      <polyline className="bench-spark-line" points={points} />
    </svg>
  );
}

export default function Benchmark() {
  const [liveFps, setLiveFps] = useState(0);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [step, setStep] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [storage, setStorage] = useState("");
  const abort = useRef(false);
  const mounted = useRef(true);

  /** Always-on frame meter so the page breathes before a test is started. */
  useEffect(() => {
    let frame = 0;
    let count = 0;
    let last = performance.now();
    const loop = (now: number) => {
      count += 1;
      if (now - last >= 500) {
        setLiveFps(Math.round((count * 1000) / (now - last)));
        count = 0;
        last = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    mounted.current = true;
    const estimatePromise = navigator.storage?.estimate?.();
    if (estimatePromise) {
      void estimatePromise
        .then((estimate) => {
          if (!mounted.current) return;
          const gb = (estimate.quota ?? 0) / 1024 ** 3;
          setStorage(gb > 0 ? `${gb.toFixed(1)} GB available` : "Not reported");
        })
        .catch(() => setStorage("Not reported"));
    }
    return () => {
      mounted.current = false;
    };
  }, []);

  const gpu = useMemo(gpuDetails, []);
  const specs = useMemo<Spec[]>(() => {
    const nav = navigator as ExtendedNavigator;
    const ua = navigator.userAgent;
    const platform = nav.userAgentData?.platform || navigator.platform;
    const memory = nav.deviceMemory ? `${nav.deviceMemory} GB (approx.)` : "Not reported";
    const network = nav.connection;
    return [
      { label: "CPU threads", value: `${navigator.hardwareConcurrency || "?"}`, hint: "navigator.hardwareConcurrency" },
      { label: "Memory", value: memory, hint: "deviceMemory (capped by the browser)" },
      { label: "GPU", value: gpu.renderer, hint: gpu.vendor },
      { label: "Graphics API", value: gpu.version, hint: "WebGL" },
      { label: "Display", value: `${screen.width} × ${screen.height}`, hint: `${window.devicePixelRatio.toFixed(2)}× pixel ratio · ${screen.colorDepth}-bit` },
      { label: "Viewport", value: `${window.innerWidth} × ${window.innerHeight}`, hint: "CSS pixels" },
      { label: "Browser", value: browserName(ua), hint: osName(ua, platform) },
      { label: "Network", value: network?.effectiveType ? network.effectiveType.toUpperCase() : "Not reported", hint: network?.downlink ? `~${network.downlink} Mbps down · ${network.rtt ?? "?"} ms RTT` : "Network Information API" },
      { label: "Storage", value: storage || "Checking…", hint: "Origin quota estimate" },
      { label: "Language", value: navigator.language.toUpperCase(), hint: Intl.DateTimeFormat().resolvedOptions().timeZone },
    ];
  }, [gpu, storage]);

  const run = async () => {
    if (phase === "running") return;
    abort.current = false;
    setPhase("running");
    setResult(null);

    setStep("Measuring frame pacing…");
    const fps = await measureFps();
    if (abort.current) return;

    setStep("Stressing the CPU…");
    const cpu = await measureCpu();
    if (abort.current) return;

    setStep("Rendering a GPU pass…");
    const gpuRun = measureGpu();
    if (abort.current) return;

    const overall = Math.round(
      clamp((fps.fps / 60) * 100) * 0.3 + clamp((cpu / 90) * 100) * 0.35 + gpuRun.score * 0.35,
    );
    const grade = overall >= 88 ? "S" : overall >= 75 ? "A" : overall >= 60 ? "B" : overall >= 42 ? "C" : "D";
    setResult({ fps: fps.fps, cpu, gpu: gpuRun.score, gpuMs: gpuRun.ms, overall, grade, samples: fps.samples });
    setStep("Complete.");
    setPhase("done");
  };

  useEffect(() => () => {
    abort.current = true;
  }, []);

  const score = result?.overall ?? 0;
  const metrics = [
    { key: "fps", label: "Frames per second", value: result ? `${result.fps.toFixed(1)}` : "—", sub: "requestAnimationFrame", score: result ? clamp((result.fps / 60) * 100) : 0, icon: Activity },
    { key: "cpu", label: "CPU throughput", value: result ? `${result.cpu.toFixed(1)} M` : "—", sub: "ops / second", score: result ? clamp((result.cpu / 90) * 100) : 0, icon: Cpu },
    { key: "gpu", label: "GPU pass", value: result ? `${result.gpuMs.toFixed(1)} ms` : "—", sub: "24 shader draws", score: result?.gpu ?? 0, icon: Zap },
  ];

  return (
    <div className="bench-page">
      <header className="bench-topbar">
        <Link className="brand" to="/" aria-label="SI GAMES home">
          <span className="brand-mark" aria-hidden="true"><span>SI</span></span>
          <span className="brand-name">SI GAMES</span>
        </Link>
        <span className="bench-live"><i /> {liveFps || "—"} FPS LIVE</span>
        <Link className="bench-back" to="/"><ArrowLeft size={14} /> Library</Link>
      </header>

      <main className="bench-main">
        <span className="section-kicker"><Gauge size={14} /> SYSTEM LAB</span>
        <h1>Benchmark<br /><span>your browser.</span></h1>
        <p className="bench-lead">
          A short, local test of frame pacing, single-thread CPU throughput and GPU shader fill.
          Nothing is uploaded — the timings stay in this tab.
        </p>

        <section className="bench-hero" aria-label="Benchmark controls and score">
          <div className="bench-radar" aria-hidden="true">
            <span className="bench-radar-ring ring-1" />
            <span className="bench-radar-ring ring-2" />
            <span className="bench-radar-ring ring-3" />
            <span className="bench-radar-sweep" />
            <span className="bench-radar-cross" />
          </div>

          <div className={`bench-score ${phase === "running" ? "is-running" : ""} ${result ? "is-done" : ""}`}>
            <span className="bench-score-label">{result ? "OVERALL" : phase === "running" ? "TESTING" : "STANDBY"}</span>
            <strong>{result ? result.overall : phase === "running" ? "··" : "—"}</strong>
            <span className="bench-score-grade">{result ? `GRADE ${result.grade}` : "60 FPS TARGET"}</span>
            <span className="bench-score-track"><i style={{ width: `${result ? score : 0}%` }} /></span>
          </div>

          <div className="bench-action">
            <button type="button" className="bench-run" onClick={run} disabled={phase === "running"}>
              <RefreshCw size={18} className={phase === "running" ? "is-spinning" : ""} />
              {phase === "running" ? "Running test…" : phase === "done" ? "Run again" : "Start benchmark"}
            </button>
            <span className="bench-step" role="status">{phase === "running" ? step : result ? "Results are ready below." : "Takes about four seconds. Keep this tab in front."}</span>
          </div>
        </section>

        <div className="bench-metrics">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <article className={`bench-metric ${result ? "is-done" : ""}`} key={metric.key}>
                <span className="bench-metric-icon"><Icon size={16} /></span>
                <span className="bench-metric-label">{metric.label}</span>
                <strong>{metric.value}</strong>
                <span className="bench-metric-sub">{metric.sub}</span>
                <span className="bench-meter"><i style={{ width: `${result ? metric.score : 0}%` }} /></span>
              </article>
            );
          })}
        </div>

        <section className="bench-frame" aria-labelledby="bench-frame-title">
          <div className="bench-frame-head">
            <div>
              <span className="section-kicker">FRAME TRACE</span>
              <h2 id="bench-frame-title">Last {FPS_WINDOW / 1000}s of pacing</h2>
            </div>
            <span className="bench-frame-badge">{result ? `${result.samples.length} frames` : "waiting"}</span>
          </div>
          <div className="bench-spark-wrap">
            <Sparkline samples={result?.samples ?? []} />
          </div>
        </section>

        <section className="bench-specs" aria-labelledby="bench-specs-title">
          <div className="bench-frame-head">
            <div>
              <span className="section-kicker"><Monitor size={14} /> DEVICE REPORT</span>
              <h2 id="bench-specs-title">What this browser can see.</h2>
            </div>
            <span className="bench-frame-badge"><HardDrive size={12} /> local only</span>
          </div>
          <div className="bench-spec-grid">
            {specs.map((spec) => (
              <article className="bench-spec" key={spec.label}>
                <span>{spec.label}</span>
                <strong title={spec.value}>{spec.value}</strong>
                {spec.hint && <small>{spec.hint}</small>}
              </article>
            ))}
          </div>
          <p className="bench-note">
            <Wifi size={13} /> Browsers deliberately mask some hardware details. CPU model, exact RAM and
            the full GPU name are not exposed to web pages; the values above are the real signals a
            browser will share.
          </p>
        </section>

        <div className="bench-footer">
          <ShareButton className="share-button--footer" title="SI GAMES Benchmark" text="Benchmark your browser on SI GAMES." url="/benchmark" label="Share benchmark" />
          <Link className="bench-back bench-back--inline" to="/">Back to the library</Link>
        </div>
      </main>
    </div>
  );
}

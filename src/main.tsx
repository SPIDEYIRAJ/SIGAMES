import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import React, { StrictMode, useEffect, useRef, useState, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";

// Lazy load route components for better code splitting
const Landing = lazy(() => import("./pages/Landing.tsx"));
const GamePlayer = lazy(() => import("./pages/GamePlayer.tsx"));
const Developers = lazy(() => import("./pages/Developers.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Simple loading fallback for route transitions
function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <div className="route-loading-orbit" aria-hidden="true" />
      <span>CALIBRATING THE NEXT SECTOR</span>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-glow" />
      <div className="boot-content">
        <div className="boot-logo">SI</div>
        <p className="boot-brand">SI GAMES</p>
        <p className="boot-tagline">PLAY. DISCOVER. ENJOY.</p>
        <div className="boot-loader"><span /></div>
        <p className="boot-status">WAKING UP THE ARCADE<span>...</span></p>
      </div>
      <p className="boot-watermark">////SPIDEY_IRAJ////</p>
    </div>
  );
}

const TRAIL_LENGTH = 8;
const STAR_AREA_PER_STAR = 110000;
const FRAME_MS = 32; // ~30fps ceiling, plenty for a parallax starfield
const IDLE_MS = 1600; // the loop stops completely once the user stops moving

/** One canvas + one pooled trail, one rAF loop, and it only runs while you interact. */
function Backdrop() {
  const location = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const isLibrary = location.pathname === "/";

  useEffect(() => {
    if (!isLibrary) return;
    const canvas = canvasRef.current;
    const trail = trailRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canTrail = !reducedMotion && window.matchMedia("(pointer: fine)").matches;
    const starCount = Math.round(Math.min(140, Math.max(40, (window.innerWidth * window.innerHeight) / STAR_AREA_PER_STAR)));
    const stars = Array.from({ length: starCount }, (_, index) => ({
      x: Math.random() * 2.4 - 1.2,
      y: Math.random() * 2.4 - 1.2,
      z: 0.18 + Math.random() * 1.35,
      depth: 0.25 + Math.random() * 1.15,
      size: 0.7 + Math.random() * 2.4,
      tint: index % 9 === 0 ? "255, 111, 145" : index % 5 === 0 ? "107, 177, 255" : "210, 220, 255",
    }));

    const dots = canTrail && trail
      ? Array.from({ length: TRAIL_LENGTH }, () => {
          const dot = document.createElement("i");
          dot.style.opacity = "0";
          trail.appendChild(dot);
          return dot;
        })
      : [];
    const points: { x: number; y: number }[] = [];

    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const scrollMotion = { y: window.scrollY, lastY: window.scrollY, lastEvent: performance.now(), velocity: 0, direction: 1, targetWarp: 0, warp: 0, depth: 0 };
    let width = 0;
    let height = 0;
    let frame = 0;
    let lastFrame = performance.now();
    let lastActivity = lastFrame;
    let lastMove = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      const elapsed = Math.min(0.05, Math.max(0.001, (time - lastFrame) / 1000));
      const ease = 1 - Math.exp(-elapsed * 9);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      scrollMotion.warp += (scrollMotion.targetWarp - scrollMotion.warp) * ease;
      scrollMotion.targetWarp *= 0.86;
      scrollMotion.velocity *= 0.08;
      scrollMotion.depth = (scrollMotion.depth + scrollMotion.velocity * elapsed * 0.0025) % 1.6;

      if (points.length && time - lastMove > 240) points.shift();

      context.clearRect(0, 0, width, height);
      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = Math.min(width, height) * 0.92;
      const zoom = (scrollMotion.y / Math.max(height, 1)) * 0.18;
      const warp = scrollMotion.warp;

      context.globalCompositeOperation = "lighter";
      for (const star of stars) {
        const depth = (((star.z + scrollMotion.depth + zoom) % 1.6) + 1.6) % 1.6;
        const z = depth + 0.12;
        const scale = focalLength / z;
        const parallax = star.depth * (z / star.z);
        const x = centerX + star.x * scale + pointer.x * 42 * parallax;
        const y = centerY + star.y * scale + pointer.y * 34 * parallax;
        const size = Math.max(0.55, star.size * (1.3 - z * 0.4));
        const alpha = Math.min(0.9, Math.max(0.08, 0.7 * (1.2 - z) * (0.6 + star.depth * 0.35)));

        if (warp > 0.05 && z < 1.1) {
          const streak = (0.035 + warp * 0.2) * scrollMotion.direction;
          context.strokeStyle = `rgba(${star.tint}, ${alpha * warp * 0.5})`;
          context.lineWidth = Math.max(0.5, size * 0.45);
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x + (x - centerX) * streak, y + (y - centerY) * streak);
          context.stroke();
        }

        // Two cheap fills replace the old per-star shadowBlur glow.
        if (size > 1.6) {
          context.fillStyle = `rgba(${star.tint}, ${alpha * 0.16})`;
          context.fillRect(x - size, y - size, size * 3, size * 3);
        }
        context.fillStyle = `rgba(${star.tint}, ${alpha})`;
        context.fillRect(x, y, size, size);
      }
      context.globalCompositeOperation = "source-over";

      for (let index = 0; index < dots.length; index += 1) {
        const point = points[points.length - 1 - index];
        const dot = dots[index];
        if (!point) {
          dot.style.opacity = "0";
          continue;
        }
        const scale = 1 - index / dots.length;
        dot.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) scale(${(0.3 + scale * 0.7).toFixed(2)})`;
        dot.style.opacity = (scale * 0.7).toFixed(2);
      }
    };

    const loop = (time: number) => {
      if (time - lastFrame >= FRAME_MS) {
        draw(time);
        lastFrame = time;
      }
      frame = time - lastActivity < IDLE_MS || points.length > 0 || scrollMotion.warp > 0.01
        ? window.requestAnimationFrame(loop)
        : 0;
    };

    const wake = () => {
      lastActivity = performance.now();
      if (!frame && !document.hidden) {
        lastFrame = performance.now() - FRAME_MS;
        frame = window.requestAnimationFrame(loop);
      }
    };

    const handlePointer = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (width) {
        pointer.targetX = Math.max(-1, Math.min(1, (event.clientX / width - 0.5) * 2));
        pointer.targetY = Math.max(-1, Math.min(1, (event.clientY / height - 0.5) * 2));
      }
      if (canTrail) {
        points.push({ x: event.clientX, y: event.clientY });
        if (points.length > TRAIL_LENGTH) points.shift();
        lastMove = performance.now();
      }
      wake();
    };

    const handleScroll = () => {
      const now = performance.now();
      const currentY = window.scrollY;
      const elapsed = Math.max(now - scrollMotion.lastEvent, 16);
      const distance = currentY - scrollMotion.lastY;
      const velocity = (distance / elapsed) * 16;
      scrollMotion.velocity += (velocity - scrollMotion.velocity) * 0.42;
      scrollMotion.targetWarp = Math.min(1, Math.abs(velocity) / 42);
      scrollMotion.direction = Math.sign(distance) || scrollMotion.direction;
      scrollMotion.y = currentY;
      scrollMotion.lastY = currentY;
      scrollMotion.lastEvent = now;
      wake();
    };

    const resetPointer = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
      wake();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else {
        wake();
      }
    };

    resize();
    draw(performance.now());
    if (!reducedMotion) {
      window.addEventListener("resize", resize);
      window.addEventListener("pointermove", handlePointer, { passive: true });
      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("blur", resetPointer);
      document.addEventListener("pointerleave", resetPointer);
      document.addEventListener("visibilitychange", handleVisibility);
      wake();
    }

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("blur", resetPointer);
      document.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", handleVisibility);
      for (const dot of dots) dot.remove();
    };
  }, [isLibrary]);

  if (!isLibrary) return null;

  return (
    <>
      <canvas ref={canvasRef} className="space-starfield" aria-hidden="true" />
      <div ref={trailRef} className="cursor-trail" aria-hidden="true" />
    </>
  );
}

/** Silent error boundary — if VlyToolbar crashes it renders nothing instead of
 *  crashing the whole app (e.g. hook errors in the browser runtime). */
class ToolbarErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: Error) {
    console.warn("[VlyToolbar] Caught error, toolbar disabled:", err.message);
  }
  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

/** Hard guard so runtime errors never leave the preview as a blank page. */
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string; stack: string }
> {
  state = { hasError: false, message: "", stack: "" };
  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown runtime error",
      stack: error.stack || "",
    };
  }
  componentDidCatch(err: Error) {
    console.error("[Preview] Root crash:", err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-lg text-center">
            <p className="text-sm font-semibold">Preview runtime error</p>
            <p className="mt-2 text-xs text-muted-foreground break-words">
              {this.state.message}
            </p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-[10px] leading-4 text-muted-foreground/80 max-h-40 overflow-auto rounded border border-border/60 p-2">
                {this.state.stack}
              </pre>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}


function AppBootstrap() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1050);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ConvexAuthProvider client={convex}>
      <BrowserRouter>
        <RouteSyncer />
        <Backdrop />
        {isLoading ? <LoadingScreen /> : <Suspense fallback={<RouteLoading />}><Routes><Route path="/" element={<Landing />} /><Route path="/developers" element={<Developers />} /><Route path="/gta-vicecity" element={<GamePlayer />} /><Route path="/play/:id" element={<GamePlayer />} /><Route path="*" element={<NotFound />} /></Routes></Suspense>}
      </BrowserRouter>
      <Toaster />
    </ConvexAuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <AppBootstrap />
    </RootErrorBoundary>
  </StrictMode>,
);

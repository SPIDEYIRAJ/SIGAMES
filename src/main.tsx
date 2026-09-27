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

function SpaceCursorTrail() {
  const cursorId = useRef(0);
  const [trail, setTrail] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") return;
      const point = { id: cursorId.current++, x: event.clientX, y: event.clientY };
      setTrail((current) => [...current, point].slice(-10));
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    const fadeTimer = window.setInterval(() => setTrail((current) => current.slice(1)), 85);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.clearInterval(fadeTimer);
    };
  }, []);

  return <div className="cursor-trail" aria-hidden="true">{trail.map((point, index) => <i key={point.id} style={{ left: point.x, top: point.y, opacity: (index + 1) / trail.length * 0.75, transform: `translate(-50%, -50%) scale(${.35 + (index + 1) / trail.length * .65})` }} />)}</div>;
}

function SpaceStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const starCount = window.innerWidth < 720 ? 120 : 210;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stars = Array.from({ length: starCount }, (_, index) => ({
      x: (Math.random() * 2.4 - 1.2),
      y: (Math.random() * 2.4 - 1.2),
      z: 0.18 + Math.random() * 1.35,
      depth: 0.25 + Math.random() * 1.15,
      size: 0.7 + Math.random() * 2.4,
      tint: index % 9 === 0 ? "255, 111, 145" : index % 5 === 0 ? "107, 177, 255" : "210, 220, 255",
    }));
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const scrollMotion = {
      y: window.scrollY,
      lastY: window.scrollY,
      lastEventTime: performance.now(),
      velocity: 0,
      direction: 1,
      targetWarp: 0,
      warp: 0,
      depthOffset: 0,
    };
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let lastFrameTime = performance.now();

    const resize = () => {
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const handlePointer = (event: PointerEvent) => {
      if (!width || !height) return;
      pointer.targetX = Math.max(-1, Math.min(1, (event.clientX / width - 0.5) * 2));
      pointer.targetY = Math.max(-1, Math.min(1, (event.clientY / height - 0.5) * 2));
    };

    const resetPointer = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    const handleScroll = () => {
      const now = performance.now();
      const currentY = window.scrollY;
      const elapsed = Math.max(now - scrollMotion.lastEventTime, 16);
      const distance = currentY - scrollMotion.lastY;
      const instantaneousVelocity = (distance / elapsed) * 16;

      scrollMotion.velocity += (instantaneousVelocity - scrollMotion.velocity) * 0.42;
      scrollMotion.targetWarp = Math.min(1, Math.abs(instantaneousVelocity) / 42);
      scrollMotion.direction = Math.sign(distance) || scrollMotion.direction;
      scrollMotion.y = currentY;
      scrollMotion.lastY = currentY;
      scrollMotion.lastEventTime = now;
    };

    const render = (time: number) => {
      const elapsed = Math.min(0.05, Math.max(0.001, (time - lastFrameTime) / 1000));
      lastFrameTime = time;
      context.clearRect(0, 0, width, height);

      const pointerEase = 1 - Math.exp(-elapsed * 10);
      const warpEase = 1 - Math.exp(-elapsed * 12);
      const idleTime = time - scrollMotion.lastEventTime;
      if (idleTime > 42) scrollMotion.targetWarp *= Math.pow(0.015, elapsed);
      pointer.x += (pointer.targetX - pointer.x) * pointerEase;
      pointer.y += (pointer.targetY - pointer.y) * pointerEase;
      scrollMotion.warp += (scrollMotion.targetWarp - scrollMotion.warp) * warpEase;
      scrollMotion.velocity *= Math.pow(0.08, elapsed);
      scrollMotion.depthOffset = (scrollMotion.depthOffset + scrollMotion.velocity * elapsed * 0.0025) % 1.6;

      const centerX = width / 2;
      const centerY = height / 2;
      const focalLength = Math.min(width, height) * 0.92;
      const scrollZoom = (scrollMotion.y / Math.max(height, 1)) * 0.18;
      const warp = scrollMotion.warp;

      context.save();
      context.globalCompositeOperation = "lighter";
      for (const star of stars) {
        const depth = ((star.z + scrollMotion.depthOffset + scrollZoom) % 1.6 + 1.6) % 1.6;
        const z = depth + 0.12;
        const scale = focalLength / z;
        const parallax = star.depth * (z / star.z);
        const x = centerX + (star.x * scale) + pointer.x * 42 * parallax;
        const y = centerY + (star.y * scale) + pointer.y * 34 * parallax;
        const size = Math.max(0.55, star.size * (1.3 - z * 0.4));
        const opacity = Math.min(0.9, Math.max(0.08, 0.7 * (1.2 - z) * (0.65 + star.depth * 0.35)));

        if (warp > 0.045 && z < 1.08) {
          const streak = (0.035 + warp * 0.2) * scrollMotion.direction;
          context.strokeStyle = `rgba(${star.tint}, ${opacity * warp * 0.55})`;
          context.lineWidth = Math.max(0.5, size * 0.45);
          context.beginPath();
          context.moveTo(x, y);
          context.lineTo(x + (x - centerX) * streak, y + (y - centerY) * streak);
          context.stroke();
        }

        context.shadowBlur = Math.min(18, size * 4);
        context.shadowColor = `rgba(${star.tint}, .8)`;
        context.fillStyle = `rgba(${star.tint}, ${opacity})`;
        context.fillRect(x, y, size, size);
      }
      context.restore();
      context.shadowBlur = 0;
    };

    const animate = (time: number) => {
      render(time);
      frame = window.requestAnimationFrame(animate);
    };

    resize();
    const handleVisibilityChange = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!reducedMotion && !frame) {
        lastFrameTime = performance.now();
        frame = window.requestAnimationFrame(animate);
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("blur", resetPointer);
    document.addEventListener("pointerleave", resetPointer);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (reducedMotion) render(performance.now());
    else frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("blur", resetPointer);
      document.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="space-starfield" aria-hidden="true" />;
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
      <SpaceStarfield />
      <SpaceCursorTrail />
      <BrowserRouter>
        <RouteSyncer />
        {isLoading ? <LoadingScreen /> : <Suspense fallback={<RouteLoading />}><Routes><Route path="/" element={<Landing />} /><Route path="/gta-vicecity" element={<GamePlayer />} /><Route path="/play/:id" element={<GamePlayer />} /><Route path="*" element={<NotFound />} /></Routes></Suspense>}
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

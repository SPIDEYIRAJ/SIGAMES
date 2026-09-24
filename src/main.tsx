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
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
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
    const handlePointerMove = (event: PointerEvent) => {
      const point = { id: cursorId.current++, x: event.clientX, y: event.clientY };
      setTrail((current) => [...current, point].slice(-12));
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

    const stars = Array.from({ length: 210 }, (_, index) => ({
      x: (Math.random() * 2.4 - 1.2),
      y: (Math.random() * 2.4 - 1.2),
      z: 0.18 + Math.random() * 1.35,
      depth: 0.25 + Math.random() * 1.15,
      size: 0.7 + Math.random() * 2.4,
      tint: index % 9 === 0 ? "255, 111, 145" : index % 5 === 0 ? "107, 177, 255" : "210, 220, 255",
    }));
    const pointer = { x: 0, y: 0 };
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

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
      pointer.x = (event.clientX / width - 0.5) * 2;
      pointer.y = (event.clientY / height - 0.5) * 2;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const scrollZoom = (window.scrollY / Math.max(height, 1)) * 0.22;
      const focalLength = Math.min(width, height) * 0.92;

      for (const star of stars) {
        const z = ((star.z + scrollZoom) % 1.6) + 0.12;
        const scale = focalLength / z;
        const parallax = star.depth * (z / star.z);
        const x = width / 2 + (star.x * scale) + pointer.x * 42 * parallax;
        const y = height / 2 + (star.y * scale) + pointer.y * 34 * parallax;
        const size = Math.max(0.55, star.size * (1.3 - z * 0.4));
        const opacity = Math.min(0.9, Math.max(0.08, 0.7 * (1.2 - z) * (0.65 + star.depth * 0.35)));
        const glow = Math.min(18, size * 4);
        context.shadowBlur = glow;
        context.shadowColor = `rgba(${star.tint}, .8)`;
        context.fillStyle = `rgba(${star.tint}, ${opacity})`;
        context.fillRect(x, y, size, size);
      }
      context.shadowBlur = 0;
      frame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointer, { passive: true });
    draw();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointer);
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
        {isLoading ? <LoadingScreen /> : <Suspense fallback={<RouteLoading />}><Routes><Route path="/" element={<Landing />} /><Route path="/play/:id" element={<GamePlayer />} /><Route path="*" element={<NotFound />} /></Routes></Suspense>}
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

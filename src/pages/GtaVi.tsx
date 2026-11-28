import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Play, Globe, RefreshCw, Shield, Loader2 } from "lucide-react";
import { useNavigate } from "react-router";

const GAME_URL = "https://grandtheftgta.com/";
const ASSET_BASE = "https://assets.aceternity.com/gta6";
const POSTER_DURATION = 18000;
const FALLBACK_HANDOVER_MS = 20000;

const LAYERS = [
  { file: "01-jl.webp", name: "J and L",     initialScale: 1.234, delay: 0.46, index: 0  },
  { file: "06-gator.webp", name: "Gator",      initialScale: 1.318, delay: 0.56, index: 1  },
  { file: "04-boobie.webp", name: "Boobie",    initialScale: 1.403, delay: 0.65, index: 2  },
  { file: "03-gal.webp", name: "Gal",         initialScale: 1.518, delay: 0.74, index: 3  },
  { file: "02-biker.webp", name: "Biker",     initialScale: 1.646, delay: 0.84, index: 4  },
  { file: "00-heli.webp", name: "Helicopter", initialScale: 1.797, delay: 0.93, index: 5 },
  { file: "07-raul.webp", name: "Raul",       initialScale: 1.98,  delay: 1.02, index: 6 },
  { file: "05-lambo.webp", name: "Lambo",     initialScale: 2.186, delay: 1.11, index: 7 },
  { file: "08-speedboat.webp", name: "Speedboat", initialScale: 2.42, delay: 1.21, index: 8 },
  { file: "09-logohole.webp", name: "Logo hole", initialScale: 2.446, delay: 1.9,  index: 9 },
  { file: "10-vilogo.webp", name: "VI logo",   initialScale: 2.446, delay: 0.5,  index: 10 },
  { file: "11-gtalogo.webp", name: "GTA logo", initialScale: 3.306, delay: 0.8,  index: 11,
    animate: { clipPath: "inset(0% 0% 0% 0%)" } },
];

const DEFAULT_BG = "radial-gradient(circle at 50% 28%, #2a1133, #080611 72%)";

export default function GtaVi() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState(0);
  const preloaded = useRef(false);
  const playKey = useRef(0);

  // Pre-warm the iframe during the poster so the hand-over feels instant.
  useEffect(() => {
    if (preloaded.current || typeof document === "undefined") return;
    preloaded.current = true;
    const iframe = document.createElement("iframe");
    iframe.src = GAME_URL;
    iframe.style.display = "none";
    iframe.style.position = "absolute";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    document.body.appendChild(iframe);

    const done = () => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
      preloaded.current = false;
    };
    iframe.addEventListener("load", done, { once: true });
    setTimeout(done, FALLBACK_HANDOVER_MS + 4000);
    return () => {
      iframe.removeEventListener("load", done);
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    };
  }, []);

  // Resize-fit
  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const update = () => {
      const b = element.getBoundingClientRect();
      setStageSize(Math.min(b.width, b.height));
    };
    update();
    const r = new ResizeObserver(update);
    r.observe(element);
    return () => r.disconnect();
  }, []);

  const logoSpring: import("framer-motion").Transition = reduceMotion
    ? { duration: 0.4, ease: "easeOut" }
    : {
        type: "spring",
        bounce: 0.5,
        stiffness: 80,
        damping: 14,
        mass: 1,
      };

  const baseTransition: import("framer-motion").Transition = reduceMotion
    ? { duration: 0.4, ease: "easeOut" }
    : { duration: POSTER_DURATION / 1000, ease: [0.33, 0, 0.2, 1] };

  const handoffComplete = useCallback(() => {
    try {
      const node = document.getElementById("gtavi-frame");
      if (node instanceof HTMLElement) {
        node.requestFullscreen?.();
      }
    } catch { /* ignore */ }
  }, []);

  useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node || reduceMotion) return;
    playKey.current += 1;
    const t = setTimeout(() => {
      handoffComplete();
    }, POSTER_DURATION);
    return () => { clearTimeout(t); };
  }, [reduceMotion, handoffComplete]);

  const replayPoster = useCallback(() => {
    playKey.current += 1;
  }, []);

  return (
    <div>
      {/* Top chrome */}
      <div className="gtavi-chrome absolute top-0 left-0 right-0 z-30 flex items-start justify-between px-6 pt-6 pointer-events-none">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3 rounded-xl bg-black/60 px-4 py-2.5 text-sm font-semibold tracking-wide text-white/90 backdrop-blur-md transition hover:bg-black/80 hover:text-white active:scale-[0.98]"
          >
            <Play size={15} />
            <span className="tracking-wider">BACK TO LIBRARY</span>
          </button>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <a
            href={GAME_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-md transition hover:bg-black/80 hover:text-white active:scale-[0.98]"
          >
            <Globe size={13} />
            <span>OPEN SITE</span>
          </a>
          <button
            type="button"
            onClick={() => document.getElementById("gtavi-frame")?.requestFullscreen?.()}
            className="flex items-center gap-2 rounded-xl bg-black/60 px-3 py-2 text-xs font-semibold tracking-wide text-white/80 backdrop-blur-md transition hover:bg-black/80 hover:text-white active:scale-[0.98]"
          >
            <Shield size={13} />
            <span>FULL FRAME</span>
          </button>
        </div>
      </div>

      {/* Poster + handoff stage */}
      <div ref={stageRef} className="gta-vi-stage relative flex h-dvh w-full items-center justify-center overflow-hidden bg-black" style={{ background: DEFAULT_BG }}>
        <AnimatePresence mode="wait">
          {/* Poster layer stack. */}
          {stageSize > 0 && !reduceMotion && (
            <motion.div
              key={`poster-${playKey.current}`}
              className="relative"
              style={{
                width: stageSize,
                height: stageSize,
                transformOrigin: "center",
              }}
              initial={{ scale: 1.14, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={baseTransition}
            >
              {LAYERS.map((layer) => {
                const isGtaLogo = layer.name === "GTA logo";
                const scale = 1 + (layer.initialScale - 1) * 1;
                return (
                  <motion.img
                    key={layer.file}
                    src={`${ASSET_BASE}/${layer.file}`}
                    alt={layer.name}
                    draggable={false}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none"
                    style={{ zIndex: layer.index, transformOrigin: "center" }}
                    initial={{
                      opacity: 0,
                      scale,
                      ...(isGtaLogo
                        ? { filter: "blur(4px)", clipPath: "inset(0% 0% 100% 0%)" }
                        : {}),
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      ...(isGtaLogo
                        ? { filter: "blur(0px)", clipPath: "inset(0% 0% 0% 0%)" }
                        : {}),
                      ...(layer.animate ?? {}),
                    }}
                    transition={{
                      scale: { duration: POSTER_DURATION / 1000, ease: [0.16, 1, 0.3, 1] },
                      opacity: { duration: 0.5, delay: layer.delay, ease: "easeOut" },
                      clipPath: isGtaLogo ? logoSpring : undefined,
                      filter: isGtaLogo ? logoSpring : undefined,
                    }}
                  />
                );
              })}
            </motion.div>
          )}

          {/* Handover stage: poster done → full-frame iframe. */}
          <motion.div
            key="handoff"
            className="gtavi-handoff absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              opacity: { duration: 1.1, ease: "easeOut" },
              delay: reduceMotion ? 0 : POSTER_DURATION / 1000,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="gtavi-frame-wrap w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black">
                <iframe
                  id="gtavi-frame"
                  src={GAME_URL}
                  title="Grand Theft Auto VI"
                  className="gtavi-iframe w-full h-[min(80vh,760px)] rounded-2xl border-0"
                  allowFullScreen={true}
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Status + replay */}
      <div className="gtavi-status absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 rounded-2xl bg-black/70 px-5 py-2.5 backdrop-blur-xl shadow-2xl">
        <Loader2 className="size-4 text-white/50 animate-spin" />
        <span className="text-xs font-semibold tracking-wide text-white/80">
          Loading Grand Theft Auto VI preview…
        </span>
        <span className="text-[10px] font-mono text-white/50">bigbanner · premium</span>
        {!reduceMotion && (
          <button
            type="button"
            onClick={replayPoster}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/70 backdrop-blur-md transition hover:bg-white/20 active:scale-[0.98]"
          >
            <RefreshCw size={11} />
            Replay poster
          </button>
        )}
      </div>
    </div>
  );
}

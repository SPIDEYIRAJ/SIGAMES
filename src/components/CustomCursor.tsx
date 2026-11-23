import { useEffect, useRef } from "react";

/** Anything clickable gets the larger ring, so the pointer reads as arcade UI. */
const INTERACTIVE =
  'a, button, [role="button"], [role="link"], input, textarea, select, summary, label, .game-card, .soundtrack-fab';

/**
 * The site's own pointer: a bright dot with a slowly turning spectral ring.
 *
 * It only activates for precise pointers (mouse/trackpad) and leaves touch,
 * pens and the native cursor untouched. The dot tracks the pointer exactly
 * while the ring eases in behind it; both take their colours from the active
 * theme tokens, and the loop sleeps whenever the pointer is still.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  const haloRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const trail = trailRef.current;
    const halo = haloRef.current;
    if (!dot || !ring || !trail || !halo) return;

    const root = document.documentElement;
    root.classList.add("si-custom-cursor");

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let ringX = target.x;
    let ringY = target.y;
    let trailX = target.x;
    let trailY = target.y;
    let haloX = target.x;
    let haloY = target.y;
    let scale = 1;
    let targetScale = 1;
    let visible = false;
    let frame = 0;

    const paint = () => {
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      trail.style.transform = `translate3d(${trailX}px, ${trailY}px, 0) translate(-50%, -50%) scale(${(scale * 0.65).toFixed(3)})`;
      halo.style.transform = `translate3d(${haloX}px, ${haloY}px, 0) translate(-50%, -50%) scale(${(scale * 1.8).toFixed(3)})`;
      dot.style.opacity = visible ? "1" : "0";
      ring.style.opacity = visible ? "1" : "0";
      trail.style.opacity = visible ? "0.55" : "0";
      halo.style.opacity = visible ? "0.22" : "0";
    };

    const tick = () => {
      frame = 0;
      ringX += (target.x - ringX) * 0.24;
      ringY += (target.y - ringY) * 0.24;
      trailX += (target.x - trailX) * 0.13;
      trailY += (target.y - trailY) * 0.13;
      haloX += (target.x - haloX) * 0.07;
      haloY += (target.y - haloY) * 0.07;
      scale += (targetScale - scale) * 0.22;
      paint();
      const settled =
        Math.abs(target.x - ringX) < 0.15 &&
        Math.abs(target.y - ringY) < 0.15 &&
        Math.abs(target.x - haloX) < 0.2 &&
        Math.abs(target.y - haloY) < 0.2 &&
        Math.abs(targetScale - scale) < 0.002;
      if (!settled) frame = window.requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      target.x = event.clientX;
      target.y = event.clientY;
      visible = true;
      const hit = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
      const card = event.target instanceof Element ? event.target.closest(".cine-card, .game-card, .bp-card") : null;
      targetScale = hit ? 1.55 : 1;
      root.classList.toggle("si-cursor-hot", Boolean(hit));
      root.classList.toggle("si-cursor-card", Boolean(card));
      wake();
    };

    const handleDown = () => {
      targetScale = 0.82;
      wake();
    };

    const handleUp = () => {
      targetScale = 1;
      wake();
    };

    const handleLeave = () => {
      visible = false;
      wake();
    };

    const handleEnter = () => {
      visible = true;
      wake();
    };

    document.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerdown", handleDown, { passive: true });
    document.addEventListener("pointerup", handleUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", handleLeave);
    document.documentElement.addEventListener("pointerenter", handleEnter);
    window.addEventListener("blur", handleLeave);

    return () => {
      window.cancelAnimationFrame(frame);
      root.classList.remove("si-custom-cursor", "si-cursor-hot", "si-cursor-card");
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerdown", handleDown);
      document.removeEventListener("pointerup", handleUp);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
      document.documentElement.removeEventListener("pointerenter", handleEnter);
      window.removeEventListener("blur", handleLeave);
    };
  }, []);

  return (
    <>
      <span ref={haloRef} className="si-cursor-halo" aria-hidden="true" />
      <span ref={trailRef} className="si-cursor-trail" aria-hidden="true" />
      <span ref={ringRef} className="si-cursor-ring" aria-hidden="true"><i /></span>
      <span ref={dotRef} className="si-cursor-dot" aria-hidden="true" />
    </>
  );
}

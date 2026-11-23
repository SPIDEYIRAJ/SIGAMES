import { useEffect } from "react";

/** Slow liquid colour fields behind every route, plus a fine console grain. */
export default function FluidBackdrop() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const paint = () => {
      frame = 0;
      const nx = x / window.innerWidth - 0.5;
      const ny = y / window.innerHeight - 0.5;
      root.style.setProperty("--fluid-x", `${x.toFixed(1)}px`);
      root.style.setProperty("--fluid-y", `${y.toFixed(1)}px`);
      root.style.setProperty("--fluid-nx", nx.toFixed(4));
      root.style.setProperty("--fluid-ny", ny.toFixed(4));
    };

    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      x = event.clientX;
      y = event.clientY;
      root.classList.add("fluid-pointer-live");
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    const leave = () => root.classList.remove("fluid-pointer-live");

    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
      root.classList.remove("fluid-pointer-live");
    };
  }, []);

  return (
    <div className="fluid-aurora" aria-hidden="true">
      <i className="fluid-blob fluid-blob-a" />
      <i className="fluid-blob fluid-blob-b" />
      <i className="fluid-blob fluid-blob-c" />
      <span className="fluid-pointer" />
      <span className="fluid-grid" />
      <span className="fluid-shape fluid-shape-a"><i /><i /><i /></span>
      <span className="fluid-shape fluid-shape-b"><i /><i /><i /></span>
      <span className="fluid-shape fluid-shape-c"><i /><i /><i /></span>
      <span className="fluid-grain" />
    </div>
  );
}

import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "react-router";
import { MOTION_CHANGE_EVENT, motionIsReduced } from "@/lib/motion";

/** Decorative glyphs pinned to the edges so they never sit over copy. */
const GLYPHS = [
  { glyph: "◆", left: "3%", top: "16%", size: 22, duration: 15, delay: -2, dx: 10, dy: -18 },
  { glyph: "△", right: "5%", top: "24%", size: 26, duration: 18, delay: -7, dx: -14, dy: 22 },
  { glyph: "○", left: "6%", top: "58%", size: 34, duration: 21, delay: -4, dx: 18, dy: 12 },
  { glyph: "✕", right: "4%", top: "62%", size: 20, duration: 16, delay: -9, dx: -12, dy: -20 },
  { glyph: "□", left: "2%", top: "82%", size: 18, duration: 19, delay: -3, dx: 16, dy: -10 },
  { glyph: "◇", right: "7%", top: "86%", size: 28, duration: 22, delay: -11, dx: -10, dy: -24 },
  { glyph: "△", left: "12%", top: "36%", size: 14, duration: 17, delay: -6, dx: 22, dy: 14 },
  { glyph: "◆", right: "11%", top: "44%", size: 15, duration: 20, delay: -1, dx: -20, dy: 18 },
] as const;

/**
 * Site-wide motion graphics.
 *
 * - Scroll reveals for sections, cards and footers on every route, applied
 *   with IntersectionObserver so nothing animates off-screen.
 * - A pair of slow orbital rings and edge glyphs behind the content.
 *
 * Everything is presentation only, stops for `prefers-reduced-motion`, and
 * never blocks pointer input.
 */
export default function SiteMotion() {
  const { pathname } = useLocation();
  const [revision, setRevision] = useState(0);

  /** Re-arm whenever the player changes the motion preference. */
  useEffect(() => {
    const sync = () => setRevision((value) => value + 1);
    window.addEventListener(MOTION_CHANGE_EVENT, sync);
    return () => window.removeEventListener(MOTION_CHANGE_EVENT, sync);
  }, []);

  useEffect(() => {
    if (motionIsReduced()) {
      for (const element of Array.from(document.querySelectorAll<HTMLElement>(".motion-reveal"))) {
        element.classList.remove("motion-reveal", "is-inview");
        element.style.removeProperty("--motion-delay");
      }
      return;
    }
    if (!("IntersectionObserver" in window)) return;

    const targets = "main > section, .game-card, .site-footer, .not-found-content";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-inview");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    let frame = 0;
    const scan = () => {
      frame = 0;
      for (const element of Array.from(document.querySelectorAll<HTMLElement>(targets))) {
        if (element.classList.contains("motion-reveal")) continue;
        element.classList.add("motion-reveal");
        const siblings = element.parentElement
          ? Array.from(element.parentElement.children).filter((item) => item.classList.contains("motion-reveal"))
          : [];
        const index = Math.max(0, siblings.indexOf(element));
        element.style.setProperty("--motion-delay", `${Math.min(index, 7) * 55}ms`);
        observer.observe(element);
      }
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(scan);
    };

    schedule();
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname, revision]);

  return (
    <div className="site-motion" aria-hidden="true">
      <span className="site-motion-ring site-motion-ring--a" />
      <span className="site-motion-ring site-motion-ring--b" />
      <span className="site-motion-beam site-motion-beam--a" />
      <span className="site-motion-beam site-motion-beam--b" />
      <span className="site-motion-corner corner-tl" />
      <span className="site-motion-corner corner-tr" />
      <span className="site-motion-corner corner-bl" />
      <span className="site-motion-corner corner-br" />
      <span className="site-motion-scan" />
      {GLYPHS.map((item, index) => (
        <span
          key={`${item.glyph}-${index}`}
          className="site-motion-glyph"
          style={{
            left: "left" in item ? item.left : undefined,
            right: "right" in item ? item.right : undefined,
            top: item.top,
            fontSize: item.size,
            "--glyph-duration": `${item.duration}s`,
            "--glyph-delay": `${item.delay}s`,
            "--glyph-x": `${item.dx}px`,
            "--glyph-y": `${item.dy}px`,
          } as CSSProperties}
        >
          {item.glyph}
        </span>
      ))}
    </div>
  );
}

/**
 * Site-wide cinematic atmosphere: low light trails, a reflective floor, slow
 * drifting dust and two tiny car silhouettes crossing the lower frame. Purely
 * decorative — hidden from assistive tech and disabled by the motion setting.
 */

const DUST = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 88 + 4}%`,
  delay: `${(index % 7) * -1.7}s`,
  duration: `${9 + (index % 5) * 2.2}s`,
}));

export default function CinematicAmbience() {
  return (
    <div className="cine-ambience" aria-hidden="true">
      <span className="amb-glow" />
      <span className="amb-floor" />
      <span className="amb-streak amb-streak--a" />
      <span className="amb-streak amb-streak--b" />
      <span className="amb-streak amb-streak--c" />
      <span className="amb-car amb-car--a">
        <i className="amb-car-body" />
        <i className="amb-car-wheel amb-car-wheel--back" />
        <i className="amb-car-wheel amb-car-wheel--front" />
      </span>
      <span className="amb-car amb-car--b">
        <i className="amb-car-body" />
        <i className="amb-car-wheel amb-car-wheel--back" />
        <i className="amb-car-wheel amb-car-wheel--front" />
      </span>
      <span className="amb-dust">
        {DUST.map((dot, index) => (
          <i key={index} style={{ left: dot.left, top: dot.top, animationDelay: dot.delay, animationDuration: dot.duration }} />
        ))}
      </span>
    </div>
  );
}

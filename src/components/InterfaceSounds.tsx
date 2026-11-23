import { useEffect } from "react";
import { playUiSound, unlockUiSound, type UiSoundKind } from "@/lib/ui-sound";

const HOVER_TARGET =
  '[data-ui-hover], .cine-play, .cine-secondary, .cine-nav-link, .cine-card, .cine-strip-card, .cine-card-play, .cine-card-heart, .cine-chip, .soundtrack-fab, .si-intro-start, .player-icon-button, .player-back, .launch-play';

const CLICK_TARGET = 'button, a[href], [role="button"], summary, label, input[type="range"]';

function soundKind(value: string | null, fallback: UiSoundKind): UiSoundKind {
  return value === "launch" || value === "nav" || value === "back" || value === "hover"
    ? value
    : fallback;
}

/**
 * One delegated listener for the whole interface. Only meaningful controls
 * get hover tones, and the audio context is unlocked by a real pointer/key
 * gesture before anything is allowed to sound.
 */
export default function InterfaceSounds() {
  useEffect(() => {
    const unlock = () => {
      void unlockUiSound();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);

    let lastHover: Element | null = null;

    const handleOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target.closest(HOVER_TARGET) : null;
      if (!target || target === lastHover) return;
      lastHover = target;
      playUiSound(soundKind(target.getAttribute("data-ui-hover"), "hover"));
    };

    const handleOut = (event: PointerEvent) => {
      if (!lastHover) return;
      const next = event.relatedTarget;
      if (next instanceof Node && lastHover.contains(next)) return;
      lastHover = null;
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest(CLICK_TARGET) : null;
      if (!target) return;
      if (target instanceof HTMLInputElement && target.type === "range") return;
      playUiSound(soundKind(target.getAttribute("data-ui-sound"), "click"));
    };

    document.addEventListener("pointerover", handleOver, true);
    document.addEventListener("pointerout", handleOut, true);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
      document.removeEventListener("pointerover", handleOver, true);
      document.removeEventListener("pointerout", handleOut, true);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}

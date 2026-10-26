import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Check, Palette } from "lucide-react";
import { THEMES, applyTheme, readStoredTheme, type ThemeId } from "@/lib/themes";

/**
 * Swatch menu for the SI palettes. Picking one re-colours the whole shell at
 * through the CSS tokens on <html>, and the choice follows the player around.
 */
export default function ThemePicker() {
  const [active, setActive] = useState<ThemeId>(readStoredTheme);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const select = (id: ThemeId) => {
    applyTheme(id);
    setActive(id);
    setOpen(false);
  };

  const current = THEMES.find((theme) => theme.id === active) ?? THEMES[0];

  return (
    <div className="theme-picker" ref={rootRef}>
      <button
        type="button"
        className="theme-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Colour theme: ${current.label}`}
        title="Change colour theme"
      >
        <Palette size={15} />
        <span className="theme-trigger-dot" aria-hidden="true" style={{ background: current.glow }} />
      </button>

      {open && (
        <div className="theme-menu" role="menu" aria-label="Colour themes">
          <p className="theme-menu-title">COLOUR THEME</p>
          {THEMES.map((theme) => {
            const isActive = theme.id === active;
            return (
              <button
                key={theme.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                className={`theme-option${isActive ? " is-active" : ""}`}
                onClick={() => select(theme.id)}
              >
                <span
                  className="theme-swatch"
                  aria-hidden="true"
                  style={{ background: `linear-gradient(135deg, ${theme.accent} 50%, ${theme.glow} 50%)` } as CSSProperties}
                />
                <span className="theme-option-copy">
                  <strong>{theme.label}</strong>
                  <small>{theme.note}</small>
                </span>
                {isActive && <Check size={14} className="theme-check" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

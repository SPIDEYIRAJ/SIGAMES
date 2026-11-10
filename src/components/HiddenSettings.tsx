import { useEffect, useRef, useState } from "react";
import { Gamepad2, X } from "lucide-react";
import {
  CONTROLLERS_STORAGE_KEY,
  isControllersEnabled,
  setControllersEnabled,
} from "@/lib/omnipad";

/**
 * Hidden settings — there is no menu item for it. It opens when you tap any
 * element marked `data-si-secret` (the small "SI" corner marks) five times
 * within 2.5 seconds, then shows the site's unreferenced preferences. At the
 * moment that is one toggle: the OmniPad virtual controller overlay, applied
 * to every game.
 */

const SECRET_TAP_COUNT = 5;
const SECRET_TAP_WINDOW_MS = 2500;
const STORAGE_EVENT = "si-games-hidden-settings-open";

/** Collected counter + broadcaster: the tap listener itself. */
function useSecretTaps(onOpen: () => void) {
  const tapsRef = useRef<{ count: number; firstAt: number }>({ count: 0, firstAt: 0 });

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest("[data-si-secret]")) return;
      event.preventDefault();

      const now = Date.now();
      const taps = tapsRef.current;
      if (now - taps.firstAt > SECRET_TAP_WINDOW_MS || taps.count === 0) {
        taps.count = 1;
        taps.firstAt = now;
        return;
      }
      taps.count += 1;
      if (taps.count >= SECRET_TAP_COUNT) {
        tapsRef.current = { count: 0, firstAt: 0 };
        onOpen();
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [onOpen]);
}

export function HiddenSettings() {
  const [open, setOpen] = useState(false);
  const [controllers, setControllers] = useState(() => isControllersEnabled());
  const modalRef = useRef<HTMLDivElement>(null);

  useSecretTaps(() => {
    // Read the saved setting as the panel opens — doing it in an effect would
    // write state on mount for no reason (and trip the cascading-render lint).
    setControllers(isControllersEnabled());
    setOpen(true);
    window.dispatchEvent(new Event(STORAGE_EVENT));
  });

  useEffect(() => {
    if (!open) return;

    const activationTarget = modalRef.current?.querySelector<HTMLElement>(".hidden-settings-close");
    activationTarget?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      {open && (
        <div className="hidden-settings-backdrop" onClick={() => setOpen(false)}>
          <div
            ref={modalRef}
            className="hidden-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hidden-settings-title"
            aria-describedby="hidden-settings-description"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close hidden-settings-close"
              onClick={() => setOpen(false)}
              aria-label="Close hidden settings"
            >
              <X size={18} />
            </button>
            <div className="extension-icon"><Gamepad2 size={22} /></div>
            <span className="section-kicker">HIDDEN SETTINGS</span>
            <h2 id="hidden-settings-title">Controller overlay</h2>
            <p id="hidden-settings-description">
              Turns the OmniPad virtual gamepad engine on across all games: on-screen
              D-pad, joystick and action buttons, plus any connected Xbox / PlayStation
              controller mapped onto the same overlay. Turn it off again the same way.
            </p>
            <div className="hidden-settings-row">
              <button
                type="button"
                className={`hidden-settings-toggle ${controllers ? "is-on" : ""}`}
                role="switch"
                aria-checked={controllers}
                onClick={() => {
                  setControllersEnabled(!controllers);
                }}
              >
                <span className="hidden-settings-knob" />
                <span className="hidden-settings-state">{controllers ? "On" : "Off"}</span>
              </button>
              <p className="hidden-settings-note" title={CONTROLLERS_STORAGE_KEY}>
                Saved on this device. Applies to the player screen only, in-play.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HiddenSettings;

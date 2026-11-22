import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { clearEverythingForSiteAndGames } from "@/lib/browser-data";

/**
 * Hidden settings — there is no menu item for it. It opens when you tap any
 * element marked `data-si-secret` (the small "SI" corner marks) five times
 * within 2.5 seconds, then offers the browser-data reset.
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
  const [clearing, setClearing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useSecretTaps(() => {
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
            <div className="extension-icon"><Trash2 size={22} /></div>
            <span className="section-kicker">HIDDEN SETTINGS</span>
            <h2 id="hidden-settings-title">Browser data</h2>
            <p id="hidden-settings-description">
              A hidden maintenance panel for this device. The controller overlay has
              been removed, so all that remains is a clean local-data reset.
            </p>

            <h3 className="hidden-settings-subtitle"><Trash2 size={14} /> Reset</h3>
            <p className="hidden-settings-copy">
              Deletes this browser's saved settings, favourites, recent games and cached files,
              then reloads so the startup animation plays again from the mark.
            </p>
            <button
              type="button"
              className="hidden-settings-clear"
              disabled={clearing}
              onClick={async () => {
                setClearing(true);
                await clearEverythingForSiteAndGames();
                window.location.assign("/");
              }}
            >
              {clearing ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}
              {clearing ? "Clearing cache..." : "Clear cache & replay intro"}
            </button>
            <p className="hidden-settings-clear-note">This cannot be undone.</p>
          </div>
        </div>
      )}
    </>
  );
}

export default HiddenSettings;

import { useState } from "react";
import { ArrowRight, X, Zap } from "lucide-react";

const INSTALLER_URL = "https://spideyirajinstaller.freebuff.app/";
const STORAGE_KEY = "si-installer-ad-dismissed";

/**
 * Hard-block notification for the SI Installer. Pure yellow, zero rounding,
 * zero blur — it is meant to hit like a system alert, not melt into the page.
 */
export default function InstallerAd() {
  // Read the dismissal flag once at mount — no state sync needed in an effect.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore storage failures — the block still hides for this session.
    }
  };

  return (
    <aside className="si-ad" role="note" aria-label="SI Installer announcement">
      <img className="si-ad-mark" src="/thumbs/si-installer.svg" alt="" width={52} height={52} />
      <div className="si-ad-copy">
        <span className="si-ad-tag"><Zap size={12} fill="currentColor" /> NEW</span>
        <strong>SI INSTALLER</strong>
        <p>Premium games, installed in one shot. Grab the SI Installer and unlock the full shelf.</p>
      </div>
      <a className="si-ad-cta" href={INSTALLER_URL} target="_self" rel="noreferrer">
        Get the installer <ArrowRight size={16} />
      </a>
      <button type="button" className="si-ad-close" onClick={dismiss} aria-label="Dismiss installer announcement">
        <X size={16} />
      </button>
    </aside>
  );
}

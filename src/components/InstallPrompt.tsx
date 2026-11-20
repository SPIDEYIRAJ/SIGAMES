import { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "si-games-install-dismissed";
const INSTALLED_KEY = "si-games-installed";
const DISMISS_DAYS = 5;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Already on the home screen: the app itself remembers, and standalone mode
 *  is treated as installed even when the flag was never written. */
function alreadyInstalled(): boolean {
  try {
    if (localStorage.getItem(INSTALLED_KEY) === "1") return true;
  } catch {
    // Storage unavailable: fall back to the display mode check below.
  }
  return window.matchMedia("(display-mode: standalone)").matches;
}

function markInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, "1");
  } catch {
    // Private mode: the standalone matchMedia check still hides the card.
  }
}

/** Custom PWA install invitation, with a manual iOS path when no prompt fires. */
export default function InstallPrompt() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios] = useState(() => /iphone|ipad|ipod/i.test(navigator.userAgent) && !("MSStream" in window));

  useEffect(() => {
    if (alreadyInstalled()) {
      markInstalled();
      return;
    }
    if (recentlyDismissed()) return;

    const standalone = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => {
      if (!standalone.matches) return;
      markInstalled();
      setVisible(false);
      setPrompt(null);
    };

    const onPrompt = (event: Event) => {
      event.preventDefault();
      // A prompt queued before installation must not reopen the card.
      if (alreadyInstalled()) return;
      setPrompt(event as InstallEvent);
      window.setTimeout(() => {
        if (!alreadyInstalled()) setVisible(true);
      }, 4200);
    };
    const onInstalled = () => {
      markInstalled();
      setVisible(false);
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standalone.addEventListener?.("change", onDisplayMode);

    // If the browser never offers a prompt (iOS, or a dev preview), still ask
    // with the manual browser-menu path after the page has settled.
    const timer = window.setTimeout(() => {
      if (!alreadyInstalled()) setVisible(true);
    }, ios ? 6500 : 8000);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standalone.removeEventListener?.("change", onDisplayMode);
      if (timer) window.clearTimeout(timer);
    };
  }, [ios]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // The card simply comes back next session.
    }
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") {
      markInstalled();
      setVisible(false);
    }
    setPrompt(null);
  };

  if (!visible) return null;

  return (
    <div className="install-card" role="dialog" aria-label="Install SI GAMES">
      <button type="button" className="install-close" onClick={dismiss} aria-label="Dismiss install invitation">
        <X size={15} />
      </button>
      <div className="install-mark">SI</div>
      <div className="install-copy">
        <strong>Install SI GAMES</strong>
        {ios ? (
          <span>Tap <Share2 size={12} /> Share, then <b>Add to Home Screen</b> for the full-screen arcade.</span>
        ) : prompt ? (
          <span>Full-screen play, faster launches, and the console dashboard on your home screen.</span>
        ) : (
          <span>Open your browser menu and choose <b>Install app</b> to pin the full-screen arcade.</span>
        )}
      </div>
      {!ios && prompt && (
        <button type="button" className="install-action" onClick={() => void install()}>
          <Download size={15} /> Install
        </button>
      )}
    </div>
  );
}

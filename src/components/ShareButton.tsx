import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
  text?: string;
  /** Site-relative path (`/game-name`) or an absolute URL. */
  url: string;
  label?: string;
  /** Icon-only for game cards and player toolbars. */
  compact?: boolean;
  className?: string;
}

/**
 * One share control for the whole site.
 *
 * Uses the platform share sheet where the browser exposes it (Android, iOS,
 * Windows, macOS), so the same button reaches every installed app. Without a
 * share sheet it copies the absolute link and confirms in place.
 */
export default function ShareButton({
  title,
  text,
  url,
  label = "Share",
  compact = false,
  className = "",
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const share = async () => {
    const absolute = new URL(url, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: absolute });
        return;
      } catch (error) {
        // The player dismissed the sheet: leave the page as it is.
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt("Copy this link", absolute);
    }
  };

  return (
    <button
      type="button"
      className={`share-button${compact ? " share-button--compact" : ""}${className ? ` ${className}` : ""}`}
      onClick={share}
      aria-label={copied ? `${title} link copied` : `Share ${title}`}
      title={compact ? `Share ${title}` : undefined}
    >
      {copied ? <Check size={compact ? 16 : 15} /> : <Share2 size={compact ? 16 : 15} />}
      {!compact && <span>{copied ? "Link copied" : label}</span>}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </button>
  );
}

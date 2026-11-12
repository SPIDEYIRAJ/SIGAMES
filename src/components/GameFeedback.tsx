import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { Heart, Loader2, MessageSquare, Sparkles, Star } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import {
  COMMENTS_PER_GAME_PER_PLAYER,
  STAR_LABELS,
  formatAverage,
  timeAgo,
} from "@/lib/feedback";

const STARS = [1, 2, 3, 4, 5] as const;

/** Convex wraps thrown messages, so map the two the player can act on. */
function friendlyError(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : "";
  if (/one comment per game/i.test(message)) return "You have already used your one comment on this game.";
  if (/sign in/i.test(message)) return "Continue as a guest first — one tap, no email.";
  return message || fallback;
}

/**
 * Player signal under the frame: stars, likes and one comment per player per
 * game. Ratings are public counts (no email needed for guests — the site's
 * anonymous account is enough), and everything updates live through Convex.
 */
export default function GameFeedback({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();
  const location = useLocation();
  const summary = useQuery(api.feedback.summary, { gameId });
  const thread = useQuery(api.feedback.commentsForGame, { gameId });
  const setRating = useMutation(api.feedback.setRating);
  const setLike = useMutation(api.feedback.setLike);
  const addComment = useMutation(api.feedback.addComment);

  const [hoverStar, setHoverStar] = useState(0);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mine = summary?.mine ?? null;
  const average = summary?.average ?? 0;
  const likes = summary?.likes ?? 0;
  const ratingCount = summary?.ratingCount ?? 0;
  const comments = thread?.comments ?? [];
  const commented = thread?.commented ?? false;
  const limit = thread?.limit ?? COMMENTS_PER_GAME_PER_PLAYER;
  const signedOut = !authLoading && !isAuthenticated;

  const requireAccount = (message: string) => {
    setError(null);
    setNotice(message);
    return false;
  };

  const rate = async (stars: number) => {
    if (!isAuthenticated) {
      requireAccount("Continue as a guest (one tap, no email) to rate this game.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await setRating({ gameId, stars });
    } catch (cause) {
      setError(friendlyError(cause, "That rating did not save. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = async () => {
    if (!isAuthenticated) {
      requireAccount("Continue as a guest (one tap, no email) to like this game.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await setLike({ gameId, liked: !(mine?.liked ?? false) });
    } catch (cause) {
      setError(friendlyError(cause, "That like did not save. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const postComment = async () => {
    if (!isAuthenticated) {
      requireAccount("Continue as a guest (one tap, no email) to comment.");
      return;
    }
    const text = draft.trim();
    if (!text) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await addComment({ gameId, text });
      setDraft("");
      setNotice("Posted — that is your one comment on this game.");
    } catch (cause) {
      setError(friendlyError(cause, "That comment did not post. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const startGuest = async () => {
    setError(null);
    setNotice(null);
    try {
      await signIn("anonymous");
      setNotice("You are in as a guest — rate away.");
    } catch {
      setError("Guest sign-in did not start. Try the full sign-in instead.");
    }
  };

  const shownStar = hoverStar || mine?.stars || 0;

  return (
    <section className="feedback-panel" aria-label={`Ratings and comments for ${gameTitle}`}>
      <div className="feedback-head">
        <div>
          <span className="section-kicker">
            <Sparkles size={14} /> PLAYER SIGNAL
          </span>
          <h2>
            Rate it. Say it.
            <span className="feedback-title-ghost">{gameTitle}</span>
          </h2>
        </div>
        <div className="feedback-head-stats" aria-live="polite">
          <span className="feedback-head-star">
            <Star size={14} fill="currentColor" /> {formatAverage(average)}
            <small>{ratingCount} rated</small>
          </span>
          <span className="feedback-head-like">
            <Heart size={14} fill="currentColor" /> {likes}
            <small>likes</small>
          </span>
        </div>
      </div>

      <div className="feedback-body">
        <div className="feedback-rate">
          <div className="feedback-stars" role="radiogroup" aria-label={`Rate ${gameTitle} from 1 to 5 stars`}>
            {STARS.map((star) => {
              const active = star <= shownStar;
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={mine?.stars === star}
                  aria-label={`${star} ${star === 1 ? "star" : "stars"} — ${STAR_LABELS[star]}`}
                  title={STAR_LABELS[star]}
                  className={`feedback-star ${active ? "is-on" : ""} ${mine?.stars === star ? "is-mine" : ""}`}
                  onMouseEnter={() => setHoverStar(star)}
                  onMouseLeave={() => setHoverStar(0)}
                  onFocus={() => setHoverStar(star)}
                  onBlur={() => setHoverStar(0)}
                  onClick={() => void rate(star)}
                  disabled={busy}
                >
                  <Star size={22} fill={active ? "currentColor" : "none"} />
                </button>
              );
            })}
            <span className="feedback-star-label">
              {hoverStar ? STAR_LABELS[hoverStar] : mine?.stars ? `Your rating: ${mine.stars}/5` : "Pick a star"}
            </span>
          </div>

          <button
            type="button"
            className={`feedback-like ${mine?.liked ? "is-liked" : ""}`}
            onClick={() => void toggleLike()}
            disabled={busy}
            aria-pressed={Boolean(mine?.liked)}
          >
            <Heart size={17} fill={mine?.liked ? "currentColor" : "none"} />
            {mine?.liked ? "Liked" : "Like this game"}
            <span>{likes}</span>
          </button>

          {signedOut && (
            <div className="feedback-guest">
              <p>
                <b>Sign in to rate and comment.</b> A guest pass is one tap — no email, no password. Only your
                display name and this game leave your browser.
              </p>
              <div className="feedback-guest-actions">
                <button type="button" className="primary-button" onClick={() => void startGuest()}>
                  Continue as guest
                </button>
                <Link className="soft-button" to={`/auth?returnTo=${encodeURIComponent(location.pathname)}`}>
                  Use an email instead
                </Link>
              </div>
            </div>
          )}

          {authLoading && <p className="feedback-muted"><Loader2 size={13} className="spin" /> Checking your session…</p>}
          {error && <p className="feedback-error" role="alert">{error}</p>}
          {notice && <p className="feedback-notice" role="status">{notice}</p>}
        </div>

        <div className="feedback-comments">
          <div className="feedback-comments-head">
            <h3>
              <MessageSquare size={15} /> Comments <span>{comments.length}</span>
            </h3>
            <span className="feedback-rule">
              {limit === 1 ? "One comment per game per person" : `Up to ${limit} comments per game per person`}
            </span>
          </div>

          {comments.length > 0 ? (
            <ul className="comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className={`comment ${comment.mine ? "is-mine" : ""}`}>
                  <span className="comment-avatar" aria-hidden="true">
                    {comment.authorName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="comment-body">
                    <div className="comment-meta">
                      <b>{comment.authorName}</b>
                      {comment.mine && <em>you</em>}
                      <time dateTime={new Date(comment.createdAt).toISOString()}>{timeAgo(comment.createdAt)}</time>
                    </div>
                    <p>{comment.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="comment-empty">No comments yet. Start the conversation — one line is enough.</p>
          )}

          {commented ? (
            <p className="feedback-notice comment-limit">
              You have used your one comment on {gameTitle}. {limit === 1 ? "Your note is in the list above." : ""}
            </p>
          ) : (
            <div className="comment-form">
              <label htmlFor={`comment-${gameId}`} className="comment-form-label">
                Your comment <span>{draft.trim().length}/600 · one per game, per person</span>
              </label>
              <textarea
                id={`comment-${gameId}`}
                rows={3}
                maxLength={600}
                value={draft}
                placeholder={isAuthenticated ? `What did ${gameTitle} feel like to play?` : "Continue as a guest, then write your one comment."}
                onChange={(event) => setDraft(event.target.value)}
                disabled={busy}
              />
              <div className="comment-form-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void postComment()}
                  disabled={busy || !draft.trim()}
                >
                  {busy ? <Loader2 size={15} className="spin" /> : <MessageSquare size={15} />} Post comment
                </button>
                <span className="comment-form-hint">{limit} comment max · 600 characters</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

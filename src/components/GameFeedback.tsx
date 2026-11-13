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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Last name + email typed for a comment, kept for the next game. */
const IDENTITY_KEY = "si-games-commenter";
type CommentIdentity = { name: string; email: string };

function readIdentity(): CommentIdentity {
  try {
    const raw = JSON.parse(localStorage.getItem(IDENTITY_KEY) ?? "null") as Partial<CommentIdentity> | null;
    return {
      name: typeof raw?.name === "string" ? raw.name : "",
      email: typeof raw?.email === "string" ? raw.email : "",
    };
  } catch {
    return { name: "", email: "" };
  }
}

/** Remembers that this browser already spent its one comment on a game. */
function readPosted(gameId: string): CommentIdentity | null {
  try {
    const raw = JSON.parse(localStorage.getItem(`si-games-comment:${gameId}`) ?? "null") as Partial<CommentIdentity> | null;
    return raw && typeof raw.name === "string" && typeof raw.email === "string"
      ? { name: raw.name, email: raw.email }
      : null;
  } catch {
    return null;
  }
}

/** Convex wraps thrown messages, so map the ones the player can act on. */
function friendlyError(cause: unknown, fallback: string): string {
  const message = cause instanceof Error ? cause.message : "";
  if (/already commented/i.test(message)) return "That email already left a comment on this game — one per person.";
  if (/valid email/i.test(message)) return "That email does not look right — check it and try again.";
  if (/add a name/i.test(message)) return "Add a name (at least 2 characters).";
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
  const [name, setName] = useState(() => readIdentity().name);
  const [email, setEmail] = useState(() => readIdentity().email);
  const [posted, setPosted] = useState<CommentIdentity | null>(() => readPosted(gameId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mine = summary?.mine ?? null;
  const average = summary?.average ?? 0;
  const likes = summary?.likes ?? 0;
  const ratingCount = summary?.ratingCount ?? 0;
  const comments = thread?.comments ?? [];
  const limit = thread?.limit ?? COMMENTS_PER_GAME_PER_PLAYER;
  const signedOut = !authLoading && !isAuthenticated;
  /** Either this browser posted already, or this signed-in account did. */
  const commented = Boolean(posted) || comments.some((comment) => comment.mine);
  const canPost = name.trim().length >= 2 && EMAIL_PATTERN.test(email.trim()) && Boolean(draft.trim()) && !busy;

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

  /** No account, no sign-in: name + email are typed right here. */
  const postComment = async () => {
    const text = draft.trim();
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (!text || !cleanName || !EMAIL_PATTERN.test(cleanEmail)) {
      setError("Add a name (2+ characters), a valid email and your comment.");
      return;
    }
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await addComment({ gameId, name: cleanName, email: cleanEmail, text });
      const identity = { name: cleanName, email: cleanEmail };
      try {
        localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
        localStorage.setItem(`si-games-comment:${gameId}`, JSON.stringify(identity));
      } catch {
        // Private mode: the comment still posts, it just is not remembered here.
      }
      setPosted(identity);
      setDraft("");
      setNotice(`Posted as ${cleanName} — that is your one comment on ${gameTitle}.`);
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
        {(error || notice) && (
          <div className="feedback-status" aria-live="polite">
            {error && <p className="feedback-error" role="alert">{error}</p>}
            {notice && <p className="feedback-notice" role="status">{notice}</p>}
          </div>
        )}

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
                <b>Sign in to rate and like.</b> A guest pass is one tap — no email, no password. Comments below
                need no account at all: just a name and an email.
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
              You have used your one comment on {gameTitle}{posted ? ` as ${posted.name}` : ""}.
              {limit === 1 ? " Your note is in the list above." : ""}
            </p>
          ) : (
            <div className="comment-form">
              <div className="comment-identity">
                <label htmlFor={`comment-name-${gameId}`}>
                  <span>Name</span>
                  <input
                    id={`comment-name-${gameId}`}
                    value={name}
                    maxLength={40}
                    autoComplete="name"
                    placeholder="Your display name"
                    onChange={(event) => setName(event.target.value)}
                    disabled={busy}
                  />
                </label>
                <label htmlFor={`comment-email-${gameId}`}>
                  <span>Email</span>
                  <input
                    id={`comment-email-${gameId}`}
                    type="email"
                    inputMode="email"
                    value={email}
                    maxLength={160}
                    autoComplete="email"
                    placeholder="you@example.com"
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
              <p className="comment-email-note">
                No account needed. The email stays private — it is only used to keep it one comment per game, per
                person.
              </p>

              <label htmlFor={`comment-${gameId}`} className="comment-form-label">
                Your comment <span>{draft.trim().length}/600 · one per game, per person</span>
              </label>
              <textarea
                id={`comment-${gameId}`}
                rows={3}
                maxLength={600}
                value={draft}
                placeholder={`What did ${gameTitle} feel like to play?`}
                onChange={(event) => setDraft(event.target.value)}
                disabled={busy}
              />
              <div className="comment-form-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void postComment()}
                  disabled={!canPost}
                >
                  {busy ? <Loader2 size={15} className="spin" /> : <MessageSquare size={15} />} Post comment
                </button>
                <span className="comment-form-hint">Name + email required · email never shown · {limit} max</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

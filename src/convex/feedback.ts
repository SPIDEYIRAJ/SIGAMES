import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * GLOBAL LIMIT — one comment per game, per player.
 *
 * Kept as an exported constant so the rule is stated once and enforced on the
 * server (the (gameId, userId) index below is the actual guard) instead of
 * being re-implemented in every component.
 */
export const COMMENTS_PER_GAME_PER_PLAYER = 1;

/** A comment is a short note, not an essay. */
export const MAX_COMMENT_LENGTH = 600;

const clampStars = (stars: number) => Math.min(5, Math.max(1, Math.round(stars)));

/** A like and a star score are separate gestures sharing one row per player;
 *  stars === 0 means "liked but not rated yet", so it never drags the average. */
function summarize(rows: { stars: number; liked: boolean; userId: string }[], userId: string | null) {
  const likes = rows.filter((row) => row.liked).length;
  const starred = rows.filter((row) => row.stars > 0);
  const starsTotal = starred.reduce((total, row) => total + row.stars, 0);
  return {
    likes,
    ratingCount: starred.length,
    average: starred.length ? starsTotal / starred.length : 0,
    mine: userId ? rows.find((row) => row.userId === userId) ?? null : null,
  };
}

/** Everything the rating strip needs for one title. */
export const summary = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const [ratingRows, commentRows] = await Promise.all([
      ctx.db
        .query("gameRatings")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect(),
      ctx.db
        .query("gameComments")
        .withIndex("by_game", (q) => q.eq("gameId", gameId))
        .collect(),
    ]);
    const userId = await getAuthUserId(ctx);
    const base = summarize(ratingRows, userId);
    return {
      ...base,
      commentCount: commentRows.length,
      commented: userId ? commentRows.some((row) => row.userId === userId) : false,
    };
  },
});

/** The newest comments on one title, plus whether this player already wrote theirs. */
export const commentsForGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }) => {
    const rows = await ctx.db
      .query("gameComments")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .order("desc")
      .take(60);
    const userId = await getAuthUserId(ctx);
    return {
      comments: rows.map((row) => ({
        id: row._id,
        authorName: row.authorName,
        text: row.text,
        createdAt: row.createdAt,
        mine: row.userId === userId,
      })),
      commented: userId ? rows.some((row) => row.userId === userId) : false,
      limit: COMMENTS_PER_GAME_PER_PLAYER,
    };
  },
});

/**
 * Aggregates for the whole shelf in one shot, so game cards can show a star
 * average and like count without a query per card.
 */
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("gameRatings").collect();
    const commentRows = await ctx.db.query("gameComments").collect();
    const perGame: Record<string, { likes: number; ratingCount: number; average: number; commentCount: number }> = {};
    for (const row of rows) {
      const entry = (perGame[row.gameId] ??= { likes: 0, ratingCount: 0, average: 0, commentCount: 0 });
      entry.ratingCount += 1;
      entry.average += row.stars;
      if (row.liked) entry.likes += 1;
    }
    for (const entry of Object.values(perGame)) {
      entry.average = entry.ratingCount ? entry.average / entry.ratingCount : 0;
    }
    for (const row of commentRows) {
      const entry = (perGame[row.gameId] ??= { likes: 0, ratingCount: 0, average: 0, commentCount: 0 });
      entry.commentCount += 1;
    }
    return perGame;
  },
});

/** One star score per player per game, updated in place. */
export const setRating = mutation({
  args: { gameId: v.string(), stars: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to rate this game.");
    const gameId = args.gameId.trim();
    if (!gameId) throw new Error("A rating needs a game.");

    const stars = clampStars(args.stars);
    const existing = await ctx.db
      .query("gameRatings")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { stars, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("gameRatings", {
        gameId,
        userId,
        stars,
        liked: false,
        updatedAt: Date.now(),
      });
    }
    return { ok: true } as const;
  },
});

/** A like is its own tap: liking a game never pretends you rated it. */
export const setLike = mutation({
  args: { gameId: v.string(), liked: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to like this game.");
    const gameId = args.gameId.trim();
    if (!gameId) throw new Error("A like needs a game.");

    const existing = await ctx.db
      .query("gameRatings")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { liked: args.liked, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("gameRatings", {
        gameId,
        userId,
        stars: 0,
        liked: args.liked,
        updatedAt: Date.now(),
      });
    }
    return { ok: true } as const;
  },
});

/** Posts this player's one comment on a game. */
export const addComment = mutation({
  args: {
    gameId: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to comment.");

    const gameId = args.gameId.trim();
    const text = args.text.trim().slice(0, MAX_COMMENT_LENGTH);
    if (!gameId || !text) throw new Error("Write something before posting.");

    const existing = await ctx.db
      .query("gameComments")
      .withIndex("by_game_user", (q) => q.eq("gameId", gameId).eq("userId", userId))
      .take(COMMENTS_PER_GAME_PER_PLAYER);

    if (existing.length >= COMMENTS_PER_GAME_PER_PLAYER) {
      throw new Error("One comment per game per person — you already posted yours.");
    }

    const user = await ctx.db.get(userId);
    const accountName = user?.name?.trim() ?? "";
    const emailHandle = user?.email?.split("@")[0] ?? "";
    const authorName = accountName || emailHandle || `Guest ${userId.slice(-4)}`;

    await ctx.db.insert("gameComments", {
      gameId,
      userId,
      authorName,
      text,
      createdAt: Date.now(),
    });
    return { ok: true } as const;
  },
});

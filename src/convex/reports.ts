import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** The reasons a player can pick from on any game page. */
export const REPORT_REASONS = [
  "Game does not load",
  "Game is broken or buggy",
  "Wrong game or wrong link",
  "Controls do not work",
  "Something else",
] as const;

/**
 * Records a problem report for a single game. Anyone can report, signed in or
 * not: a broken game is worth hearing about either way. Signed-in reporters have
 * their account email attached so a reply is possible.
 */
export const submit = mutation({
  args: {
    gameId: v.string(),
    gameTitle: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const gameId = args.gameId.trim();
    const gameTitle = args.gameTitle.trim();
    const reason = args.reason.trim();
    if (!gameId || !gameTitle || !reason) {
      throw new Error("A report needs a game and a reason.");
    }

    let reporterEmail: string | undefined;
    const userId = await getAuthUserId(ctx);
    if (userId !== null) {
      const user = await ctx.db.get(userId);
      reporterEmail = user?.email ?? undefined;
    }

    const details = args.details?.trim();

    await ctx.db.insert("reports", {
      gameId,
      gameTitle,
      reason,
      details: details ? details.slice(0, 2000) : undefined,
      reporterEmail,
      createdAt: Date.now(),
    });

    return { ok: true } as const;
  },
});

/** How many reports a title has collected, shown next to the report button. */
export const countForGame = query({
  args: { gameId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_game", (q) => q.eq("gameId", args.gameId))
      .collect();
    return rows.length;
  },
});

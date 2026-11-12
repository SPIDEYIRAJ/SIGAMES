import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // One star rating + like per player per game. The (gameId, userId) index is
    // what makes "one rating per person" true in the database, not just in the UI.
    gameRatings: defineTable({
      gameId: v.string(),
      userId: v.string(),
      stars: v.number(),
      liked: v.boolean(),
      updatedAt: v.number(),
    })
      .index("by_game", ["gameId"])
      .index("by_game_user", ["gameId", "userId"]),

    // Community comments. The same index is the one-comment-per-game limit.
    gameComments: defineTable({
      gameId: v.string(),
      userId: v.string(),
      authorName: v.string(),
      text: v.string(),
      createdAt: v.number(),
    })
      .index("by_game", ["gameId"])
      .index("by_game_user", ["gameId", "userId"]),

    // Player-submitted problem reports, one row per submission from a game page.
    reports: defineTable({
      gameId: v.string(),
      gameTitle: v.string(),
      reason: v.string(),
      details: v.optional(v.string()),
      reporterEmail: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_game", ["gameId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;

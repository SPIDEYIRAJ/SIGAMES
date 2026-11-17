import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

/**
 * Couch-play rooms for Big Picture.
 *
 * The TV creates a room with a secret display token. Up to six phones join
 * with the short code; the first phone becomes the host pad and can change the
 * game on the TV. Every phone publishes the latest pad snapshot, and the TV
 * consumes those snapshots to drive the frame.
 */

const MAX_DEVICES = 6;
const STALE_MS = 2 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const padInput = v.object({
  up: v.boolean(),
  down: v.boolean(),
  left: v.boolean(),
  right: v.boolean(),
  a: v.boolean(),
  b: v.boolean(),
  x: v.boolean(),
  y: v.boolean(),
  start: v.boolean(),
  select: v.boolean(),
  stickX: v.number(),
  stickY: v.number(),
  seq: v.number(),
});

function makeCode(): string {
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function makeToken(): string {
  return `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

/** Shared read used by both the TV and the phone views. */
async function readRoom(ctx: QueryCtx | MutationCtx, sessionId: Id<"partySessions">) {
  const session = await ctx.db.get(sessionId);
  if (!session) return null;
  const devices = await ctx.db
    .query("partyDevices")
    .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
    .collect();
  return {
    session: {
      id: session._id,
      code: session.code,
      status: session.status,
      gameId: session.gameId ?? null,
      hostDeviceId: session.hostDeviceId ?? null,
      createdAt: session.createdAt,
    },
    devices: devices
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((device) => ({
        id: device._id,
        deviceId: device.deviceId,
        name: device.name,
        role: device.role,
        joinedAt: device.joinedAt,
        lastSeen: device.lastSeen,
        input: device.input ?? null,
      })),
  };
}

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let code = makeCode();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const existing = await ctx.db
        .query("partySessions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = makeCode();
    }
    const displayToken = makeToken();
    const sessionId = await ctx.db.insert("partySessions", {
      code,
      displayToken,
      status: "lobby",
      createdAt: now,
      updatedAt: now,
    });
    return { sessionId, code, displayToken };
  },
});

export const byCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("partySessions")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    return session ? readRoom(ctx, session._id) : null;
  },
});

export const byId = query({
  args: { sessionId: v.id("partySessions") },
  handler: async (ctx, args) => readRoom(ctx, args.sessionId),
});

export const join = mutation({
  args: {
    code: v.string(),
    deviceId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("partySessions")
      .withIndex("by_code", (q) => q.eq("code", normalizeCode(args.code)))
      .unique();
    if (!session) throw new Error("That room code does not exist.");
    if (session.status === "ended") throw new Error("This room has already closed.");

    const now = Date.now();
    const all = await ctx.db
      .query("partyDevices")
      .withIndex("by_session", (q) => q.eq("sessionId", session._id))
      .collect();

    // Drop phones that stopped sending heartbeats, so a closed tab never
    // permanently takes one of the six seats.
    for (const device of all) {
      if (now - device.lastSeen > STALE_MS) {
        await ctx.db.delete(device._id);
      }
    }
    const live = all.filter((device) => now - device.lastSeen <= STALE_MS);

    const hostAlive = Boolean(
      session.hostDeviceId && live.some((device) => device.deviceId === session.hostDeviceId),
    );

    const existing = live.find((device) => device.deviceId === args.deviceId);
    if (existing) {
      const takesCrown = !hostAlive;
      await ctx.db.patch(existing._id, {
        name: args.name.trim().slice(0, 18) || existing.name,
        lastSeen: now,
        ...(takesCrown ? { role: "host" as const } : {}),
      });
      if (takesCrown) {
        await ctx.db.patch(session._id, { hostDeviceId: existing.deviceId, updatedAt: now });
      }
      return { sessionId: session._id, role: takesCrown ? ("host" as const) : existing.role, code: session.code };
    }

    if (live.length >= MAX_DEVICES) {
      throw new Error("This room is full — six controllers are already connected.");
    }

    const becomesHost = !hostAlive;
    await ctx.db.insert("partyDevices", {
      sessionId: session._id,
      deviceId: args.deviceId,
      name: args.name.trim().slice(0, 18) || "Player",
      role: becomesHost ? "host" : "player",
      joinedAt: now,
      lastSeen: now,
    });
    if (becomesHost) {
      await ctx.db.patch(session._id, { hostDeviceId: args.deviceId, updatedAt: now });
    }
    return {
      sessionId: session._id,
      role: becomesHost ? ("host" as const) : ("player" as const),
      code: session.code,
    };
  },
});

export const heartbeat = mutation({
  args: { sessionId: v.id("partySessions"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("partyDevices")
      .withIndex("by_session_device", (q) =>
        q.eq("sessionId", args.sessionId).eq("deviceId", args.deviceId),
      )
      .unique();
    if (device) await ctx.db.patch(device._id, { lastSeen: Date.now() });
  },
});

export const sendInput = mutation({
  args: {
    sessionId: v.id("partySessions"),
    deviceId: v.string(),
    input: padInput,
  },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("partyDevices")
      .withIndex("by_session_device", (q) =>
        q.eq("sessionId", args.sessionId).eq("deviceId", args.deviceId),
      )
      .unique();
    if (!device) return;
    await ctx.db.patch(device._id, { lastSeen: Date.now(), input: args.input });
  },
});

/** The host phone picks the game; the TV may also set it with its token. */
export const setGame = mutation({
  args: {
    sessionId: v.id("partySessions"),
    gameId: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    displayToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Room not found.");
    const byToken = Boolean(args.displayToken && args.displayToken === session.displayToken);
    if (!byToken) {
      if (!args.deviceId || args.deviceId !== session.hostDeviceId) {
        throw new Error("Only the host controller can change the game.");
      }
    }
    await ctx.db.patch(args.sessionId, {
      gameId: args.gameId,
      status: args.gameId ? "live" : "lobby",
      updatedAt: Date.now(),
    });
  },
});

export const promote = mutation({
  args: {
    sessionId: v.id("partySessions"),
    displayToken: v.string(),
    deviceId: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.displayToken !== args.displayToken) {
      throw new Error("Only the display can change the host.");
    }
    const devices = await ctx.db
      .query("partyDevices")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const device of devices) {
      const role = device.deviceId === args.deviceId ? "host" : "player";
      if (device.role !== role) await ctx.db.patch(device._id, { role });
    }
    await ctx.db.patch(args.sessionId, {
      hostDeviceId: args.deviceId,
      updatedAt: Date.now(),
    });
  },
});

export const leave = mutation({
  args: { sessionId: v.id("partySessions"), deviceId: v.string() },
  handler: async (ctx, args) => {
    const device = await ctx.db
      .query("partyDevices")
      .withIndex("by_session_device", (q) =>
        q.eq("sessionId", args.sessionId).eq("deviceId", args.deviceId),
      )
      .unique();
    if (!device) return;
    await ctx.db.delete(device._id);
    const session = await ctx.db.get(args.sessionId);
    if (session && session.hostDeviceId === args.deviceId) {
      const rest = await ctx.db
        .query("partyDevices")
        .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
        .collect();
      const next = rest.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (next) {
        await ctx.db.patch(next._id, { role: "host" });
        await ctx.db.patch(args.sessionId, { hostDeviceId: next.deviceId, updatedAt: Date.now() });
      } else {
        await ctx.db.patch(args.sessionId, { hostDeviceId: undefined, updatedAt: Date.now() });
      }
    }
  },
});

export const end = mutation({
  args: { sessionId: v.id("partySessions"), displayToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.displayToken !== args.displayToken) return;
    const devices = await ctx.db
      .query("partyDevices")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const device of devices) await ctx.db.delete(device._id);
    await ctx.db.patch(args.sessionId, { status: "ended", gameId: undefined, updatedAt: Date.now() });
  },
});

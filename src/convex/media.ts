import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * The SI GAMES theme song, looped across the site. Playback is handled by
 * `src/lib/theme-song.ts`; this query only resolves the storage URL once.
 */
const THEME_SONG_ID = "kg2cz3s0q6kbhn69jfha331zr18jhv09";

export const themeSong = query({
  args: {},
  handler: async (ctx) => {
    const url = await ctx.storage.getUrl(THEME_SONG_ID as Id<"_storage">);
    return { url };
  },
});

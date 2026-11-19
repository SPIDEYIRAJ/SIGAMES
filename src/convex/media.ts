import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Startup media stored in Convex storage.
 *
 * Add more audio ids to this list as songs are uploaded; the entry screen plays
 * them in order. The video is the visual intro that runs behind the sound gate.
 */
const INTRO_AUDIO_IDS = [
  "kg2b0vv99pnrkpthpqzcsg87eh8je20t",
] as const;

const INTRO_VIDEO_ID = "kg23jdxpk3gvkj3dnb3e3j35zs8je88m";

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

export const introMedia = query({
  args: {},
  handler: async (ctx) => {
    const audioUrls = await Promise.all(
      INTRO_AUDIO_IDS.map((id) => ctx.storage.getUrl(id as Id<"_storage">)),
    );
    const videoUrl = await ctx.storage.getUrl(INTRO_VIDEO_ID as Id<"_storage">);

    return {
      tracks: audioUrls.filter((url): url is string => Boolean(url)),
      videoUrl,
    };
  },
});

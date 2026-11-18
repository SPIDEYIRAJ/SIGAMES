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

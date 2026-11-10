/** One line of a release note. The marker matches changes.log's own letters. */
export type ChangeKind = "ADD" | "FIX" | "CHG" | "DEL";

export type ChangeItem = {
  kind: ChangeKind;
  title: string;
  detail: string;
};

export type Release = {
  date: string;
  title: string;
  summary: string;
  items: ChangeItem[];
};

/** Newest release first — the same order changes.log keeps. */
export const changelog: Release[] = [
  {
    date: "2026-11-10",
    title: "The big library drop",
    summary: "94 new titles, real cover art for the first wave, and two new pages to keep track of everything.",
    items: [
      {
        kind: "ADD",
        title: "94 new games on the shelf",
        detail:
          "SMASHLINE and CHOMPOCALYPSE lead the drop, followed by StarCraft on the OpenBW engine, Mario Kart 64 Online, Super Mario Galaxy, the whole Budokai line, Tekken 4 and 5, SSX 3, Soulcalibur II, Daggerfall, wipEout, PSO Reborn, the romhack compendiums and more. Each one was checked against the existing library first, so nothing here is a duplicate card.",
      },
      {
        kind: "ADD",
        title: "Cover art for the first 26 arrivals",
        detail:
          "The confirmed page-one covers now replace the generated star art on those cards, including FIFA 14, NFS Underground 2, PES 2011 and Burnout 3, which had art of their own before.",
      },
      {
        kind: "CHG",
        title: "Hosts that refuse the frame hand the link over",
        detail:
          "Every new host was probed for X-Frame-Options and frame-ancestors. Where a site refuses to be framed it becomes a hand-over card instead of a dead window — the same rule the library already applied to its older external titles.",
      },
      {
        kind: "ADD",
        title: "Change list and New games pages",
        detail:
          "Two new shelves: one lists what changed and when, the other collects the latest drop. Both are paged, and the page number lives in the address so a page can be linked or reloaded.",
      },
      {
        kind: "DEL",
        title: "Duplicate submissions skipped",
        detail:
          "Around twenty titles from the submission table were already in the library. Those did not get a second card: where the new link pointed at a different host it was added as a server mirror on the existing card instead.",
      },
    ],
  },
  {
    date: "2026-11-09",
    title: "Player layout and the OmniPad",
    summary: "The game now fills the frame in every fullscreen state, and touch players get a real controller.",
    items: [
      {
        kind: "FIX",
        title: "Fullscreen no longer half-fills the page",
        detail:
          "In immersive and native fullscreen the player was laying out as a row, so the game sat on the left while the device note claimed the rest of the width. The note is hidden in both states and the main column stacks, with the frame pinned to the edges.",
      },
      {
        kind: "ADD",
        title: "OmniPad virtual controller",
        detail:
          "An on-screen gamepad for the games that only understand a keyboard, with a hidden settings panel for its layout and opacity.",
      },
      {
        kind: "CHG",
        title: "Keyboard shortcuts keep working in the frame",
        detail:
          "Clicking into the frame gives the game the keyboard, and Escape still releases the immersive layout.",
      },
    ],
  },
  {
    date: "2026-10-26",
    title: "Colour themes and a header fix",
    summary: "The shell moved onto CSS custom properties, so one rule set recolours the whole site.",
    items: [
      {
        kind: "ADD",
        title: "Six colour themes",
        detail:
          "Nebula, Plasma, Crimson, Tidal, Toxic and Solar. The switcher sits in the header, the choice is stored locally and applied before first paint, and the starfield and browser chrome follow the active palette.",
      },
      {
        kind: "ADD",
        title: "Six new titles",
        detail: "Slither.io, Shell Shockers, Surviv.io, Sandspiel, Hextris and Skribbl.io, all verified to load in-frame.",
      },
      {
        kind: "FIX",
        title: "Header layout",
        detail:
          "The stylesheet had always targeted a header wrapper that did not exist, so brand, nav and status stacked flush to the viewport edge. The wrapper is back and the row is centred on desktop.",
      },
      {
        kind: "FIX",
        title: "Lint back to zero errors",
        detail: "The remaining warnings are the pre-existing react-refresh notices on template files.",
      },
    ],
  },
];

/** Flat count, used by the page headers. */
export const changeItemCount = changelog.reduce((total, release) => total + release.items.length, 0);

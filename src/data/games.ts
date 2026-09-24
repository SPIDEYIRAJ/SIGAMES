export type Game = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
  controls: string;
  thumbnail: string;
  sourceUrl: string;
  type: "iframe" | "external";
  extensionNotice?: boolean;
  extensionUrl?: string;
};

export const games: Game[] = [
  {
    id: "subway-surfers-city",
    title: "Subway Surfers City",
    category: "Arcade",
    tags: ["Endless Runner", "Browser Games"],
    description: "Run, dodge obstacles, collect coins and keep going as far as possible.",
    controls: "Arrow keys or swipe to move, jump and slide. Keep moving to stay ahead of the train.",
    thumbnail: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=85",
    sourceUrl: "https://szhong.4399.com/4399swf//upload_swf/ftp35/liuxinyu/20210324/jj01/index.html",
    type: "iframe",
  },
  {
    id: "subway-surfers-classic",
    title: "Subway Surfers Classic",
    category: "Arcade",
    tags: ["Endless Runner", "Classic"],
    description: "The classic endless-running experience.",
    controls: "Use arrow keys or swipe to dodge, jump and slide. Collect coins and avoid the barriers.",
    thumbnail: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQd1SZsWQHnOoHRrrgnZ5LWHhO-PujYzay5GFmNItW3aA&s=10",
    sourceUrl: "https://g.igroutka.ru/games/164/ZXLa594fek6p7nVR/10/subway_surfers_classic/",
    type: "iframe",
  },
  {
    id: "geometry-dash-lite",
    title: "Geometry Dash Lite",
    category: "Arcade",
    tags: ["Rhythm", "Puzzle"],
    description: "Jump, fly and survive challenging rhythm-based levels.",
    controls: "Tap, click or press Space to jump. Time each move to the beat and avoid the spikes.",
    thumbnail: "https://geometrydash-pc.com/data/image/options/logo-geometry-dash.webp",
    sourceUrl: "https://geometrydash-pc.com/play/gdlite/",
    type: "iframe",
  },
  {
    id: "minecraft-eaglercraft",
    title: "Minecraft — Eaglercraft",
    category: "Sandbox",
    tags: ["Survival", "Adventure", "Browser Games"],
    description: "Shape your own blocky world in a browser-based survival sandbox.",
    controls: "Use the mouse to look around and the keyboard to move, jump and build.",
    thumbnail: "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=85",
    sourceUrl: "https://eaglercraft.com",
    type: "iframe",
    extensionNotice: true,
    extensionUrl: "https://chromewebstore.google.com/detail/jkijbninecngmcipaijcnibjhbejaoch?utm_source=item-share-cb",
  },
];

export const categories = ["All Games", "Action", "Arcade", "Racing", "Adventure", "Sandbox", "Sports", "Multiplayer", "Puzzle", "Classic", "Browser Games"];

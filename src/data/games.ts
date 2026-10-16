/** Cover art, screenshots and video attached to a title's page. */
export type GameMedia = {
  /** Transparent logo mark shown over the banner. */
  logo?: string;
  /** Wide key art used as the hero image and video poster. */
  banner?: string;
  screenshots?: { src: string; caption: string }[];
  trailer?: { src: string; poster?: string; caption: string };
  videos?: { id: string; title: string; author: string; poster: string }[];
  /** Structured extras such as developer, publisher and release date. */
  facts?: { label: string; value: string }[];
};

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
  /** True for the locally hosted HTML browser games added from the source packet. */
  htmlGame?: boolean;
  /** Marks a freshly added title in the library. */
  isNew?: boolean;
  heavy?: boolean;
  /** Hides every outbound affordance and locks down view-source / devtools. */
  lockLinks?: boolean;
  /** Served from its own top-level page (for example /gta-vicecity). */
  standalone?: boolean;
  /** Opens the title in the player's own browser tab instead of the in-page launcher (GTA V). */
  openInNewTab?: boolean;
  extensionNotice?: boolean;
  extensionUrl?: string;
  /** Gallery and game information shown on the title's own page. */
  media?: GameMedia;
};

/** Decodes a target that is kept out of plain view in the shipped source. */
function decodeTarget(encoded: string): string {
  try {
    return typeof atob === "function" ? atob(encoded) : "";
  } catch {
    return "";
  }
}

/** Deterministic star cover so locally hosted games get art without remote images. */
function cover(seed: number): string {
  let state = (seed * 2654435761) % 4294967296;
  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const hue = Math.floor(random() * 360);
  const hueB = (hue + 40 + Math.floor(random() * 60)) % 360;
  const cx = 90 + random() * 220;
  const cy = 80 + random() * 150;
  const radius = 42 + random() * 46;

  let stars = "";
  for (let i = 0; i < 26; i += 1) {
    const x = Math.round(random() * 400);
    const y = Math.round(random() * 300);
    const r = (0.7 + random() * 1.5).toFixed(2);
    const o = (0.2 + random() * 0.65).toFixed(2);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${o}"/>`;
  }
  const ring = random() > 0.45
    ? `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${(radius * 1.9).toFixed(0)}" ry="${(radius * 0.5).toFixed(0)}" fill="none" stroke="hsl(${hueB} 80% 78%)" stroke-opacity=".28" stroke-width="1.5" transform="rotate(-18 ${cx.toFixed(0)} ${cy.toFixed(0)})"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 58% 24%)"/><stop offset="1" stop-color="hsl(${hueB} 52% 11%)"/></linearGradient><radialGradient id="p" cx="34%" cy="28%"><stop offset="0" stop-color="hsl(${hueB} 88% 74%)"/><stop offset="1" stop-color="hsl(${hue} 72% 40%)"/></radialGradient></defs><rect width="400" height="300" fill="url(#b)"/>${stars}${ring}<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${radius.toFixed(0)}" fill="url(#p)"/></svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
}

type LocalGame = [title: string, category: string, tags: string[], description: string, controls: string];


const localGames: LocalGame[] = [
  ["Starfighter SI-01", "Action", ["Shooter", "Space", "Original"], "Fly the SI-01 through the debris belt and hold your line as long as you can.", "Move with the arrow keys or the mouse, fire with Space or click. Every cleared wave raises the stakes."],
  ["Candy Crush", "Puzzle", ["Match 3", "Casual"], "Swap candies and clear the board in endless or timed mode.", "Click or tap two adjacent candies to swap them. Match three or more in a row to clear them."],
  ["Pac-Man", "Arcade", ["Maze", "Classic"], "Clear every dot on the maze while the ghosts hunt you down.", "Use the arrow keys or W A S D to steer. Eat the power pellet to turn the tables on the ghosts."],
  ["Chess", "Puzzle", ["Strategy", "Classic"], "The full board game against a built-in opponent.", "Click a piece to select it, then click a highlighted square to move. Castling and promotion are supported."],
  ["Doodle Jump", "Arcade", ["Platform", "Endless"], "Bounce upward through platforms as high as you can climb.", "Steer with the arrow keys or A D. The platforms fall away, so keep climbing."],
  ["Solitaire", "Classic", ["Cards", "Puzzle"], "Klondike solitaire with the classic draw and stock rules.", "Click a card or a stack to move it. Double-click the stock to deal a new card, or the waste to send it back."],
  ["Sudoku", "Puzzle", ["Numbers", "Logic"], "Fill the 9x9 grid so every row, column and box adds up.", "Click a cell then type 1-9. Conflicting entries turn red so you can spot mistakes."],
  ["Crossy Road", "Arcade", ["Endless", "Adventure"], "Hop across lanes of traffic and never stop moving.", "Use the arrow keys, W A S D, or swipe to hop forward and sideways. One extra life."],
  ["Rock Paper Scissors", "Classic", ["Quick", "Versus"], "Classic best-of throwdown against the computer.", "Pick rock, paper or scissors, then click throw. First to the target score wins."],
  ["Flappy Bird", "Arcade", ["Endless", "One Button"], "Thread the gaps and keep the bird airborne.", "Click, tap or press Space to flap upward. Let go to fall."],
  ["2048", "Puzzle", ["Numbers", "Casual"], "Slide the tiles and build the 2048 tile.", "Use the arrow keys to push the whole board. Merge equal numbers to double them."],
  ["Wordle", "Puzzle", ["Words", "Daily"], "Guess the hidden word in six tries using color clues.", "Type a word and press Enter. Green means correct spot, yellow means wrong spot."],
  ["Hangman", "Puzzle", ["Words", "Classic"], "Guess the word one letter at a time before the run ends.", "Type a letter and press Enter, or guess the whole word. Six wrong guesses ends the round."],
  ["Tower Blocks", "Arcade", ["Skill", "Stacking"], "Balance the growing tower and drop each block true.", "Move with the mouse or arrow keys, then click or press Space to drop the block."],
  ["Archery", "Action", ["Aim", "Skill"], "Hit the bullseye and beat the clock across rounds.", "Hold and release the mouse or Space to draw the bow. Power sets the arrow speed, aim sets the flight."],
  ["Tic Tac Toe", "Classic", ["Strategy", "Versus"], "Three in a row against a sharp computer opponent.", "Click any empty square to place your mark."],
  ["Minesweeper", "Puzzle", ["Logic", "Classic"], "Clear the board without detonating a mine.", "Click to reveal a cell, right-click to flag it. Numbers show how many mines touch that cell."],
  ["Speed Typing", "Classic", ["Typing", "Reflex"], "Type the passage as fast and as accurately as you can.", "Just start typing. The clock runs until you finish the whole text."],
  ["Breakout", "Arcade", ["Paddle", "Classic"], "Bounce the ball and knock out every brick.", "Move the mouse or use the arrow keys to slide the paddle. Don't drop the ball."],
  ["Ping Pong", "Sports", ["Versus", "Reflex"], "Fast table tennis against a quick computer returner.", "Move with the mouse or the W and S keys. The first to eleven takes the match."],
  ["Tetris", "Arcade", ["Blocks", "Classic"], "Stack falling tetrominoes and clear complete lines.", "Arrow keys to move and rotate, down arrow to soft drop, space to hard drop."],
  ["Tilting Maze", "Puzzle", ["Maze", "Reflex"], "Guide the ball through the maze by tilting the board.", "Tilt with the arrow keys or W A S D. The ball keeps rolling with gravity."],
  ["Memory Card", "Puzzle", ["Memory", "Cards"], "Flip two cards at a time and match every pair.", "Click a card to flip it, then click a second to test the pair."],
  ["Number Guessing", "Classic", ["Numbers", "Quick"], "Find the hidden number in as few guesses as possible.", "Type a number and press Enter. Warmer and colder hints point you in the right direction."],
  ["Snake", "Arcade", ["Classic", "Reflex"], "Eat the food, grow longer, and stay off the walls.", "Steer with the arrow keys or W A S D."],
  ["Connect Four", "Classic", ["Strategy", "Versus"], "Drop tokens and line up four before the computer does.", "Click a column to drop your token into it."],
  ["Insect Catcher", "Action", ["Reflex", "Quick"], "Swat the fast insects and let the harmless ones go.", "Click or tap an insect to squash it. Grabbing a ladybird costs you points."],
  ["Speed Typer", "Classic", ["Typing", "Speed"], "Race the clock across random words and sentences.", "Type the text shown. Correct letters lock in green, mistakes flash red."],
  ["Dice Roll", "Classic", ["Dice", "Quick"], "Roll one or many dice and read the totals instantly.", "Set the dice count, then press roll to shake and total them."],
  ["Shape Clicker", "Arcade", ["Reflex", "Quick"], "Click the matching shape as fast as it appears.", "Click the shape named on screen before the timer runs out."],
  ["Typing Challenge", "Classic", ["Typing", "Words"], "Type the quote correctly before the clock wipes it.", "Type along with the quote. Backspace is allowed, mistakes cost time."],
  ["Speak Number Guess", "Classic", ["Voice", "Numbers"], "Say the number out loud and the game listens for it.", "Allow microphone access, then speak the number you think is hidden."],
  ["Fruit Slicer", "Action", ["Reflex", "Fun"], "Slice the fruit and dodge the bombs.", "Drag across the screen to cut everything in the swipe path."],
  ["Quiz", "Puzzle", ["Quiz", "Trivia"], "Answer the questions and climb the scoreboard.", "Click the answer you think is right. Each correct answer adds to your streak."],
  ["Emoji Catcher", "Arcade", ["Reflex", "Fun"], "Catch the good emoji and avoid the bombs.", "Move with the mouse or arrow keys and collect what falls."],
  ["Whack-a-mole", "Arcade", ["Reflex", "Classic"], "Whack the mole before it dives back underground.", "Click or tap the moles as they pop up. Each one is worth more than the last."],
  ["Simon Says", "Classic", ["Memory", "Reflex"], "Repeat the growing colour and sound sequence.", "Click the coloured pads in the order they light up. Survive as many rounds as you can."],
  ["Sliding Puzzle", "Puzzle", ["Tiles", "Logic"], "Slide the numbered tiles back into perfect order.", "Click a tile next to the gap to slide it. Use shuffle if you get stuck."],
  ["Mastermind", "Puzzle", ["Logic", "Strategy"], "Crack the secret code using smart feedback.", "Click pegs to cycle their colour, then submit. Black and white pegs show how close you are."],
  ["Blackjack", "Classic", ["Cards", "Casual"], "Twenty-one against the dealer, played properly.", "Click to hit or stand. Blackjack pays three to two. Dealer stands on soft seventeen."],
  ["Bubble Shooter", "Puzzle", ["Bubbles", "Match"], "Match three or more bubbles and clear the board.", "Aim with the mouse, click or tap to shoot, and swap colours with the right button."],
  ["Checkers", "Classic", ["Strategy", "Board"], "The classic draughts board with jumping captures.", "Click a piece then a highlighted square to move. Long-range jumps are legal."],
  ["Space Invaders", "Arcade", ["Shooter", "Classic"], "Defend the planet from descending waves of invaders.", "Use the arrow keys to move and fire. Clear a wave to face a faster one."],
  ["Asteroids", "Arcade", ["Shooter", "Space"], "Drift through open space and split incoming rocks.", "Thrust with the up arrow, rotate with the left and right arrows, fire with Space."],
  ["Reversi", "Classic", ["Strategy", "Board"], "Flip discs to trap your opponent's pieces.", "Click a valid square to place a disc. You must flip at least one enemy disc."],
  ["Mahjong Solitaire", "Classic", ["Tiles", "Match"], "Clear the layered tile pyramid by matching free pairs.", "Click two tiles that match and are not covered. Clear the whole layout to win."],
  ["Frogger", "Arcade", ["Retro", "Adventure"], "Carry the frog safely across the traffic and the river.", "Use the arrow keys to hop. Use the logs to ride across the water."],
  ["Poker", "Classic", ["Cards", "Strategy"], "Five-card draw poker against the computer table.", "Choose your cards, then draw. Make the best hand you can from seven cards."],
  ["Battleship", "Puzzle", ["Strategy", "Board"], "Sink the hidden fleet before the computer sinks yours.", "Click a cell to fire. A hit or miss mark appears. Sink every ship to win."],
  ["Nonogram", "Puzzle", ["Logic", "Picross"], "Use the numbers to paint the hidden picture.", "Click a cell to fill it, right-click to mark it empty. The numbers show each row and column's run lengths."],
  ["Lights Out", "Puzzle", ["Logic", "Strategy"], "Flip the grid to switch every light off.", "Click any square to toggle it and its neighbours. Clear the whole board."],
];

// Directory names under public/games, in the same order as localGames above.
const localSlugs = [
  "51-starfighter-si-01",
  "01-candy-crush-game",
  "02-pac-man-game",
  "03-chess-game",
  "04-doodle-jump-game",
  "05-solitaire-game",
  "06-sudoku-game",
  "07-crossy-road-game",
  "08-rock-paper-scissors",
  "09-flappy-bird-game",
  "10-2048-game",
  "11-wordle-game",
  "12-hangman-game",
  "13-tower-blocks",
  "14-archery-game",
  "15-tic-tac-toe",
  "16-minesweeper-game",
  "17-speed-typing-game",
  "18-breakout-game",
  "19-ping-pong-game",
  "20-tetris-game",
  "21-tilting-maze-game",
  "22-memory-card-game",
  "23-type-number-guessing-game",
  "24-snake-game",
  "25-connect-four-game",
  "26-insect-catch-game",
  "27-typing-game",
  "28-dice-roll-simulator",
  "29-shape-clicker-game",
  "30-typing-game",
  "31-speak-number-guessing-game",
  "32-fruit-slicer-game",
  "33-quiz-game",
  "34-emoji-catcher-game",
  "35-whack-a-mole-game",
  "36-simon-says-game",
  "37-sliding-puzzle-game",
  "38-mastermind-game",
  "39-blackjack-game",
  "40-bubble-shooter-game",
  "41-checkers-game",
  "42-space-invaders-game",
  "43-asteroids-game",
  "44-reversi-game",
  "45-mahjong-solitaire-game",
  "46-frogger-game",
  "47-poker-game",
  "48-battleship-game",
  "49-nonogram-game",
  "50-lights-out-game",
];

// The three headline titles lead the library, in this order, then the rest follow.
export const games: Game[] = [
  {
    id: "gta-v",
    title: "Grand Theft Auto V",
    category: "Action",
    tags: ["Open World", "Action", "Browser Ready"],
    description: "A browser build of GTA V: Story Mode, ported to run in the browser.\n\n\"When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with some of the most frightening and deranged elements of the criminal underworld, the U.S. government and the entertainment industry, they must pull off a series of dangerous heists to survive in a ruthless city in which they can trust nobody, least of all each other.\" — Official Description.",
    controls: "WASD to move, mouse to look around, click to interact, Space to jump, keys to switch weapons and use items. Story Mode starts from the Prologue.\n\nOfficially released September 17, 2013, for Xbox 360 and PlayStation 3, with enhanced Xbox One / PlayStation 4 versions on November 18, 2014, PC on April 14, 2015, and an expanded PlayStation 5 / Xbox Series X|S version on March 15, 2022; the PC version became available on March 4, 2025. Players may also purchase access to GTA V as an add-on for the standalone versions of GTA Online.",
    thumbnail: "https://static.wikia.nocookie.net/gtawiki/images/7/76/CoverArt-GTAV.png/revision/latest?cb=20250708181846",
    // The entrance offers one action: open the hosted selection pane in the
    // player's own browser tab.
    openInNewTab: true,
    sourceUrl: "https://sigamespremiumrp.spideyiraj1925.workers.dev",
    type: "iframe",
    heavy: true,
    standalone: true,
    lockLinks: true,
    media: {
      logo: "https://gtwfilesie.grandtheftwiki.com/GTAV-logo-bare.png",
      banner: "https://steamrip.com/wp-content/uploads/2021/05/GTA-V-Free-Download-Torrent-SteamRip.jpg",
      screenshots: [
        {
          src: "https://steamrip.com/wp-content/uploads/2021/05/GTA-V-Free-Download-Pre-Installed-SteamRip.jpg",
          caption: "Los Santos in full — the Story Mode world.",
        },
        {
          src: "https://steamrip.com/wp-content/uploads/2021/05/GTA-V-Free-Download-SteamRip-300x169.jpg",
          caption: "Street level: cars, cops and open-world chaos.",
        },
      ],
      trailer: {
        src: "https://videos-rockstargames-com.akamaized.net/v4/1s626s55/flv/en-us-1080p.mp4",
        poster: "https://steamrip.com/wp-content/uploads/2021/05/GTA-V-Free-Download-Torrent-SteamRip.jpg",
        caption: "Official trailer — plays right here on this page.",
      },
      videos: [
        {
          id: "QkkoHAzjnUs",
          title: "Grand Theft Auto V Trailer",
          author: "Rockstar Games",
          poster: "https://i.ytimg.com/vi/QkkoHAzjnUs/hqdefault.jpg",
        },
        {
          id: "hvoD7ehZPcM",
          title: "Grand Theft Auto V: The Official Trailer",
          author: "Rockstar Games",
          poster: "https://i.ytimg.com/vi/hvoD7ehZPcM/hqdefault.jpg",
        },
        {
          id: "nzV5_Uhu08A",
          title: "GTA V Trailer #2",
          author: "IGN",
          poster: "https://i.ytimg.com/vi/nzV5_Uhu08A/hqdefault.jpg",
        },
      ],
      facts: [
        { label: "Developer", value: "Rockstar North" },
        { label: "Publisher", value: "Rockstar Games" },
        { label: "Released", value: "17 September 2013" },
        { label: "PC release", value: "14 April 2015" },
        { label: "Genre", value: "Action-adventure · Open world" },
        { label: "Engine", value: "RAGE" },
        { label: "Mode", value: "Single-player Story Mode" },
        { label: "Platforms", value: "PC, PS5, PS4, PS3, Xbox Series X|S, Xbox One, Xbox 360" },
      ],
    },
  },
  {
    id: "the-race",
    title: "THE RACE",
    category: "Racing",
    tags: ["Exclusive", "Racing", "SI Original"],
    description: "The SI GAMES exclusive. Built for this hub — outrun the field and own the leaderboard.",
    controls: "Arrow keys or WASD to steer, Space to brake. Hold the racing line and don't lift.",
    thumbnail: "/thumbs/the-race.svg",
    sourceUrl: "https://sitherace1925.edgeone.dev",
    type: "iframe",
    heavy: true,
    isNew: true,
  },
  {
    id: "gta-vicecity",
    title: "GTA Vice City",
    category: "Action",
    tags: ["Open World", "Driving", "Browser Ready"],
    description: "Sunset Strip, neon palms and a city that never closes.",
    controls: "W A S D to move, the mouse to look around, Space to jump or enter a car. It plays in this frame — go fullscreen for the real thing.",
    thumbnail: "/thumbs/gta-vice-city.png",
    sourceUrl: decodeTarget("aHR0cHM6Ly92Yy5jaW5ldm8udXM="),
    type: "iframe",
    heavy: true,
    lockLinks: true,
    standalone: true,
  },
  {
    id: "deadshot-io",
    title: "Deadshot.io",
    category: "Shooter",
    tags: ["FPS", "Multiplayer", "Browser Ready"],
    description: "Fast arena FPS with instant respawns, snappy gunplay and online lobbies.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, Shift to slide. Pick your loadout and top the scoreboard.",
    thumbnail: "/thumbs/deadshot.jpg",
    sourceUrl: "https://deadshot.io/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "granny",
    title: "Granny",
    category: "Horror",
    tags: ["Horror", "Stealth", "Puzzle"],
    description: "Escape the house before Granny hears you. Five days, one chance at a time.",
    controls: "WASD to move, mouse to look, click to interact and hide. Stay quiet — she hears everything.",
    thumbnail: "/thumbs/granny.jpg",
    sourceUrl: "https://1games.io/game/granny-horror/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "extreme-driving-simulator",
    title: "Extreme Driving Simulator",
    category: "Racing",
    tags: ["Driving", "Open World", "Simulation"],
    description: "Free-roam driving sandbox — drift the streets, test stunts, and push the car to its limits.",
    controls: "WASD or arrow keys to drive, Space for the handbrake, C to change camera. Explore and set your own challenges.",
    thumbnail: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUk1AYdwGmBmlSbndc9n0BlceDlfhHyjDrvD6kKKAxTtyjravsBSHeVaIjYrY3ryee29P6oRKbMTCOyAZJI7rpsHxDnkVU0S7yIJcj_lDbaA&s=10",
    sourceUrl: "https://ubg365.github.io/extreme-car-driving-simulator/play.html",
    type: "iframe",
    heavy: true,
  },
  {
    id: "among-us",
    title: "Among Us",
    category: "Party",
    tags: ["Multiplayer", "Social Deduction", "Browser Ready"],
    description: "Crewmates finish tasks, impostors sabotage the ship. Trust no one.",
    controls: "Mouse or WASD to move, E or click to use and vent, Tab for tasks. Vote wisely in meetings.",
    thumbnail: "/thumbs/among-us.jpg",
    sourceUrl: "https://stgames.top/unity/amongus/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "traffic-rider",
    title: "Traffic Rider",
    category: "Racing",
    tags: ["Moto", "Endless", "Browser Ready"],
    description: "Weave through endless highway traffic at full throttle in first person.",
    controls: "Arrow keys or WASD to ride, tilt or lean for overtakes, and keep close to traffic for bonus points.",
    thumbnail: "/thumbs/traffic-rider.webp",
    sourceUrl: "https://traffic-rider.io/game/traffic-rider/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "cod-black-ops-zombies",
    title: "Call of Duty: Black Ops — Zombies",
    category: "Shooter",
    tags: ["FPS", "Zombies", "Browser Ready"],
    description: "The 2010 Black Ops Zombies experience, rebuilt for the browser. Survive the horde.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, F to buy doors and weapons. Round up points and hold the line.",
    thumbnail: "/thumbs/cod-black-ops-zombies.jpg",
    sourceUrl: "https://nzp.gay/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "climbing-over-it",
    title: "Climb Over It",
    category: "Physics",
    tags: ["Precision", "Rage Game", "Browser Ready"],
    description: "One hammer, one mountain, no checkpoints. Climb, slip, and start over.",
    controls: "Move the mouse to swing the hammer and hook onto rocks. Push down to launch yourself upward. Falling loses progress — stay calm.",
    thumbnail: "/thumbs/climbing-over-it.jpg",
    sourceUrl: "https://ubg76.gitlab.io/climbing-over-it/",
    type: "iframe",
    heavy: true,
  },
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
    heavy: true,
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
    heavy: true,
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
    heavy: true,
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
    heavy: true,
    extensionNotice: true,
    extensionUrl: "https://chromewebstore.google.com/detail/jkijbninecngmcipaijcnibjhbejaoch?utm_source=item-share-cb",
  },
  // ——— Other fan browser ports. Each URL was checked for reachability and for
  // X-Frame-Options / frame-ancestors before being listed, so every one loads in-frame.
  {
    id: "bo1-zombies",
    title: "Black Ops 1 — Zombies",
    category: "Shooter",
    tags: ["FPS", "Zombies", "Browser Ready"],
    description: "Kino-era Black Ops zombies in the browser. Buy weapons, hold the rounds.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, F to buy doors and weapons.",
    thumbnail: cover(61),
    sourceUrl: "https://vel.gg/bo1z",
    type: "iframe",
    heavy: true,
  },
  {
    id: "moon-zombies",
    title: "Moon — Zombies",
    category: "Shooter",
    tags: ["FPS", "Zombies", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Fighting zombies on the Moon in a browser port of the fan favourite.",
    controls: "WASD to move, mouse to look, click to fire, R to reload. Mind the low gravity.",
    thumbnail: cover(62),
    sourceUrl: "https://moon-zombies.pages.dev",
    type: "iframe",
    heavy: true,
  },
  {
    id: "kino-der-toten",
    title: "Kino der Toten",
    category: "Shooter",
    tags: ["FPS", "Zombies", "Browser Ready", "ZZZZ_REMOVE"],
    description: "The classic theatre map, playable straight in this frame.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, F to buy doors off the wall.",
    thumbnail: cover(63),
    sourceUrl: "https://kino-der-toten.pages.dev",
    type: "iframe",
    heavy: true,
  },
  {
    id: "bo3-cheese-cube",
    title: "BO3 Cheese Cube",
    category: "Shooter",
    tags: ["FPS", "Arena", "Browser Ready", "ZZZZ_REMOVE"],
    description: "A tight Black Ops 3 arena built around one cheese cube objective.",
    controls: "WASD to move, mouse to aim, click to shoot, Shift to sprint, R to reload.",
    thumbnail: cover(64),
    sourceUrl: "https://cheese-cube.pages.dev",
    type: "iframe",
    heavy: true,
  },
  {
    id: "black-ops-2",
    title: "Black Ops 2",
    category: "Shooter",
    tags: ["FPS", "Campaign", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Black Ops 2 running as a browser port. Drop in and start the campaign.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, Space to vault.",
    thumbnail: cover(65),
    sourceUrl: "https://vibeslops.luckeysystems.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "skate-3",
    title: "Skate 3",
    category: "Sports",
    tags: ["Skateboarding", "Open World", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Kickflip, grind and bail your way across Skate 3 in a browser port.",
    controls: "Arrow keys or WASD to push and steer, use the trick keys to ollie and grind.",
    thumbnail: cover(66),
    sourceUrl: "https://skate.aaddpp.lol",
    type: "iframe",
    heavy: true,
  },
  {
    id: "cs-surf",
    title: "Counter-Strike Surf",
    category: "Shooter",
    tags: ["FPS", "Surf", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Surf the angled ramps and race the clock in this browser CS build.",
    controls: "WASD to move, mouse to steer, hold Strafe into the ramp. Scroll to switch weapons.",
    thumbnail: cover(67),
    sourceUrl: "https://surfd.net",
    type: "iframe",
    heavy: true,
  },
  {
    id: "halo-ce",
    title: "Halo — Combat Evolved",
    category: "Shooter",
    tags: ["FPS", "Campaign", "Browser Ready", "ZZZZ_REMOVE"],
    description: "The original Halo campaign, ported to the browser.",
    controls: "WASD to move, mouse to look, click to fire, R to reload, F for melee and grenades.",
    thumbnail: cover(68),
    sourceUrl: "https://mitchellhynes.com/halo/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "halo-ce-mobile",
    title: "Halo CE — Mobile Edition",
    category: "Shooter",
    tags: ["FPS", "Touch", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Halo Combat Evolved built for touch controls and smaller screens.",
    controls: "Left thumb to move, right thumb to look. Tap to fire and use the on-screen buttons.",
    thumbnail: cover(69),
    sourceUrl: "https://hcemobile.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "pes-6",
    title: "Pro Evolution Soccer 6",
    category: "Sports",
    tags: ["Football", "Classic", "Browser Ready", "ZZZZ_REMOVE"],
    description: "PES 6 in the browser. The classic that still plays.",
    controls: "Arrow keys to move and pass, A to shoot, D to through ball, S to sprint.",
    thumbnail: cover(70),
    sourceUrl: "https://pes6.optijuegos.net",
    type: "iframe",
    heavy: true,
  },
  {
    id: "simpsons-hit-run",
    title: "The Simpsons: Hit & Run",
    category: "Action",
    tags: ["Open World", "Driving", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Drive Springfield and dodge the robots in this browser port.",
    controls: "WASD to move and drive, mouse to look around, Space to jump out of the car.",
    thumbnail: cover(71),
    sourceUrl: "https://shar-wasm.cjoseph.workers.dev/?skipmovie",
    type: "iframe",
    heavy: true,
  },
  {
    id: "quake-1",
    title: "Quake",
    category: "Shooter",
    tags: ["FPS", "Classic", "Browser Ready", "ZZZZ_REMOVE"],
    description: "The original 1996 Quake, running in this frame.",
    controls: "WASD to move, mouse to aim, click to shoot, Space to jump, E to use.",
    thumbnail: cover(72),
    sourceUrl: "https://q1.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "quake-2",
    title: "Quake 2",
    category: "Shooter",
    tags: ["FPS", "Classic", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Quake 2 brought to the browser with the same brutal pacing.",
    controls: "WASD to move, mouse to aim, click to fire, Space to jump, F to enter machines.",
    thumbnail: cover(73),
    sourceUrl: "https://q2.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "quake-3",
    title: "Quake 3 Arena",
    category: "Shooter",
    tags: ["FPS", "Arena", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Pure arena fragging, no campaign, all skill.",
    controls: "WASD to move, mouse to aim, click to fire, Space to jump, Ctrl to crouch.",
    thumbnail: cover(74),
    sourceUrl: "https://q3.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "rtcw",
    title: "Return to Castle Wolfenstein",
    category: "Shooter",
    tags: ["FPS", "Campaign", "Browser Ready", "ZZZZ_REMOVE"],
    description: "B.J. Blazkowicz breaks out again, in a browser build of RTCW.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, F for levers and doors.",
    thumbnail: cover(75),
    sourceUrl: "https://rtcw.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "unreal-tournament",
    title: "Unreal Tournament",
    category: "Shooter",
    tags: ["FPS", "Arena", "Browser Ready", "ZZZZ_REMOVE"],
    description: "The 1999 arena classic, online bots and all, in this frame.",
    controls: "WASD to move, mouse to aim, click to fire, Space to jump, Q and E to switch weapons.",
    thumbnail: cover(76),
    sourceUrl: "https://ut.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "half-life",
    title: "Half-Life",
    category: "Shooter",
    tags: ["FPS", "Campaign", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Gordon Freeman's shift at Black Mesa, ported to the browser.",
    controls: "WASD to move, mouse to look, click to use objects and fire, R to reload, 1-6 for weapons.",
    thumbnail: cover(77),
    sourceUrl: "https://pixelsuft.github.io/hl/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "cs-1-6",
    title: "Half-Life / CS 1.6",
    category: "Shooter",
    tags: ["FPS", "Tactical", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Counter-Strike 1.6 in the browser through the Xash3D engine.",
    controls: "WASD to move, mouse to aim, click to shoot, B for the buy menu, R to reload.",
    thumbnail: cover(78),
    sourceUrl: "https://x8bitrain.github.io/webXash/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "diablo",
    title: "Diablo",
    category: "Action",
    tags: ["RPG", "Hack and Slash", "Browser Ready", "ZZZZ_REMOVE"],
    description: "Descend into the cathedral and clear the dungeons in a browser port.",
    controls: "Click to move and attack, number keys for skills. Loot everything you find.",
    thumbnail: cover(79),
    sourceUrl: "https://johnimril.github.io/diablo_web/",
    type: "iframe",
    heavy: true,
  },

];


export const categories = ["All Games", ...Array.from(new Set(games.map((game) => game.category)))];

export const allGames: Game[] = [
  ...games,
  ...localGames.map(([title, category, tags, description, controls], index): Game => {
    const id = localSlugs[index];
    return {
      id,
      title,
      category,
      tags,
      description,
      controls,
      thumbnail: cover(index + 1),
      sourceUrl: `/games/${id}/index.html`,
      type: "iframe",
      htmlGame: true,
      isNew: id === "51-starfighter-si-01",    };
  }),
];


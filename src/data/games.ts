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

/** A preset asked at the entrance before the link is built. `query` is appended
 * to the server URL as-is (it always carries the `?mode=` parameter). */
export type GameMode = {
  id: string;
  label: string;
  query: string;
  note?: string;
};

/** One way to launch a title: most games have a single server, some carry mirrors. */
export type GameServer = {
  id: string;
  label: string;
  url: string;
  /** Host refuses framing (X-Frame-Options / CSP frame-ancestors): hand the link over instead. */
  external?: boolean;
  note?: string;
  /** Presets the player picks on this server's own page; the chosen `query` is
   * appended to `url` (GTA V V2 asks for its start mode this way). */
  modes?: GameMode[];
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
  /** Mirrors of the same game; the launch page lets the player pick one (one card on the home). */
  servers?: GameServer[];
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

/** [id, title, category, tags, description, controls, sourceUrl, heavy] for remotely hosted titles. */
type RemoteGame = [string, string, string, string[], string, string, string, boolean];

// Games loaded straight from their own origins. A few hosts send framing blocks,
// so those entries launch through the copy-link + new-tab flow instead of this
// frame. Titles with more than one mirror live in `serverGames` below and show a
// server picker on their own page, keeping a single card in the library.
const remoteGames: RemoteGame[] = [
  ["proxy-cuphead", "Cuphead", "Action", ["Boss Rush", "Run and Gun", "Browser Ready"],
    "Cuphead's run-and-gun boss ladder, drawn like a 1930s cartoon.",
    "Arrow keys or W A S D to move, Z or J to shoot, X or K to dash. Learn each pattern and punish it.",
    "https://wasm.rip/files/cuphead/index.html", true],
  ["proxy-stardew", "Stardew Valley", "Sandbox", ["Farming", "Simulation", "Browser Ready"],
    "Restore the old farm: plant, mine, fish and build a life in the valley.",
    "W A S D to walk, the mouse to use tools and talk, E for the inventory. The day ends whether you are ready or not.",
    "https://wasm.rip/files/stardewvalley/index.html", true],
  ["proxy-lethal", "Lethal Company", "Horror", ["Co-op", "Survival", "Browser Ready"],
    "Scrape together enough scrap to make quota before the moons run out of mercy.",
    "W A S D to move, E to grab, Shift to sprint. Keep the doors shut and the lights on.",
    "https://wasm.rip/files/lethal/index.html", true],
  ["proxy-peak", "PEAK", "Party", ["Co-op", "Climbing", "Browser Ready"],
    "Four climbers, one mountain and a stamina bar that never forgives.",
    "W A S D to move, hold Space to jump, mouse to look. Climb together or fall alone.",
    "https://wasm.rip/files/peak/PEAK.html", true],
  ["proxy-rimworld", "RimWorld", "Sandbox", ["Colony", "Strategy", "Browser Ready"],
    "Build a colony on the rim and survive whatever the storyteller throws at it.",
    "The mouse selects and orders everything, W A S D pans the map. Watch the mood and the walls.",
    "https://wasm.rip/files/rimworld/index.html", true],
  ["proxy-inscryption", "Inscryption", "Horror", ["Card Game", "Puzzle", "Browser Ready"],
    "A card game that escapes its box and drags you into the dark behind it.",
    "Click a card to play it, then click a target. Read every rule before you break one.",
    "https://wasm.rip/files/inscryption/index.html", true],
  ["proxy-bendy", "Bendy (BATIM)", "Horror", ["Survival", "Horror", "Browser Ready"],
    "Escape the ink-soaked studio while Bendy hunts the hallways.",
    "W A S D to move, mouse to look, E to interact. Hide when the ink runs thick.",
    "https://wasm.rip/files/BATIM/index.html", true],
  ["proxy-miside", "MiSide", "Horror", ["Psychological", "Horror", "Browser Ready"],
    "A cute virtual world that starts noticing you watching it.",
    "W A S D to move, mouse to look, click to interact. Not every menu option is safe.",
    "https://wasm.rip/files/miside/miside.html", true],
  ["proxy-oneshot", "OneShot", "Puzzle", ["Adventure", "Story", "Browser Ready"],
    "One shot to save a world that knows you exist.",
    "Arrow keys to move, Enter to talk, the mouse to solve. Whatever you choose, it sticks.",
    "https://wasm.rip/files/oneshot-wme/index.html", true],
  ["proxy-helltaker", "Helltaker", "Puzzle", ["Choices", "Quick", "Browser Ready"],
    "Solve the grid, win the demon party, try not to overthink the heels.",
    "Arrow keys move one square at a time. Reach the demon before your turns run out.",
    "https://wasm.rip/files/Helltaker/helltaker.html", false],
  ["proxy-fez", "FEZ", "Action", ["Platform", "Indie", "Browser Ready"],
    "Turn a 3D world through four flat faces and rethink every platform you see.",
    "Arrows or W A S D to move, Q and E to rotate the world around you.",
    "https://wasm.rip/files/FEZ/fez.html", true],
  ["proxy-brotato", "Brotato", "Arcade", ["Bullet Hell", "Roguelite", "Browser Ready"],
    "A potato with too many guns survives wave after wave of enemies.",
    "W A S D or the arrows to move, your weapons fire on their own. Dodge first.",
    "https://wasm.rip/files/bpac/index.html", false],
  ["proxy-ravenfield", "Ravenfield", "Shooter", ["FPS", "Sandbox", "Browser Ready"],
    "Big-team battles with throwback low-poly soldiers and no fuss.",
    "W A S D to move, mouse to aim, click to fire, R to reload. Pick a side and push the line.",
    "https://wasm.rip/files/ravenfield/index.html", true],
  ["proxy-clustertruck", "Clustertruck", "Physics", ["Platform", "Reflex", "Browser Ready"],
    "The floor is a convoy of trucks and it never stops moving.",
    "W A S D to move, Space to jump, Shift to slide. Never touch the ground.",
    "https://wasm.rip/files/ClusterTruck/clustertruck.html", true],
  ["proxy-plagueinc", "Plague Inc", "Puzzle", ["Strategy", "Simulation", "Browser Ready"],
    "Design a plague and outsmart the cure before it ships.",
    "The mouse evolves and spreads everything. Watch the news for the cure's progress.",
    "https://wasm.rip/files/plauge/index.html", false],
  ["proxy-lobcorp", "Lobotomy Corporation", "Horror", ["Management", "Horror", "Browser Ready"],
    "A facility that harvests monsters from its own inmates. Keep it contained.",
    "The mouse runs the rooms and the agents. Read every warning before you open a door.",
    "https://wasm.rip/files/lob-corp/index.html", true],
  ["proxy-trombonechamp", "Trombone Champ", "Party", ["Rhythm", "Music", "Browser Ready"],
    "The trombone rhythm game where every wrong note is entirely your fault.",
    "Hold Space or the mouse and slide to reach each pitch. Keep the beat, keep the pride.",
    "https://wasm.rip/files/tchamp/index.html", false],
  ["proxy-granny3", "Granny 3", "Horror", ["Escape", "Horror", "Browser Ready"],
    "Three days in the house, and Granny has new toys this time.",
    "W A S D to move, mouse to look, E to interact. Noise is a timer, so move quietly.",
    "https://wasm.rip/files/granny/granny3.html", true],
  ["proxy-howtofish", "How to Fish", "Sports", ["Fishing", "Relaxing", "Browser Ready"],
    "Cast, wait, and land the catch of the day.",
    "The mouse casts and reels, Space hooks. Keep the line tight and the patience longer.",
    "https://wasm.rip/files/HowToFish/HowToFish.html", false],
  ["proxy-scp", "SCP: Containment Breach", "Horror", ["Survival", "Sci-Fi", "Browser Ready"],
    "The facility is breached. Do not let anything with a number get close to you.",
    "W A S D to move, E to interact, Shift to run. Read the documents and close the doors behind you.",
    "https://wasm.rip/files/scp/index.html", true],
  ["proxy-baldi", "Baldi's Birthday Bash", "Horror", ["Puzzle", "Horror", "Browser Ready"],
    "Collect the notebooks, answer the questions, and outrun the maths teacher.",
    "W A S D to move, E to grab. Wrong answers make him faster, so get them right.",
    "https://wasm.rip/files/birthdaybash/index.html", true],
  ["proxy-boilnoodles", "Boil Noodles at Night", "Party", ["Cooking", "Cozy", "Browser Ready"],
    "A late-night noodle stand: serve the bowl and mind the clock.",
    "The mouse picks and serves, Space boils. Watch the pot before it spills over.",
    "https://wasm.rip/files/boilnoodles/index.html", false],
  ["proxy-cheeserolling", "Cheese Rolling", "Physics", ["Physics", "Ragdoll", "Browser Ready"],
    "Chase a wheel of cheese down a very steep hill and try to land it.",
    "Arrows or W A S D to tumble, Space to jump. Gravity does most of the work.",
    "https://wasm.rip/files/cheese-rolling/index.html", false],
  ["proxy-diceamillion", "Dice A Million", "Puzzle", ["Dice", "Numbers", "Browser Ready"],
    "Roll, combine and hit the target number before the dice run out.",
    "Click to roll, click again to lock the dice you want. Match the goal to advance.",
    "https://wasm.rip/files/diceAmillion/diceamillion.html", false],
  ["proxy-mfdw2", "Man From The Window 2", "Horror", ["Stealth", "Horror", "Browser Ready"],
    "He is already on the way to the window. Do not let him see you.",
    "W A S D to move, E to interact. Watch the window and keep perfectly still.",
    "https://wasm.rip/files/MFDW2/index.html", true],
  ["proxy-beatblock", "Beatblock", "Arcade", ["Rhythm", "Reflex", "Browser Ready"],
    "Ride the beat through a tunnel that reacts to whatever is playing.",
    "Hold Space to shield and release to pass the gates. Timing beats speed.",
    "https://wasm.rip/files/beatblock/index.html", false],
  ["proxy-happyroom", "Happy Room", "Physics", ["Sandbox", "Physics", "Browser Ready"],
    "A toybox of traps for a very durable test dummy.",
    "The mouse places traps and props, then the physics take over. Combine them for higher scores.",
    "https://wasm.rip/files/happy-room/index.html", false],
  ["proxy-agesofconflict", "Ages of Conflict", "Puzzle", ["Strategy", "Map", "Browser Ready"],
    "Paint the whole map your colour, one country at a time.",
    "Click a country to select it, then click a neighbour to attack it.",
    "https://wasm.rip/files/aoc/index.html", false],
  ["proxy-whiletruelearn", "while True: learn()", "Puzzle", ["Programming", "Puzzle", "Browser Ready"],
    "Teach a cat-fetching machine with code blocks instead of arguments.",
    "Drag blocks into the pipeline with the mouse, then run it and read the output.",
    "https://wasm.rip/files/wtl/index.html", false],
  ["proxy-crashoutcrew", "Crashout Crew", "Arcade", ["Racing", "Party", "Browser Ready"],
    "Tiny cars, big pile-ups, one finish line that nobody respects.",
    "Arrows or W A S D to drive, Space for a burst of speed. Survive the first corner.",
    "https://wasm.rip/files/cc/index.html", true],
  ["proxy-mfds", "Message From Deep Space", "Arcade", ["Mystery", "Short", "Browser Ready"],
    "A signal arrives from somewhere far away. Someone has to answer it.",
    "The mouse explores and answers. Headphones make it land harder.",
    "https://wasm.rip/files/TMFDS/index.html", false],
  ["proxy-dudestop", "Dude, Stop", "Puzzle", ["Point and Click", "Comedy", "Browser Ready"],
    "Someone keeps tidying up your beautiful chaos. Stop them.",
    "Click the world to interact and solve each scene in as few moves as possible.",
    "https://wasm.rip/files/dudestop/index.html", false],
  ["proxy-hillclimb", "Hill Climb Racing", "Racing", ["Driving", "Physics", "Browser Ready"],
    "Gas, gravity, and a chassis that folds the moment you land wrong.",
    "Right arrow or D for gas, left arrow or A to reverse. Land on the wheels.",
    "https://wasm.rip/files/hcr/index.html", false],
  ["proxy-toasterball", "Toasterball", "Physics", ["Sports", "Physics", "Browser Ready"],
    "Bread-based soccer with far too much bounce.",
    "Arrows or W A S D to shove, Space to jump. Score however it happens to go in.",
    "https://wasm.rip/files/toasterball/index.html", false],
  ["proxy-minecraft", "Minecraft 1.8.8", "Sandbox", ["Building", "Survival", "Browser Ready"],
    "The classic 1.8.8 build: mine, craft, build, and watch the sun go down.",
    "W A S D to move, mouse to look and mine, Space to jump, E for the inventory, click to place.",
    "https://wasmarcade.com/minecraft", true],
  ["proxy-flashgames", "Flash Games", "Arcade", ["Collection", "Retro", "Browser Ready"],
    "A cabinet of old Flash titles kept alive in the browser.",
    "Each game keeps its own keys, most use the arrows and Space.",
    "https://wasmarcade.com/flash-games", false],
  ["proxy-arcadeclassics", "Arcade Classics", "Classic", ["Retro", "Collection", "Browser Ready"],
    "Coin-op staples in one cabinet.",
    "Arrows to steer, Space to start, P to pause. Every game shows its own layout.",
    "https://wasmarcade.com/retro-games", false],
  ["proxy-tf2", "Team Fortress 2", "Shooter", ["FPS", "Multiplayer", "Browser Ready"],
    "Nine classes, one payload and endless arguing at the spawn door.",
    "W A S D to move, mouse to aim, click to fire, number keys for class abilities.",
    "https://tf2.riddy.workers.dev/", true],
  ["proxy-doom2", "DOOM II Multiplayer", "Shooter", ["FPS", "Multiplayer", "Browser Ready"],
    "Hell on Earth, this time with company.",
    "W A S D to move, the mouse to aim, click or Ctrl to fire, Space to open doors.",
    "https://doom.pieter.com/", true],
  ["proxy-mw2", "Modern Warfare 2", "Shooter", ["FPS", "Campaign", "Browser Ready"],
    "The campaign through the proxy: no Russian, plenty of noise.",
    "W A S D to move, mouse to aim, click to fire, R to reload, C to crouch.",
    "https://ovz-game-production.up.railway.app/", true],
  ["proxy-runescapeclassic", "RuneScape Classic", "Action", ["MMO", "RPG", "Browser Ready"],
    "The old-school world of Gielinor, exactly as slow and as charming as you remember.",
    "Click to walk, fight and gather. Read the skills menu before you grind.",
    "https://runescapeclassic.gold/", true],
  ["web-pokemon-redstone", "Pokémon Redstone", "Sandbox", ["Pokemon", "Adventure", "Browser Ready"],
    "A fan-made Pokémon adventure built on the Redstone engine.",
    "Arrow keys or W A S D to move, Enter to interact and talk. Keep the team fed and healthy.",
    "https://pokemon-redstone.pages.dev/", true],
  ["web-gta-chinatown", "GTA Chinatown Wars", "Action", ["Open World", "Driving", "Browser Ready"],
    "Liberty City from above, with the Triads pulling every string.",
    "W A S D or the arrows to move and drive, mouse to aim. Touch and swipe where the build asks for it.",
    "https://gta-chinatown-wars.pages.dev/", true],
  ["web-lego-island", "LEGO Island", "Action", ["Platform", "Retro", "Browser Ready"],
    "The Brickster is loose and the Info Man needs a courier.",
    "Arrows or W A S D to move, Space to jump, Enter to talk and collect the studs.",
    "https://isle.pizza/", true],
  ["web-taipei-rush", "Taipei Rush", "Racing", ["Driving", "Endless", "Browser Ready"],
    "Dodge through Taipei traffic at rush hour and keep the run alive.",
    "Arrow keys or A D to steer, Space or up to boost. Watch the mirror more than the speedo.",
    "https://www.taipei-rush.app/", true],
  ["web-redcoats", "Redcoats", "Action", ["Strategy", "Action", "Browser Ready"],
    "Hold the line with a squad that reloads one volley at a time.",
    "Mouse to order your squad, arrow keys to pan the battlefield.",
    "https://redcoats.io/app/", true],
  ["web-salty-seas", "Salty Seas", "Action", ["Sailing", "Co-op", "Browser Ready"],
    "Crew a ship through hostile water and argue about who mans the cannons.",
    "W A S D to steer, mouse to aim the guns, Space to fire.",
    "https://saltyseas.io/app/", true],
  ["web-park-baron", "Park Baron", "Puzzle", ["Management", "Tycoon", "Browser Ready"],
    "Lay out the rides, price the tickets and keep the guests happy.",
    "The mouse places paths and rides. Watch the happiness meter before you raise prices.",
    "https://parkbaron.com/play", true],
  ["web-sandstorm", "SandStorm", "Arcade", ["Survival", "Action", "Browser Ready"],
    "Hold the outpost while the sandstorm rolls in.",
    "W A S D to move, mouse to aim, click to fire. Keep your back to the wall.",
    "https://sandstorm.ink/play.html", true],
  ["web-seedbed", "Seedbed", "Sandbox", ["Farming", "Cozy", "Browser Ready"],
    "A quiet plot of land, a few seeds and all the time in the world.",
    "The mouse plants, waters and harvests. Click a tool, then click the plot.",
    "https://playseedbed.com/", true],
  ["web-halo-community", "Halo CE — Community Port", "Shooter", ["FPS", "Story", "Browser Ready"],
    "Halo: Combat Evolved, ported to the browser by the community.",
    "W A S D to move, mouse to aim, click to fire, R to reload, E to swap weapons.",
    "https://halo.exenu.co.uk/", true],
  ["web-dragonball-bt3", "Dragon Ball Z BT3", "Action", ["Fighting", "Anime", "Browser Ready"],
    "Budokai-style battles with ki blasts that fill the whole screen.",
    "Arrows or W A S D to move, Z or J to attack, X or K to blast, Shift to charge.",
    "https://dragonballbt3.online/", true],
  ["web-city-chase", "City Chase", "Action", ["Escape", "Runner", "Browser Ready"],
    "The sirens are behind you and the rooftops are ahead.",
    "Arrow keys or W A S D to run and jump, Space for the slide. Do not get cornered.",
    "https://playgama.com/export/game/city-chase-escape-police?clid=p_a1e62e06-8452-4b40-8f90-5af6adddadc6", true],
  ["web-binding-isaac", "Binding of Isaac: Repentance+", "Action", ["Roguelite", "Bullet Hell", "Browser Ready"],
    "Every run down into the basement is a different bad idea.",
    "W A S D to move, arrows to shoot tears, Space to use the active item.",
    "https://tboi.online/", true],
  ["web-tweetcraft", "Tweetcraft", "Arcade", ["Social", "Creative", "Browser Ready"],
    "Build and explore a world made out of posts.",
    "W A S D to move, Space to jump, mouse to interact with what you find.",
    "https://tweetcraft.jai.vin/", true],
  ["web-super-mario-zombies", "Super Mario Zombies", "Arcade", ["Platform", "Parody", "Browser Ready"],
    "The plumber's worst week, with far more teeth than usual.",
    "Arrows or W A S D to move, Space to jump. Stomp first, ask questions later.",
    "https://smz.fun/", true],
  ["web-crash-bash", "Crash Bash Online", "Party", ["Party", "Multiplayer", "Browser Ready"],
    "Wumpa-fuelled party games for up to four.",
    "Arrows to move, Space to use your item, number keys for player two and beyond.",
    "https://crashbash.app/", true],
];

// The three headline titles lead the library, in this order, then the rest follow.
/** Hosts that send X-Frame-Options / CSP frame-ancestors, so they cannot load in this frame.
 * Each entry was probed: the cross-origin iframe is refused, so its card hands over a link. */
const NON_FRAMABLE_HOSTS = [
  "wasmarcade.com",
  "spawn.co",
  "playgta5.pro",
  "dos.zone",
  "bunnyhop.lol",
  "2004.lostcity.rs",
  "lasvegasherogame.com",
  "waw.fun",
  "zombies.concentric.live",
  "fifa14.online",
  "pes14.online",
  "wwepain.online",
  "burnout3.online",
  "mortalkombatsm.online",
  "tekkendr.live",
  "nfsunderground2.site",
  "midnighhtclub3.online",
  "morrowind.app",
  "pokeweb.morisoba.moe",
];

/** Cover art that ships with the latest batch of titles. */
const IMG = "https://www.inxanitylabs.com/assets/games/";

/** SI premium proxy routes are always handed over as a link, never framed: every
 * title (or server) whose URL points at this host opens in the player's own tab. */
const PREMIUM_HOST = "sigamespremiumrp.spideyiraj1925.workers.dev";

function handOverPremium<T extends Game>(list: T[]): T[] {
  return list.map((game) => {
    const onPremium = game.sourceUrl.includes(PREMIUM_HOST);
    const servers = game.servers?.map((server) =>
      server.url.includes(PREMIUM_HOST) && !server.external ? { ...server, external: true } : server,
    );
    if (!onPremium && !servers) return game;
    return { ...game, ...(servers ? { servers } : {}), ...(onPremium ? { openInNewTab: true } : {}) };
  });
}

/** [id, title, category, tags, description, controls, sourceUrl, type, heavy, cover?] for titles played on their own site. */
type LinkedGame = [string, string, string, string[], string, string, string, Game["type"], boolean, string?];

// Hosts that refuse to be framed (X-Frame-Options / CSP frame-ancestors) or are
// plain pages rather than an embeddable build: each card hands the player over
// to the game's own page instead of loading it in this frame. Every URL was
// checked for reachability and for its framing headers before being listed.
const linkedGames: LinkedGame[] = [
  ["snail-mail", "Snail Mail", "Arcade", ["Casual", "Side Scroller", "Browser Ready"],
    "Deliver the mail at a snail's pace — crawl, boost and pipe your way across each letter run.",
    "Click the frame first so it takes the keyboard, then use the arrow keys to move and Space for a burst of speed. Reach the mailbox at the end of the route.",
    "https://snail.banteg.xyz/", "iframe", false],
  ["nfs-most-wanted", "Need for Speed: Most Wanted", "Racing", ["Police Chase", "Open World", "Classic"],
    "The blacklist pursuit against the cops — the BMW M3 GTR run, played from the game's own playgta5.pro page.",
    "Click the page first so it takes the keyboard, then drive with the key map in its Keyboard and gamepad panel; a gamepad works too. Set the resolution and full screen from the page's own options.",
    "https://nfs.playgta5.pro", "external", false],
  ["nfs-underground-2", "Need for Speed: Underground 2", "Racing", ["Street Racing", "Tuning", "Night"],
    "Street racing after dark: build the car, run the circuits and own Bayview.",
    "Arrow keys or W A S D to drive, Space for the handbrake, Shift for nitrous. Click into the game window so it takes the keyboard.",
    "https://nfsu2.xyz/", "external", true],
  ["midnight-club-3-dub", "Midnight Club 3: DUB Edition", "Racing", ["Street Racing", "Open World", "Browser Ready"],
    "Three cities, tuned rides and the DUB remix scene, streamed in this frame through the RetroStic player.",
    "Click the frame to focus it, then steer with the arrow keys and use the emulator's button keys for the menus. The ROM streams in first — give it a moment.",
    "https://www.retrostic.com/roms/psp/midnight-club-3-dub-edition-83822/play", "iframe", true],
  ["wwe-smackdown-raw-2011", "WWE SmackDown vs. Raw 2011", "Sports", ["Wrestling", "Fighting"],
    "The full 2011 roster, story mode and pay-per-views, running on the game's own site.",
    "Arrow keys to move around the ring, with the action keys for strikes, grapples and signatures. Follow the key map the site shows before each match.",
    "https://wwe2011.online/", "external", true],
  ["pes-2014", "PES 2014", "Sports", ["Football", "Classic"],
    "Pro Evolution Soccer 2014, playable from its Game-Game page — the supplied link had moved.",
    "Arrow keys to move and pass, A to shoot, D to through ball, S to sprint, following the site's on-screen key map.",
    "https://game-game.com/online-pes2014/", "external", true],
  ["fifa-14", "FIFA 14", "Sports", ["Football", "Classic"],
    "FIFA 14 in the browser on Y8 — kick-offs, leagues and Ultimate-style squads from its own page.",
    "Arrow keys or W A S D to move, the letter keys to pass, shoot and slide as shown by the site's overlay. Click the game first so it takes the keys.",
    "https://www.y8.com/games/fifa_14", "external", false],
  ["tekken-5-dark-resurrection", "Tekken 5: Dark Resurrection", "Fighting", ["Fighting", "Classic", "Browser Ready"],
    "The PSP Dark Resurrection cut with the full roster and extra stages, streamed in this frame.",
    "Click the frame to focus it, then move with the arrow keys and attack with the emulator's button keys. The ROM streams in before the fight starts.",
    "https://www.retrostic.com/roms/psp/tekken-dark-resurrection-83778/play", "iframe", true],
  ["pes-2011", "PES 2011", "Sports", ["Football", "Flash"],
    "The PES 2011 browser game on JeuxD, played full-screen on its own page.",
    "Arrow keys to move and pass, Space to shoot — the page runs its game once it loads. This host only serves plain HTTP, so it opens as a normal page.",
    "http://www.jeuxd.fr/pes-2011-flash-gratuit-en-plein-ecran", "external", false],
  ["pokemon-games", "Pokémon Games (18)", "RPG", ["Collection", "Retro"],
    "Eighteen Pokémon titles gathered on one RetroGamesNexus series page — the classic handheld generations in one place.",
    "Pick a generation on the series page, then play with that game's own controls; the handheld originals follow the usual D-pad and A/B layout.",
    "https://retrogamesnexus.com/game-series/pokemon-games", "external", false],
  ["majesty-gold-hd", "Majesty Gold HD", "Strategy", ["Kingdom", "Classic"],
    "The GOG.com page for Majesty Gold HD — the kingdom-defence classic with its expansions.",
    "Left-click to place buildings and post bounties, drag to scroll the map. Heroes act on their own; your job is the economy and the rewards.",
    "https://www.gog.com/game/majesty_gold_hd", "external", false],
  ["portal", "Portal", "Puzzle", ["FPS", "First-Person", "Classic", "Browser Ready"],
    "The Aperture test chambers, ported to the browser — the whole run downloads straight into this frame.",
    "W A S D to move, mouse to look, click to fire the portal gun, E to lift objects. Blue is your entry, orange your exit.",
    "https://yikes.pw/portal/", "iframe", true],
  ["no-one-lives-forever", "No One Lives Forever", "Shooter", ["FPS", "Spy", "Classic", "Browser Ready"],
    "Cate Archer's sixties spy-caper FPS in the browser — gadgets, disguises and cat-and-mouse missions.",
    "W A S D to move, mouse to aim, click to fire, R to reload, F for doors and pickups. Use the gadgets when stealth stops working.",
    "https://playnolf.com", "iframe", true],
  ["morrowind", "The Elder Scrolls III: Morrowind", "RPG", ["Open World", "Fantasy"],
    "Vvardenfell through the Virtastic browser build of Morrowind — the page opens on the host's own site.",
    "W A S D to move, mouse to look, left-click to attack, I for inventory and J for the journal. Reading the journal is half the trip.",
    "https://morrowind.virtastic.app", "external", true],
  ["super-monkey-ball", "Super Monkey Ball", "Arcade", ["Party", "Classic", "Browser Ready"],
    "AiAi and the crew rolling through the maze worlds in a browser port of the party classic.",
    "Arrow keys or the mouse to tilt the world; the monkey rolls wherever you point it. Keep to the middle of the path — the edges drop away.",
    "https://monkeyball-online.pages.dev", "iframe", true],
  ["quake-episode-1", "Quake (Episode 1)", "Shooter", ["FPS", "Classic", "Browser Ready"],
    "The original Quake's first episode running through the netquake.io port, right in this frame.",
    "W A S D to move, mouse to aim, click to shoot, Space to jump, E to use switches. The first slipgate is straight ahead.",
    "https://www.netquake.io/", "iframe", true],
  ["crimsonland", "Crimsonland", "Shooter", ["Top Down", "Survival", "Classic"],
    "The top-down carnage classic — dozens of weapons and a screen full of bugs, on the game's own site.",
    "W A S D or the arrows to move, mouse to aim and shoot, Space for the special weapon. Grab every perk that drops.",
    "https://crimson.land/play", "external", true],
  ["cricket-07", "Cricket 07", "Sports", ["Cricket", "Sports", "Multiplayer"],
    "Cricket 07 in the browser — full innings with bat and ball, plus online 1v1 through the page's own room codes.",
    "Batting: S for the normal shot, hold Shift for the lofted one, D for the advanced shot, arrows for shot direction, D to take a run and A to cancel. Bowling: S for the stock delivery, A / D / Shift / Alt for the specials, arrows to place the ball. W to go back, Esc to pause.",
    "https://cricket.playgta5.pro", "external", false],
  ["road-rash", "Road Rash", "Racing", ["Motorbike", "Beat 'em up", "Classic"],
    "Road Rash back in your browser — race, fight and relive the classic motorcycle brawls from its own play page.",
    "Accelerate with ↑, steer with ← and →, punch with Space, kick with K, and pause with Esc. Land your hits while you hold your speed.",
    "https://roadrash.playgta5.pro/play.html", "external", false],
  // ── Latest batch: titles that run inside this frame ───────────────────────
  ["princejs", "Prince of Persia (JS)", "Platformer", ["Classic", "Browser Ready"],
    "The 1989 classic rebuilt in JavaScript — the same twelve rooms and the same sixty minutes, no emulator in the way.",
    "Arrows to run, jump and climb, Shift to stand and crouch, Ctrl to stab. Click the frame first so it takes the keys.",
    "https://princejs.com/", "iframe", false],
  ["harvest", "Harvest: Massive Encounter", "Strategy", ["Tower Defense", "Base Building", "Browser Ready"],
    "Drop harvester beams on an alien world and hold the line — every night brings a bigger wave of bugs.",
    "Left-click to place harvesters, turrets and research labs, drag to scroll the map. Build wide early and let the lasers do the rest.",
    "https://harvest.banteg.xyz/", "iframe", true, IMG + "harvest-massive-encounter-art.webp"],
  ["myth", "Myth: The Fallen Levels", "Strategy", ["Tactics", "Fantasy", "Browser Ready"],
    "Bungie's tactical classic — small armies, real physics and no rebuilding the dead between fights.",
    "Left-click to select your warband, right-click to move or attack, Tab to cycle units, B for the minimap. Lead with the archers.",
    "https://myth.game/", "iframe", true],
  ["cyberpunk", "Cyberpunk 2077", "RPG", ["Open World", "Story", "Browser Ready"],
    "Night City through the browser build — the whole prologue to the endgame, no launcher required.",
    "W A S D to move, mouse to look, click to attack, Tab for the inventory. Follow the page's own key map for the rest.",
    "https://cyberpunk2077.lol/game", "iframe", true, IMG + "cyberpunk-2077-art.webp"],
  ["cuphead-wally", "Cuphead: Wally Warbles", "Action", ["Boss Fight", "Run and Gun", "Scratch"],
    "Wally Warbles in a cage match — one of Cuphead's feathered boss fights, running from its own build.",
    "Arrow keys to move, Space to jump, Z to shoot and X to dash — the project shows its own key layout on the start screen. Watch for the eggs.",
    "https://turbowarp.org/178944041", "iframe", false, IMG + "cuphead-wally-warbles-art.webp"],
  // ── Latest batch: titles that hand over their own page ────────────────────
  ["bunnyhop", "bunnyhop.lol", "Shooter", ["Counter-Strike", "Bunnyhop", "Multiplayer"],
    "Counter-Strike: Source bunny hopping across 600+ maps, from bhop_eazy to the hardest runs — nothing to install.",
    "Hold jump and keep your strafe rhythm: A and D to strafe with the mouse turning in sync. Click the frame first so it takes the keys.",
    "https://bunnyhop.lol/", "external", false],
  ["2004scape", "2004Scape", "RPG", ["MMO", "Browser", "Multiplayer"],
    "A free, open-source preservation of the 2004-era browser MMO — community-run and free to play.",
    "Click to walk, use the tabs for inventory, stats and the map, and the chat box for commands. Make an account on the page to keep your progress.",
    "https://2004.lostcity.rs/", "external", true],
  ["gh3", "Guitar Hero III", "Rhythm", ["Music", "Guitar", "Browser"],
    "Legends of rock from the site's own browser page — the fretboard and the crowd in one place.",
    "The site's own key map runs the frets and the strum — click the page first so it takes the keyboard, then keep to the beat.",
    "https://lasvegasherogame.com/gh3/", "external", false, IMG + "guitar-hero-3-art.webp"],
  ["wwepain", "WWE Here Comes the Pain", "Sports", ["Wrestling", "Fighting"],
    "SmackDown! Here Comes the Pain in the browser — solo exhibition or an online 1v1.",
    "Arrow keys to move around the ring, the action keys for strikes, grapples and finishers — the page shows its key map before the bell.",
    "https://wwepain.online/", "external", true, IMG + "wwe-here-comes-the-pain-art.webp"],
  ["burnout3", "Burnout 3: Takedown", "Racing", ["Racing", "Destruction", "Classic"],
    "Burnout 3 in the browser — crash traffic for takedowns and boost through the races.",
    "Arrow keys or W A S D to drive, Space for the handbrake. The page also takes a gamepad.",
    "https://burnout3.online/", "external", true, IMG + "burnout-3-art.webp"],
  ["mk-shaolin-monks", "Mortal Kombat: Shaolin Monks", "Fighting", ["Fighting", "Co-op", "Classic"],
    "Shaolin Monks on the browser build — story mode with a friend or a straight Versus bout.",
    "Arrow keys to move and jump, the action keys for punches, kicks and grapples — the page's key map shows the rest.",
    "https://mortalkombatsm.online/", "external", true, IMG + "mk-shaolin-monks-art.webp"],
  ["diablo2", "Diablo II", "Action", ["RPG", "Hack and Slash", "DOS"],
    "The 2000 action-RPG classic through the DOS.zone player — Baal, the Cow King and all.",
    "Left-click to move and attack, right-click for skills, I for inventory, C for the character sheet, Esc to save and quit.",
    "https://dos.zone/diablo-2/", "external", true, IMG + "diablo.webp"],
  ["mk-trilogy", "Mortal Kombat Trilogy", "Fighting", ["Fighting", "Classic", "DOS"],
    "Every fighter and every arena from the 1996 compilation, in the browser.",
    "Arrows to move, jump and crouch, Ctrl and Alt for the attacks, Enter to block. The pause screen shows the full key map.",
    "https://dos.zone/mortal-kombat-trilogy/", "external", true],
  ["resident-evil", "Resident Evil", "Horror", ["Survival Horror", "Classic", "DOS"],
    "Survive the Spencer Mansion — the original 1996 survival horror through the DOS.zone player.",
    "Arrows to move, Enter to interact and fire through doors, Esc for the menu. Ink ribbons still save your game.",
    "https://dos.zone/resident-evil/", "external", true],
  ["tomb-raider", "Tomb Raider", "Action", ["Adventure", "Classic", "DOS"],
    "Lara's first outing — the 1996 original through the DOS.zone player.",
    "Arrows to move and turn, Ctrl to interact, Shift to jump and grab ledges, Space to walk carefully. The start screen shows the key map.",
    "https://dos.zone/tomb-raider/", "external", true],
  ["fallout", "Fallout", "RPG", ["Post Apocalyptic", "Turn Based", "DOS"],
    "The 1997 wasteland classic through the DOS.zone player — choices first, gunfire second.",
    "The mouse rules the wasteland: left-click to move and act, right-click to inspect, I for inventory, Esc to save.",
    "https://dos.zone/fallout/", "external", true],
  ["theme-hospital", "Theme Hospital", "Simulation", ["Management", "Classic", "DOS"],
    "Cure bloaty-headed patients and keep the ward in the black — Bullfrog's 1997 classic in the browser.",
    "Left-click to place rooms and buy equipment, drag to scroll, and the bottom bar for finances and research.",
    "https://dos.zone/theme-hospital/", "external", true],
  ["worms-armageddon", "Worms Armageddon", "Strategy", ["Turn Based", "Multiplayer", "DOS"],
    "The worm-fighting peak — land, aim, and blow the other team into next week.",
    "Left-click to aim, hold to build power, release to fire. Enter ends the turn and the bottom bar switches items.",
    "https://dos.zone/worms-armageddon/", "external", true],
  ["age-of-empires2", "Age of Empires II", "Strategy", ["RTS", "Historical", "DOS"],
    "Gather, build and conquer in the 1999 classic, through the DOS.zone player.",
    "Left-click to select units and buildings, right-click to move or attack, the bottom panel to produce and advance ages.",
    "https://dos.zone/age-of-empires2/", "external", true],
  ["warcraft3", "Warcraft III", "Strategy", ["RTS", "Fantasy", "DOS"],
    "Heroes, gold and the Scourge — Warcraft III through the DOS.zone player.",
    "Left-click to select, right-click to order, the command card for abilities and buildings. Send your hero to the tavern first.",
    "https://dos.zone/warcraft-iii/", "external", true],
  ["red-alert", "Command & Conquer: Red Alert", "Strategy", ["RTS", "Classic", "DOS"],
    "The Soviet and Allied campaigns of the 1996 classic, in the browser.",
    "Left-click to select, right-click to move, the right-hand sidebar to build units and structures. Keep an eye on the minimap.",
    "https://dos.zone/command-conquer-red-alert/", "external", true],
  ["homm2", "Heroes of Might and Magic II", "Strategy", ["Turn Based", "Fantasy", "DOS"],
    "Build your castle, recruit heroes and take the adventure map one town at a time.",
    "Left-click to move your hero and pick town options, right-click to inspect a tile, the bottom bar for army and gold.",
    "https://dos.zone/heroes-of-might-and-magic-ii/", "external", true],
  ["prince-dos", "Prince of Persia (DOS)", "Platformer", ["Classic", "DOS"],
    "The original 1990 DOS release through the DOS.zone player — sixty minutes to rescue the princess.",
    "Arrows to run and jump, Shift to stand and climb, Ctrl to stab. Guards take two hits; the spikes take one.",
    "https://dos.zone/prince-of-persia-1990/", "external", true],
  ["nfs-dos", "Need for Speed (DOS)", "Racing", ["Racing", "Classic", "DOS"],
    "The 1995 original through the DOS.zone player — supercars, police chases and the Ferraris of the era.",
    "Up to accelerate, Down to brake, Left and Right to steer, Enter for the menu. Pick your car before the light turns green.",
    "https://dos.zone/the-need-for-speed-sep-1995/", "external", true],
  ["gta-vc-dos", "GTA Vice City (DOS)", "Action", ["Open World", "Driving", "DOS"],
    "Vice City through the open-source DOS engine build — neon, bikes and bad decisions.",
    "Arrows to walk and drive, Enter to get in and out of cars, Ctrl to fire. The whole city is open from the first mission.",
    "https://dos.zone/grand-theft-auto-vice-city/", "external", true, IMG + "gta-vice-city.webp"],
  ["doom", "Doom", "Shooter", ["FPS", "Classic", "DOS"],
    "1993's Doom through the DOS.zone player — E1M1 and the rest of the show.",
    "W A S D or the arrows to move, Ctrl to fire, Space to use doors, Shift to run, 1-7 to switch weapons.",
    "https://dos.zone/doom-dec-1993/", "external", true, IMG + "doom.webp"],
  ["doom2", "Doom II", "Shooter", ["FPS", "Classic", "DOS"],
    "Hell on Earth — Doom II through the DOS.zone player.",
    "W A S D to move, Ctrl to fire, Space to use, Shift to run, Tab for the map. The super shotgun is one key away.",
    "https://dos.zone/doom-ii-oct-10-1994/", "external", true, IMG + "doom.webp"],
  ["quake-dos", "Quake (DOS)", "Shooter", ["FPS", "Classic", "DOS"],
    "The 1996 original through the DOS.zone player — before the ports, at the source.",
    "W A S D to move, mouse to turn, Ctrl to fire, Space to jump, Enter to use. Click the frame first so it takes the keys.",
    "https://dos.zone/quake-1996/", "external", true, IMG + "quake-art.webp"],
  ["wolfenstein3d", "Wolfenstein 3D", "Shooter", ["FPS", "Classic", "DOS"],
    "BJ's first escape from Castle Wolfenstein, straight in the browser.",
    "Arrows to move and turn, Ctrl to fire, Alt to open doors and use, Shift to run, Space to open secret walls.",
    "https://dos.zone/wolfenstein-3d-may-05-1992/", "external", true],
  ["duke-nukem-3d", "Duke Nukem 3D", "Shooter", ["FPS", "Action", "DOS"],
    "Groovy — Duke Nukem 3D through the DOS.zone player.",
    "W A S D to move, Ctrl to fire, Space to kick and use, Enter to open, Alt to aim. Kick everything that moves.",
    "https://dos.zone/duke-nukem-3d-1996/", "external", true],
  // ── Latest additions: six titles that load straight into this frame ──────
  ["slither-io", "Slither.io", "Arcade", [".io", "Multiplayer", "Snake"],
    "Eat the glowing orbs, coil around the stragglers and grow the longest snake on the server.",
    "Steer with the mouse or your finger — the snake follows it wherever you go. Hold click (or Space) to burn mass for a burst of speed; use it to cut someone off, not to cruise.",
    "https://slither.io/", "iframe", false],
  ["shellshock-io", "Shell Shockers", "Shooter", ["FPS", "Multiplayer", "Eggs"],
    "First-person egg warfare: crack the other team before anyone cracks you.",
    "W A S D to move, mouse to aim, click to fire, R to reload, 1-4 to swap weapons. Pick your class from the lobby before you spawn.",
    "https://shellshock.io/", "iframe", true],
  ["surviv-io", "Surviv.io", "Shooter", ["Battle Royale", "Top Down", "Multiplayer"],
    "A top-down battle royale: loot the buildings, out-shoot the room and be the last player standing.",
    "W A S D to move, mouse to aim, click to fire, R to reload, E to pick up gear, Tab for the full map. Loot fast — the storm closes in.",
    "https://surviv.io/", "iframe", true],
  ["sandspiel", "Sandspiel", "Sandbox", ["Physics", "Creative", "Falling Sand"],
    "A falling-sand toybox: pour water, grow plants, set fires and watch the elements argue with each other.",
    "Pick an element from the bar (or the number keys), then click and drag on the grid to pour it. Right-click erases, and the bottom row holds the sand you have already dropped.",
    "https://sandspiel.club/", "iframe", false],
  ["hextris", "Hextris", "Puzzle", ["Stacking", "Reflex", "Rhythm"],
    "Rotate the hexagon and slot incoming blocks onto its sides — the stack speeds up the longer you last.",
    "Left and Right arrows (or A and D) rotate the hexagon. Line up three of the same colour on one side to clear them.",
    "https://hextris.github.io/", "iframe", false],
  ["skribbl-io", "Skribbl.io", "Party", ["Drawing", "Guessing", "Multiplayer"],
    "One player draws, the whole lobby races to guess it — word chaos in a room of strangers or friends.",
    "Draw with the mouse in the canvas, type guesses into the chat box and press Enter. Room codes let you bring your own lobby along.",
    "https://skribbl.io/", "iframe", false],
];

// Titles that carry more than one mirror. They stay a single card in the library;
// the player picks which server to use on the game's own page. A server that
// refuses framing is marked `external` and hands over its link instead.
const serverGames: Game[] = [
  {
    id: "cs16",
    title: "Counter-Strike 1.6",
    category: "Shooter",
    tags: ["FPS", "Multiplayer", "Browser Ready"],
    description: "The original Counter-Strike 1.6 in the browser, across five community servers.",
    controls: "W A S D to move, mouse to aim, click to fire, R to reload, B for the buy menu. Walk before you shoot.",
    thumbnail: cover(900),
    sourceUrl: "https://wasm.rip/files/gstrike/index.html",
    type: "iframe",
    heavy: true,
    isNew: true,
    servers: [
      { id: "wasmrip", label: "Server 1 — wasm.rip", url: "https://wasm.rip/files/gstrike/index.html" },
      { id: "combat", label: "Server 2 — CombatSkirmish", url: "https://combatskirmish.net/quickjoin" },
      { id: "csjs", label: "Server 3 — CSJS", url: "https://csjs.live/" },
      { id: "spawn", label: "Server 4 — Spawn", url: "https://www.spawn.co/@smallzero/counter-strike-spawn/play", external: true, note: "Spawn blocks embedding, so this one opens in your own tab." },
      { id: "xash", label: "Server 5 — Xash3D", url: "https://x8bitrain.github.io/webXash/", note: "The Half-Life / CS 1.6 Xash3D port." },
    ],
  },
  {
    id: "gta3",
    title: "GTA III",
    category: "Action",
    tags: ["Open World", "Driving", "Browser Ready"],
    description: "Liberty City in 2001: steal cars, run jobs and keep moving through the story.",
    controls: "W A S D or the arrows to walk and drive, mouse to look, Enter to get in and out of cars.",
    thumbnail: cover(901),
    sourceUrl: "https://wasm.rip/files/gta3/index.html",
    type: "iframe",
    heavy: true,
    isNew: true,
    servers: [
      { id: "wasmrip", label: "Server 1 — wasm.rip", url: "https://wasm.rip/files/gta3/index.html" },
      { id: "arcade", label: "Server 2 — wasmarcade", url: "https://wasmarcade.com/gta3", external: true, note: "The arcade host blocks embedding, so this one opens in your own tab." },
    ],
  },
  {
    id: "world-at-war-zombies",
    title: "World at War Zombies",
    category: "Shooter",
    tags: ["FPS", "Zombies", "Co-op", "Browser Ready"],
    description: "The four original Call of Duty: World at War maps — Nacht der Untoten, Verrückt, Shi No Numa and Der Riese — with a second community build alongside.",
    controls: "W A S D to move, mouse to aim, click to shoot, R to reload, F to buy doors and weapons. Hold the windows and watch the points.",
    thumbnail: IMG + "cod-waw-zombies-art.webp",
    sourceUrl: "https://waw.fun/",
    type: "iframe",
    heavy: true,
    isNew: true,
    servers: [
      { id: "wawfun", label: "Server 1 — waw.fun", url: "https://waw.fun/", external: true, note: "The four original WaW maps — this host blocks embedding, so it opens in your own tab." },
      { id: "concentric", label: "Server 2 — concentric", url: "https://zombies.concentric.live/", external: true, note: "The community build with Nacht, Verrückt and Kino der Toten, solo or with friends. It opens in your own tab too." },
    ],
  },
];

// Cover art and extra mirrors handed over with the latest batch of titles.
// `servers` append to whatever the card already carries and the whole row gets
// renumbered; a mirror that refuses framing is marked `external`, so it hands
// over its link instead of trying to load in this frame.
type ServerAdd = { name: string; url: string; external?: boolean; lead?: boolean };
type LibraryPatch = { thumbnail?: string; servers?: ServerAdd[] };

const LIBRARY_PATCH: Record<string, LibraryPatch> = {
  "gta-vicecity": { thumbnail: IMG + "gta-vice-city.webp", servers: [{ name: "Rabisco", url: "https://gta.rabisco.net/" }] },
  gta3: { thumbnail: IMG + "gta-3.webp" },
  "web-gta-chinatown": { thumbnail: IMG + "gta-chinatown-wars.webp" },
  "gta-v": {
    thumbnail: IMG + "gta-v.webp",
    servers: [{ name: "pages.dev", url: "https://gta5-87g.pages.dev/", external: true }],
  },
  cs16: { thumbnail: IMG + "counter-strike.webp" },
  "half-life": { thumbnail: IMG + "half-life.webp", servers: [{ name: "Xash3D", url: "https://x8bitrain.github.io/webXash/" }] },
  "proxy-tf2": { thumbnail: IMG + "team-fortress-2.webp" },
  "halo-ce": { thumbnail: IMG + "halo-ce.webp" },
  "halo-ce-mobile": { thumbnail: IMG + "halo-ce-mobile.webp" },
  "web-halo-community": { thumbnail: IMG + "halo-ce.webp" },
  // vel.gg/bo1z answers 451 (Unavailable For Legal Reasons) from some regions,
  // so the healthy bsz mirror leads the row; bo1z stays selectable as Server 2.
  "bo1-zombies": { thumbnail: IMG + "bo1-zombies.webp", servers: [{ name: "bsz", url: "https://vel.gg/bsz", lead: true }] },
  "proxy-mw2": { thumbnail: IMG + "modern-warfare-2.webp", servers: [{ name: "iw4browse", url: "https://iw4browse.iw4b.workers.dev/" }] },
  "proxy-doom2": { thumbnail: IMG + "doom.webp" },
  "quake-episode-1": { thumbnail: IMG + "quake-art.webp", servers: [{ name: "pages.dev", url: "https://quake-srp.pages.dev/" }] },
  "quake-3": { thumbnail: IMG + "quake-3.webp" },
  "quake-2": { thumbnail: IMG + "quake-2.webp" },
  "quake-1": { thumbnail: IMG + "quakeworld.webp" },
  rtcw: { thumbnail: IMG + "rtcw.webp" },
  "unreal-tournament": { thumbnail: IMG + "urban-terror.webp" },
  "simpsons-hit-run": { thumbnail: IMG + "simpsons-hit-and-run.webp" },
  diablo: { thumbnail: IMG + "diablo.webp" },
  "proxy-minecraft": { thumbnail: IMG + "minecraft.webp" },
  "skate-3": { thumbnail: IMG + "skate-3.webp" },
  "cs-surf": { thumbnail: IMG + "surfd.webp" },
  "pes-6": { thumbnail: IMG + "pes-6.webp" },
  "pes-2011": { thumbnail: IMG + "pes-2011-art.webp", servers: [{ name: "optijuegos", url: "https://pes11.optijuegos.net/" }] },
  "pes-2014": { thumbnail: IMG + "pes-2014-art.webp", servers: [{ name: "pes14.online", url: "https://pes14.online/", external: true }] },
  "fifa-14": { thumbnail: IMG + "fifa-14-art.webp", servers: [{ name: "fifa14.online", url: "https://fifa14.online/", external: true }] },
  "cricket-07": { thumbnail: IMG + "cricket-07-art.webp", servers: [{ name: "dhaiwat", url: "https://cricket07.dhaiwat.com/" }] },
  "wwe-smackdown-raw-2011": { thumbnail: IMG + "wwe-svr-2011-art.webp" },
  "tekken-5-dark-resurrection": { thumbnail: IMG + "tekken-5-dark-resurrection-art.webp", servers: [{ name: "tekkendr.live", url: "https://tekkendr.live/", external: true }] },
  "nfs-most-wanted": { thumbnail: IMG + "nfs-most-wanted-art.webp", servers: [{ name: "lauta.site", url: "https://nfsmwested.lauta.site/" }] },
  "nfs-underground-2": { thumbnail: IMG + "need-for-speed-underground-2-art.webp", servers: [{ name: "nfsunderground2.site", url: "https://nfsunderground2.site/", external: true }] },
  "midnight-club-3-dub": { thumbnail: IMG + "midnight-club-3-art.webp", servers: [{ name: "midnighhtclub3.online", url: "https://midnighhtclub3.online/", external: true }] },
  "web-dragonball-bt3": { thumbnail: IMG + "dragon-ball-bt3.webp" },
  "super-monkey-ball": { thumbnail: IMG + "super-monkey-ball-art.webp" },
  "proxy-flashgames": { thumbnail: IMG + "flash-games.webp" },
  "proxy-arcadeclassics": { thumbnail: IMG + "arcade-classics.webp" },
  "majesty-gold-hd": { thumbnail: IMG + "majesty-gold-hd-art.webp", servers: [{ name: "boland.co", url: "https://majesty.boland.co/" }] },
  crimsonland: { thumbnail: IMG + "crimsonland-art.webp" },
  "web-lego-island": { thumbnail: IMG + "lego-island.webp" },
  "web-pokemon-redstone": { thumbnail: IMG + "pokemon-redstone.webp" },
  "pokemon-games": { thumbnail: IMG + "pokemon-red-to-black-art.webp", servers: [{ name: "pokeweb", url: "https://pokeweb.morisoba.moe/", external: true }] },
  "web-park-baron": { thumbnail: IMG + "park-baron.webp" },
  "web-seedbed": { thumbnail: IMG + "seedbed.webp" },
  portal: { thumbnail: IMG + "portal-art.webp" },
  "snail-mail": { thumbnail: IMG + "snail-mail-art.webp" },
  morrowind: { thumbnail: IMG + "morrowind-art.webp", servers: [{ name: "morrowind.app", url: "https://morrowind.app/", external: true }] },
  "web-super-mario-zombies": { thumbnail: IMG + "super-mario-zombies.webp" },
  "web-tweetcraft": { thumbnail: IMG + "tweetcraft.webp" },
  "web-binding-isaac": { thumbnail: IMG + "binding-of-isaac.webp" },
  "proxy-runescapeclassic": { thumbnail: IMG + "runescape-classic.webp" },
};

function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "main";
  }
}

/** Folds LIBRARY_PATCH into a copy of the library: covers swap in, mirrors append and get renumbered. */
function applyLibraryPatch(list: Game[]): Game[] {
  return list.map((game) => {
    const patch = LIBRARY_PATCH[game.id];
    if (!patch) return game;

    let servers = game.servers;
    if (!servers && patch.servers) {
      servers = [{ id: "main", label: `Server 1 — ${hostLabel(game.sourceUrl)}`, url: game.sourceUrl, external: Boolean(game.openInNewTab) }];
    }
    if (servers && patch.servers) {
      const known = new Set(servers.map((server) => server.url));
      let mirror = 0;
      const marked = patch.servers
        .filter((entry) => !known.has(entry.url))
        .map((entry) => ({ id: `mirror-${++mirror}`, label: entry.name, url: entry.url, external: entry.external, lead: entry.lead }));
      // `lead` is only a marker for this reordering step, so it is dropped here.
      const toServer = ({ id, label, url, external }: { id: string; label: string; url: string; external?: boolean; lead?: boolean }): GameServer => ({ id, label, url, external });
      const leading = marked.filter((entry) => entry.lead).map(toServer);
      const trailing = marked.filter((entry) => !entry.lead).map(toServer);
      servers = [...leading, ...servers, ...trailing].map((server, index) => {
        const name = server.label.split("—").slice(1).join("—").trim() || server.label;
        return { ...server, label: `Server ${index + 1} — ${name}` };
      });
    }

    return {
      ...game,
      ...(patch.thumbnail ? { thumbnail: patch.thumbnail } : {}),
      ...(servers ? { servers } : {}),
    };
  });
}

export const games: Game[] = handOverPremium(applyLibraryPatch([
  {
    id: "gta-v",
    title: "Grand Theft Auto V",
    category: "Action",
    tags: ["Open World", "Action", "Browser Ready"],
    description: "A browser build of GTA V: Story Mode, ported to run in the browser.\n\n\"When a young street hustler, a retired bank robber and a terrifying psychopath find themselves entangled with some of the most frightening and deranged elements of the criminal underworld, the U.S. government and the entertainment industry, they must pull off a series of dangerous heists to survive in a ruthless city in which they can trust nobody, least of all each other.\" — Official Description.",
    controls: "WASD to move, mouse to look around, click to interact, Space to jump, keys to switch weapons and use items. Story Mode starts from the Prologue.\n\nOfficially released September 17, 2013, for Xbox 360 and PlayStation 3, with enhanced Xbox One / PlayStation 4 versions on November 18, 2014, PC on April 14, 2015, and an expanded PlayStation 5 / Xbox Series X|S version on March 15, 2022; the PC version became available on March 4, 2025. Players may also purchase access to GTA V as an add-on for the standalone versions of GTA Online.",
    thumbnail: "https://static.wikia.nocookie.net/gtawiki/images/7/76/CoverArt-GTAV.png/revision/latest?cb=20250708181846",
    // GTA V hands over its link instead of loading here: the entrance is a
    // plain link with no mode cards — the player copies it and opens their own tab.
    openInNewTab: true,
    sourceUrl: "https://sigamespremiumrp.spideyiraj1925.workers.dev/",
    servers: [
      { id: "playgta5", label: "Server 1 — SI Premium", url: "https://sigamespremiumrp.spideyiraj1925.workers.dev/", external: true, note: "The main GTA V build, served through the SI premium proxy." },
      {
        id: "gta5v2",
        label: "Server 2 — GTA V V2",
        url: "https://v1-game.playgta5.pro/",
        external: true,
        note: "Second build on the v1-game host. Pick a mode below — the link opens in your own tab with that mode appended.",
        // This host reads ?mode=story | sandbox | chromebook, ?map=env_test and ?play=.
        modes: [
          { id: "story", label: "Story Mode", query: "?mode=story", note: "The campaign from the Prologue — Story Mode loads straight away." },
          { id: "sandbox", label: "Sandbox Mode", query: "?mode=sandbox", note: "Free roam on the GTA V map at a random spot, every weapon unlocked." },
          { id: "gtavi", label: "GTA VI Map", query: "?mode=sandbox&map=env_test", note: "Sandbox Mode on the env_test level — the GTA VI Map." },
          { id: "chromebook", label: "Chromebook", query: "?mode=chromebook&play=story", note: "Lightweight preset: 960×540, 30 FPS, two engine cores and the low-memory profile." },
          { id: "title", label: "Title screen", query: "?mode=", note: "No preset — the game's own title screen asks (Enter = Story, Space = Sandbox)." },
        ],
      },
    ],
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
    id: "endurance-race",
    title: "Endurance Race",
    category: "Racing",
    tags: ["Racing", "Drift", "Rain", "WebGPU"],
    description: "Project Endurance — a rain-soaked night race built with WebGPU and Three.js. A car drifts through the downpour on a wet circuit, headlights cutting the spray as every corner asks for one more slide.\n\nBest played in a WebGPU-capable browser such as Chrome or Edge; the 3D track and rain need hardware acceleration.",
    controls: "W or Arrow Up to accelerate, S or Arrow Down to brake and reverse, A / D or Left / Right to steer. Give it a moment to build the track the first time it loads.",
    thumbnail: "/thumbs/endurance-race.svg",
    sourceUrl: "https://endurance-racing.vercel.app",
    type: "iframe",
    heavy: true,
    isNew: true,
    media: {
      banner: "/thumbs/endurance-race.svg",
      trailer: {
        src: "https://cdn-in.recordit.dev/media/51da14b3-301a-4ba2-97e4-11879f35f5c7/content.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=DO801UKKPV7QEVRY7JEQ%2F20261019%2Fblr1%2Fs3%2Faws4_request&X-Amz-Date=20261019T085819Z&X-Amz-Expires=3600&X-Amz-Signature=76a04591db1da3150f04f63879388193401a4adf9cf542bff8e8bec5ca653520&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject",
        poster: "/thumbs/endurance-race.svg",
        caption: "Endurance Race — a car drifting through the rain on a wet night circuit.",
      },
      facts: [
        { label: "Developer", value: "Anderson Mancini" },
        { label: "Engine", value: "Three.js · WebGPU" },
        { label: "Genre", value: "Racing · Endurance" },
        { label: "Setting", value: "Night circuit · Heavy rain" },
        { label: "Mode", value: "Single player" },
        { label: "Requires", value: "WebGPU browser (Chrome or Edge)" },
      ],
    },
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
    servers: [
      { id: "cinevo", label: "Server 1 — vc.cinevo.us", url: decodeTarget("aHR0cHM6Ly92Yy5jaW5ldm8udXM=") },
      { id: "arcade", label: "Server 2 — wasmarcade", url: "https://wasmarcade.com/vice-city", external: true, note: "The arcade host blocks embedding, so this one opens in your own tab." },
    ],
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
    servers: [
      { id: "stgames", label: "Server 1 — stgames", url: "https://stgames.top/unity/amongus/" },
      { id: "wasmrip", label: "Server 2 — wasm.rip", url: "https://wasm.rip/files/amongus/index.html" },
    ],
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
    tags: ["FPS", "Zombies", "Browser Ready"],
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
    tags: ["FPS", "Zombies", "Browser Ready"],
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
    tags: ["FPS", "Arena", "Browser Ready"],
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
    tags: ["FPS", "Campaign", "Browser Ready"],
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
    tags: ["Skateboarding", "Open World", "Browser Ready"],
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
    tags: ["FPS", "Surf", "Browser Ready"],
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
    tags: ["FPS", "Campaign", "Browser Ready"],
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
    tags: ["FPS", "Touch", "Browser Ready"],
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
    tags: ["Football", "Classic", "Browser Ready"],
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
    tags: ["Open World", "Driving", "Browser Ready"],
    description: "Drive Springfield and dodge the robots in this browser port.",
    controls: "WASD to move and drive, mouse to look around, Space to jump out of the car.",
    thumbnail: cover(71),
    sourceUrl: "https://shar-wasm.cjoseph.workers.dev/?skipmovie",
    type: "iframe",
    heavy: true,
    servers: [
      { id: "wasm", label: "Server 1 — WASM build", url: "https://shar-wasm.cjoseph.workers.dev/?skipmovie" },
      { id: "arcade", label: "Server 2 — wasmarcade", url: "https://wasmarcade.com/simpsons", external: true, note: "The arcade host blocks embedding, so this one opens in your own tab." },
    ],
  },
  {
    id: "quake-1",
    title: "Quake",
    category: "Shooter",
    tags: ["FPS", "Classic", "Browser Ready"],
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
    tags: ["FPS", "Classic", "Browser Ready"],
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
    tags: ["FPS", "Arena", "Browser Ready"],
    description: "Pure arena fragging, no campaign, all skill.",
    controls: "WASD to move, mouse to aim, click to fire, Space to jump, Ctrl to crouch.",
    thumbnail: cover(74),
    sourceUrl: "https://q3.pieter.com",
    type: "iframe",
    heavy: true,
    servers: [
      { id: "pieter", label: "Server 1 — pieter", url: "https://q3.pieter.com" },
      { id: "q3js", label: "Server 2 — Q3JS", url: "https://q3js.com/" },
    ],
  },
  {
    id: "rtcw",
    title: "Return to Castle Wolfenstein",
    category: "Shooter",
    tags: ["FPS", "Campaign", "Browser Ready"],
    description: "B.J. Blazkowicz breaks out again, in a browser build of RTCW.",
    controls: "WASD to move, mouse to aim, click to shoot, R to reload, F for levers and doors.",
    thumbnail: cover(75),
    sourceUrl: "https://rtcw.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "unreal-tournament",
    title: "Urban Terror",
    category: "Shooter",
    tags: ["FPS", "Team Shooter", "Browser Ready"],
    description: "The free Quake-engine shooter — urban maps, a full weapon set and team games, running in this frame.",
    controls: "WASD to move, mouse to aim, click to fire, Space to jump, R to reload. Click the frame first so it takes the keys.",
    thumbnail: cover(76),
    sourceUrl: "https://ut.pieter.com",
    type: "iframe",
    heavy: true,
  },
  {
    id: "half-life",
    title: "Half-Life",
    category: "Shooter",
    tags: ["FPS", "Campaign", "Browser Ready"],
    description: "Gordon Freeman's shift at Black Mesa, ported to the browser.",
    controls: "WASD to move, mouse to look, click to use objects and fire, R to reload, 1-6 for weapons.",
    thumbnail: cover(77),
    sourceUrl: "https://pixelsuft.github.io/hl/",
    type: "iframe",
    heavy: true,
  },
  {
    id: "diablo",
    title: "Diablo",
    category: "Action",
    tags: ["RPG", "Hack and Slash", "Browser Ready"],
    description: "Descend into the cathedral and clear the dungeons in a browser port.",
    controls: "Click to move and attack, number keys for skills. Loot everything you find.",
    thumbnail: cover(79),
    sourceUrl: "https://johnimril.github.io/diablo_web/",
    type: "iframe",
    heavy: true,
  },

  ...remoteGames.map(([id, title, category, tags, description, controls, sourceUrl, heavy], index): Game => ({
    id,
    title,
    category,
    tags,
    description,
    controls,
    sourceUrl,
    thumbnail: cover(200 + index),
    type: "iframe",
    heavy,
    isNew: true,
    // Hosts that refuse framing hand the player the link instead.
    openInNewTab: NON_FRAMABLE_HOSTS.some((host) => sourceUrl.includes(host)),
  })),    ...serverGames,
    ...linkedGames.map(([id, title, category, tags, description, controls, sourceUrl, type, heavy, image], index): Game => ({
    id,
    title,
    category,
    tags,
    description,
    controls,
    sourceUrl,
    thumbnail: image ?? cover(500 + index),
    type,
    heavy,
    isNew: true,
    // Hosts that refuse framing hand their link over instead of loading here.
    openInNewTab: NON_FRAMABLE_HOSTS.some((host) => sourceUrl.includes(host)),
  })),
]));


export const categories = ["All Games", ...Array.from(new Set(games.map((game) => game.category)))];

export const allGames: Game[] = handOverPremium(applyLibraryPatch([
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
]));


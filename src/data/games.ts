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
  heavy?: boolean;
  extensionNotice?: boolean;
  extensionUrl?: string;
};

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
    };
  }),
];

export const categories = ["All Games", ...Array.from(new Set(games.map((game) => game.category)))];

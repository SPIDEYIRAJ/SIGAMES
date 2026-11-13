import type { Game } from "@/data/games";

/**
 * On-device "AI" search for the shelf.
 *
 * No key, no network, no latency: the query is read as intent (not a substring),
 * expanded through concept groups and synonyms, typo-tolerant on title words,
 * and scored across title, category, tags and description. "like Pac-Man" turns
 * into a similarity search against Pac-Man's category and tags.
 */

type Concept = {
  label: string;
  /** Query words that trigger the concept. */
  match: string[];
  /** Extra terms folded into the search. */
  terms: string[];
};

const CONCEPTS: Concept[] = [
  { label: "horror", match: ["scary", "spooky", "creepy", "horror", "fear", "dark"], terms: ["horror", "zombie", "ghost", "survival", "dark"] },
  { label: "racing", match: ["racing", "race", "driving", "drive", "drift", "cars", "car"], terms: ["racing", "driving", "race", "car", "kart"] },
  { label: "shooter", match: ["shooter", "shooting", "fps", "gun", "guns", "war"], terms: ["shooter", "fps", "gun", "war", "action"] },
  { label: "fighting", match: ["fighting", "fight", "combat", "brawler", "versus"], terms: ["fighting", "combat", "versus", "brawler"] },
  { label: "puzzle", match: ["puzzle", "brain", "logic", "thinking", "relaxing", "chill", "calm"], terms: ["puzzle", "logic", "casual", "brain", "match"] },
  { label: "retro", match: ["retro", "classic", "old", "oldschool", "arcade", "nostalgia"], terms: ["classic", "retro", "arcade"] },
  { label: "multiplayer", match: ["multiplayer", "2player", "2", "two", "player", "players", "coop", "online", "friends", "together"], terms: ["multiplayer", "online", "co-op", "versus"] },
  { label: "platformer", match: ["platformer", "platform", "jump", "jumping", "mario"], terms: ["platform", "jump", "adventure"] },
  { label: "space", match: ["space", "sci-fi", "scifi", "galaxy", "spaceship", "alien"], terms: ["space", "sci-fi", "galaxy", "alien"] },
  { label: "sports", match: ["sports", "football", "soccer", "basketball", "skate", "skating"], terms: ["sports", "football", "soccer", "basketball", "skate"] },
  { label: "strategy", match: ["strategy", "strategic", "tactics", "rts", "chess"], terms: ["strategy", "tactics", "rts", "chess"] },
  { label: "rpg", match: ["rpg", "adventure", "quest", "story", "openworld"], terms: ["rpg", "adventure", "quest", "open world"] },
  { label: "sandbox", match: ["sandbox", "creative", "build", "building", "minecraft"], terms: ["sandbox", "creative", "build", "open world"] },
  { label: "cards", match: ["cards", "card", "solitaire", "poker"], terms: ["cards", "card", "solitaire", "poker"] },
  { label: "html", match: ["html", "light", "fast", "small"], terms: ["html", "browser"] },
];

/** Words that carry no search signal on their own. */
const STOP = new Set([
  "a", "an", "and", "any", "best", "browser", "find", "for", "fun", "game", "games", "give", "good",
  "i", "in", "is", "it", "like", "me", "my", "of", "on", "or", "play", "please", "something", "that",
  "the", "to", "want", "with", "you", "similar",
]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "");

const words = (value: string) => normalize(value).split(/[^a-z0-9+]+/).filter(Boolean);

/** Sørensen–Dice similarity of two words, used for near-miss typos. */
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = new Map<string, number>();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = a.slice(index, index + 2);
    bigrams.set(pair, (bigrams.get(pair) ?? 0) + 1);
  }
  let hits = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = b.slice(index, index + 2);
    const count = bigrams.get(pair) ?? 0;
    if (count > 0) {
      hits += 1;
      bigrams.set(pair, count - 1);
    }
  }
  return (2 * hits) / (a.length - 1 + b.length - 1);
}

/** Finds the title a "like X" / "similar to X" query points at. */
function findReference(query: string, library: Game[]): Game | null {
  const normalized = normalize(query);
  const marker = normalized.match(/(?:similar\s+to|like)\s+(.+)$/);
  if (!marker) return null;
  const target = marker[1].replace(/[?.!]/g, "").trim();
  if (target.length < 3) return null;
  const targetWords = words(target).filter((word) => !STOP.has(word));
  if (!targetWords.length) return null;

  let best: { game: Game; score: number } | null = null;
  for (const game of library) {
    const title = normalize(game.title);
    const score = title.includes(target) || target.includes(title)
      ? 100
      : targetWords.reduce((total, word) => total + (words(game.title).includes(word) ? 30 : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { game, score };
  }
  return best?.game ?? null;
}

export interface SearchOutcome {
  games: Game[];
  /** Short human labels describing how the query was read. */
  labels: string[];
}

export function searchGames(library: Game[], rawQuery: string): SearchOutcome {
  const query = normalize(rawQuery).trim();
  if (!query) return { games: library, labels: [] };

  const reference = findReference(rawQuery, library);
  const queryWords = words(rawQuery).filter((word) => !STOP.has(word));

  const labels: string[] = [];
  const expanded = new Set(queryWords);
  for (const concept of CONCEPTS) {
    // Direct hit, or a near miss on a concept word ("shootr" -> shooter).
    const hit = concept.match.some((word) => queryWords.includes(word)) ||
      queryWords.some((queryWord) =>
        concept.match.some((word) => word.length >= 4 && dice(queryWord, word) >= 0.7),
      );
    if (hit) {
      labels.push(concept.label);
      for (const term of concept.terms) expanded.add(term);
    }
  }
  if (reference) labels.push(`similar to ${reference.title}`);
  if (!labels.length && queryWords.length) labels.push(queryWords.slice(0, 3).join(" · "));

  const terms = [...expanded];
  if (!terms.length) return { games: library, labels };

  const scored: { game: Game; score: number }[] = [];
  for (const game of library) {
    if (reference && game.id === reference.id) continue;

    const title = normalize(game.title);
    const titleWords = words(game.title);
    const tags = game.tags.map(normalize);
    const category = normalize(game.category);
    const description = normalize(game.description);
    let score = 0;

    if (title === query) score += 1200;
    else if (title.startsWith(query)) score += 420;
    else if (title.includes(query)) score += 260;

    for (const term of terms) {
      // Words the player actually typed outrank concept words folded in.
      const weight = queryWords.includes(term) ? 1.4 : 0.8;
      if (titleWords.includes(term)) score += Math.round(52 * weight);
      else if (title.includes(term)) score += Math.round(30 * weight);
      else if (tags.some((tag) => tag === term || tag.includes(term))) score += Math.round(24 * weight);
      else if (category.includes(term)) score += Math.round(34 * weight);
      else if (description.includes(term)) score += Math.round(7 * weight);

      if (term.length >= 4) {
        for (const word of titleWords) {
          if (word.length < 4) continue;
          const similarity = dice(term, word);
          // 0.66 catches ordinary typos ("shootr"), the prefix rule catches
          // truncated words ("monky" -> "monkey") that Dice scores too low.
          if (similarity >= 0.66) score += Math.round(30 * similarity);
          else if (term.length >= 5 && word.startsWith(term.slice(0, 4))) score += 16;
        }
        // Typo in a tag ("shootr" -> "shooter") should still find the genre.
        if (tags.some((tag) => tag.length >= 4 && dice(term, tag) >= 0.72)) score += 20;
      }
    }

    if (reference) {
      if (game.category === reference.category) score += 50;
      const shared = game.tags.filter((tag) => reference.tags.includes(tag)).length;
      score += shared * 45;
      if (game.htmlGame === reference.htmlGame) score += 12;
    }

    if (score > 0) scored.push({ game, score });
  }

  scored.sort((left, right) => right.score - left.score || left.game.title.localeCompare(right.game.title));
  // "Like X" can legitimately match a whole genre; keep the closest 40 so the
  // shelf shows neighbours, not everything sharing one category.
  const results = reference ? scored.slice(0, 40) : scored;
  return { games: results.map((entry) => entry.game), labels: [...new Set(labels)] };
}

/** Example prompts shown under an empty search box. */
export const SEARCH_IDEAS = [
  "scary games",
  "2 player racing",
  "like Pac-Man",
  "relaxing puzzle",
] as const;

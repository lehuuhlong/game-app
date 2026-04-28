/**
 * Game registry — the single source of truth for all available games.
 *
 * To add a new game to the portal:
 * 1. Create a folder in /src/games/<game-name>/
 * 2. Add an entry to the GAMES array below
 * 3. Create a route at /src/app/games/<game-name>/page.tsx
 *
 * That's it. The home page and navigation will pick it up automatically.
 */

export interface GameInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string; // path relative to /public
  route: string;
  minPlayers: number;
  maxPlayers: number;
  tags: string[];
  color: string; // Tailwind gradient class for the card
}

export const GAMES: GameInfo[] = [
  {
    id: "2048",
    title: "2048",
    description:
      "Slide numbered tiles on a grid to combine them and reach the 2048 tile. A single-player puzzle of strategy and luck.",
    thumbnail: "/games/2048/thumbnail.png",
    route: "/games/2048",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Puzzle", "Single Player", "Strategy"],
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "caro",
    title: "Caro",
    description:
      "A classic 5-in-a-row strategy game. Play locally with a friend or compete online in real-time.",
    thumbnail: "/games/caro/thumbnail.png",
    route: "/games/caro",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["Strategy", "Multiplayer", "Board Game"],
    color: "from-violet-500 to-purple-600",
  },
  {
    id: "minesweeper",
    title: "Minesweeper",
    description:
      "Navigate a minefield by revealing safe cells. Use logic to flag mines and clear the board without exploding!",
    thumbnail: "/games/minesweeper/thumbnail.png",
    route: "/games/minesweeper",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Puzzle", "Single Player", "Logic"],
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "wordle",
    title: "Wordle",
    description:
      "Guess the 5-letter word in 6 tries. Each guess reveals clues — green, yellow, or gray — to crack the code.",
    thumbnail: "/games/wordle/thumbnail.png",
    route: "/games/wordle",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Word", "Single Player", "Puzzle"],
    color: "from-rose-500 to-pink-600",
  },
];

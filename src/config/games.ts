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
  {
    id: "sudoku",
    title: "Sudoku",
    description:
      "Fill the 9x9 grid so that each column, row, and 3x3 section contain all of the digits between 1 and 9.",
    thumbnail: "/games/sudoku/thumbnail.png",
    route: "/games/sudoku",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Number", "Single Player", "Logic"],
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "trex",
    title: "T-Rex Runner",
    description:
      "Chrome's classic offline dinosaur game. Jump over cacti, dodge pterodactyls, and chase your high score in this endless runner!",
    thumbnail: "/games/trex/thumbnail.png",
    route: "/games/trex",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Arcade", "Single Player", "Endless"],
    color: "from-stone-500 to-zinc-700",
  },
  {
    id: "flappybird",
    title: "Flappy Bird",
    description:
      "Tap to flap through an endless course of pipes. Master the rhythm, survive the shrinking gaps, and chase your best score.",
    thumbnail: "/games/flappybird/thumbnail.svg",
    route: "/games/flappybird",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Arcade", "Single Player", "Reflex", "Endless"],
    color: "from-sky-400 via-cyan-500 to-emerald-500",
  },
  {
    id: "wordchain",
    title: "Word Chain",
    description:
      "A fast-paced multiplayer word game. Connect words where the next word starts with the last letter of the previous one. English and Vietnamese supported!",
    thumbnail: "/games/wordchain/thumbnail.png",
    route: "/games/wordchain",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["Word", "Multiplayer", "Fast Paced"],
    color: "from-emerald-400 to-teal-500",
  },
  {
    id: "aimtrainer",
    title: "Aim Trainer",
    description:
      "Test your reflexes and precision. Hit as many targets as you can in 60 seconds and track your click accuracy.",
    thumbnail: "/games/aimtrainer/thumbnail.png",
    route: "/games/aimtrainer",
    minPlayers: 1,
    maxPlayers: 1,
    tags: ["Action", "Single Player", "Reflex"],
    color: "from-red-500 to-rose-600",
  },
  {
    id: "battleship",
    title: "Battleship",
    description:
      "Engage in tactical naval combat. Place your fleet strategically and sink the enemy's ships in this real-time multiplayer classic.",
    thumbnail: "/games/battleship/thumbnail.png",
    route: "/games/battleship",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["Strategy", "Multiplayer", "War"],
    color: "from-blue-600 to-indigo-800",
  },
  {
    id: "monopoly",
    title: "Monopoly",
    description:
      "The classic property trading board game. Roll dice, buy properties, collect rent, and bankrupt your opponents in real-time 2-4 player multiplayer.",
    thumbnail: "/games/monopoly/thumbnail.png",
    route: "/games/monopoly",
    minPlayers: 2,
    maxPlayers: 4,
    tags: ["Strategy", "Multiplayer", "Board Game"],
    color: "from-amber-500 via-red-500 to-emerald-600",
  },
  {
    id: "chess",
    title: "Chess",
    description:
      "The royal game of strategy. Real-time 2-player multiplayer with standard chess rules, 15-minute game clocks, and FEN state synchronization.",
    thumbnail: "/games/chess/thumbnail.png",
    route: "/games/chess",
    minPlayers: 2,
    maxPlayers: 2,
    tags: ["Strategy", "Multiplayer", "Board Game", "Classic"],
    color: "from-amber-600 via-stone-700 to-slate-900",
  },
];

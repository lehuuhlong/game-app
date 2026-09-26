import { LevelConfig } from './types';

export const TILE_DEFINITIONS = [
  { type: 0, name: 'Pikachu', emoji: '⚡', glowColor: '#facc15', badgeBg: 'from-amber-400 to-yellow-600' },
  { type: 1, name: 'Charmander', emoji: '🔥', glowColor: '#f97316', badgeBg: 'from-orange-500 to-red-600' },
  { type: 2, name: 'Squirtle', emoji: '💧', glowColor: '#38bdf8', badgeBg: 'from-sky-400 to-blue-600' },
  { type: 3, name: 'Bulbasaur', emoji: '🍃', glowColor: '#4ade80', badgeBg: 'from-emerald-400 to-green-600' },
  { type: 4, name: 'Gengar', emoji: '👻', glowColor: '#a855f7', badgeBg: 'from-purple-500 to-indigo-700' },
  { type: 5, name: 'Jigglypuff', emoji: '💖', glowColor: '#f472b6', badgeBg: 'from-pink-400 to-rose-600' },
  { type: 6, name: 'Snorlax', emoji: '💤', glowColor: '#94a3b8', badgeBg: 'from-slate-400 to-cyan-800' },
  { type: 7, name: 'Mewtwo', emoji: '🔮', glowColor: '#c084fc', badgeBg: 'from-violet-500 to-fuchsia-700' },
  { type: 8, name: 'Dragonite', emoji: '🐉', glowColor: '#fb923c', badgeBg: 'from-amber-500 to-orange-700' },
  { type: 9, name: 'Eevee', emoji: '🦊', glowColor: '#eab308', badgeBg: 'from-amber-600 to-yellow-800' },
  { type: 10, name: 'Psyduck', emoji: '🦆', glowColor: '#fde047', badgeBg: 'from-yellow-400 to-amber-500' },
  { type: 11, name: 'Magikarp', emoji: '🐟', glowColor: '#ef4444', badgeBg: 'from-red-500 to-orange-600' },
  { type: 12, name: 'Lapras', emoji: '🌊', glowColor: '#06b6d4', badgeBg: 'from-cyan-400 to-teal-600' },
  { type: 13, name: 'Vulpix', emoji: '✨', glowColor: '#fb7185', badgeBg: 'from-rose-400 to-red-500' },
  { type: 14, name: 'Meowth', emoji: '🪙', glowColor: '#f59e0b', badgeBg: 'from-yellow-500 to-amber-600' },
  { type: 15, name: 'Machop', emoji: '🥊', glowColor: '#cbd5e1', badgeBg: 'from-slate-500 to-zinc-700' },
  { type: 16, name: 'Geodude', emoji: '🪨', glowColor: '#a1a1aa', badgeBg: 'from-stone-500 to-neutral-700' },
  { type: 17, name: 'Abra', emoji: '💫', glowColor: '#818cf8', badgeBg: 'from-indigo-400 to-purple-600' },
  { type: 18, name: 'Zubat', emoji: '🦇', glowColor: '#3b82f6', badgeBg: 'from-blue-600 to-indigo-800' },
  { type: 19, name: 'Butterfree', emoji: '🦋', glowColor: '#67e8f9', badgeBg: 'from-cyan-300 to-blue-500' },
  { type: 20, name: 'Poliwag', emoji: '🌀', glowColor: '#60a5fa', badgeBg: 'from-blue-400 to-sky-600' },
  { type: 21, name: 'Diglett', emoji: '🌱', glowColor: '#b45309', badgeBg: 'from-amber-700 to-yellow-900' },
  { type: 22, name: 'Togepi', emoji: '🥚', glowColor: '#fef08a', badgeBg: 'from-yellow-200 to-amber-400' },
  { type: 23, name: 'Rayquaza', emoji: '🐲', glowColor: '#10b981', badgeBg: 'from-emerald-500 to-teal-700' },
  { type: 24, name: 'Slowpoke', emoji: '🌸', glowColor: '#f472b6', badgeBg: 'from-pink-400 to-rose-600' },
  { type: 25, name: 'Bellsprout', emoji: '🌿', glowColor: '#a3e635', badgeBg: 'from-lime-400 to-green-600' },
  { type: 26, name: 'Gastly', emoji: '🌑', glowColor: '#9333ea', badgeBg: 'from-purple-600 to-indigo-800' },
  { type: 27, name: 'Onix', emoji: '⛰️', glowColor: '#78716c', badgeBg: 'from-stone-500 to-zinc-700' },
  { type: 28, name: 'Drowzee', emoji: '🌀', glowColor: '#eab308', badgeBg: 'from-yellow-500 to-amber-600' },
  { type: 29, name: 'Krabby', emoji: '🦀', glowColor: '#ef4444', badgeBg: 'from-red-500 to-orange-600' },
  { type: 30, name: 'Voltorb', emoji: '🔴', glowColor: '#dc2626', badgeBg: 'from-red-600 to-rose-700' },
  { type: 31, name: 'Exeggcute', emoji: '🌱', glowColor: '#ec4899', badgeBg: 'from-pink-500 to-emerald-600' },
  { type: 32, name: 'Cubone', emoji: '🦴', glowColor: '#d97706', badgeBg: 'from-amber-600 to-yellow-700' },
  { type: 33, name: 'Hitmonlee', emoji: '🥋', glowColor: '#b45309', badgeBg: 'from-amber-700 to-stone-700' },
  { type: 34, name: 'Koffing', emoji: '💨', glowColor: '#8b5cf6', badgeBg: 'from-violet-500 to-purple-700' },
  { type: 35, name: 'Horsea', emoji: '🌊', glowColor: '#0ea5e9', badgeBg: 'from-sky-500 to-blue-600' },
];

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Neon Genesis',
    description: 'Classic board with no gravity. Master the turning angles!',
    rows: 9,
    cols: 16,
    uniqueTilesCount: 18,
    timeLimit: 300, // fixed 300s
    gravity: 'none',
  },
  {
    level: 2,
    name: 'Downfall Shift',
    description: 'Gravity pulls downward! Upper tiles fall when space opens.',
    rows: 9,
    cols: 16,
    uniqueTilesCount: 22,
    timeLimit: 300,
    gravity: 'down',
  },
  {
    level: 3,
    name: 'Leftward Drift',
    description: 'Gravity shifts leftward! The grid constantly compresses to the left.',
    rows: 9,
    cols: 16,
    uniqueTilesCount: 26,
    timeLimit: 300,
    gravity: 'left',
  },
  {
    level: 4,
    name: 'Rightward Surge',
    description: 'Gravity shifts rightward! Anticipate tile displacement.',
    rows: 9,
    cols: 16,
    uniqueTilesCount: 30,
    timeLimit: 300,
    gravity: 'right',
  },
  {
    level: 5,
    name: 'Vortex Inward',
    description: 'Gravity pulls toward center! Top and bottom halves converge.',
    rows: 9,
    cols: 16,
    uniqueTilesCount: 34,
    timeLimit: 300,
    gravity: 'center-vertical',
  },
  {
    level: 6,
    name: 'Cyber Chaos',
    description: 'The ultimate trial! All 36 creature symbols with upward gravity.',
    rows: 9,
    cols: 16,
    uniqueTilesCount: 36,
    timeLimit: 300,
    gravity: 'up',
  },
];

export const BASE_MATCH_SCORE = 100;
export const TIME_BONUS_PER_MATCH = 0; // No time bonus on match
export const COMBO_WINDOW_MS = 3500; // 3.5s to maintain streak
export const INITIAL_HINTS = 3;
export const INITIAL_SHUFFLES = 3;

/**
 * Returns LevelConfig for any level (including Endless Mode Level 7+).
 * Seamlessly rotates gravity patterns and increases difficulty.
 */
export function getLevelConfig(levelIdx: number): LevelConfig {
  if (levelIdx < LEVELS.length) {
    return LEVELS[levelIdx];
  }

  const levelNumber = levelIdx + 1;
  const loopNumber = Math.floor(levelIdx / LEVELS.length) + 1;

  const endlessGravities: { gravity: LevelConfig['gravity']; name: string; desc: string }[] = [
    {
      gravity: 'down',
      name: 'Downfall Shift',
      desc: 'Downward gravity pulls tiles to the bottom as space opens.',
    },
    {
      gravity: 'left',
      name: 'Leftward Drift',
      desc: 'Leftward gravity constantly compresses the grid to the left.',
    },
    {
      gravity: 'right',
      name: 'Rightward Surge',
      desc: 'Rightward gravity pulls all tiles toward the right border.',
    },
    {
      gravity: 'center-vertical',
      name: 'Vortex Inward',
      desc: 'Top and bottom halves converge toward the vertical center.',
    },
    {
      gravity: 'center-horizontal',
      name: 'Horizontal Pinch',
      desc: 'Left and right columns compress toward the horizontal center.',
    },
    {
      gravity: 'up',
      name: 'Ascension Rush',
      desc: 'Upward gravity challenges your reflex with upward displacement.',
    },
  ];

  const cycleIdx = (levelIdx - LEVELS.length) % endlessGravities.length;
  const g = endlessGravities[cycleIdx];

  // Progressively increase unique creatures up to 36 at higher levels
  const uniqueTilesCount = Math.min(
    TILE_DEFINITIONS.length,
    22 + Math.min(14, Math.floor((levelIdx - 5) * 2))
  );

  return {
    level: levelNumber,
    name: `${g.name} (Loop ${loopNumber})`,
    description: `[Endless Loop ${loopNumber}] ${g.desc}`,
    rows: 9,
    cols: 16,
    uniqueTilesCount,
    timeLimit: 300, // Fixed 300 seconds per level
    gravity: g.gravity,
  };
}


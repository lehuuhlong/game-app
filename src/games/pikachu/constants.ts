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
  { type: 17, name: 'Abra', emoji: '🌀', glowColor: '#818cf8', badgeBg: 'from-indigo-400 to-purple-600' },
  { type: 18, name: 'Zubat', emoji: '🦇', glowColor: '#3b82f6', badgeBg: 'from-blue-600 to-indigo-800' },
  { type: 19, name: 'Butterfree', emoji: '🦋', glowColor: '#67e8f9', badgeBg: 'from-cyan-300 to-blue-500' },
  { type: 20, name: 'Poliwag', emoji: '🌀', glowColor: '#60a5fa', badgeBg: 'from-blue-400 to-sky-600' },
  { type: 21, name: 'Diglett', emoji: '🌱', glowColor: '#b45309', badgeBg: 'from-amber-700 to-yellow-900' },
  { type: 22, name: 'Togepi', emoji: '🥚', glowColor: '#fef08a', badgeBg: 'from-yellow-200 to-amber-400' },
  { type: 23, name: 'Rayquaza', emoji: '⚡', glowColor: '#10b981', badgeBg: 'from-emerald-500 to-teal-700' },
];

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    name: 'Neon Genesis',
    description: 'Classic board with no gravity. Master the turning angles!',
    rows: 8,
    cols: 12,
    uniqueTilesCount: 12,
    timeLimit: 180, // 3 mins
    gravity: 'none',
  },
  {
    level: 2,
    name: 'Downfall Shift',
    description: 'Gravity pulls downward! Upper tiles fall when space opens.',
    rows: 8,
    cols: 12,
    uniqueTilesCount: 14,
    timeLimit: 160,
    gravity: 'down',
  },
  {
    level: 3,
    name: 'Leftward Drift',
    description: 'Gravity shifts leftward! The grid constantly compresses to the left.',
    rows: 8,
    cols: 12,
    uniqueTilesCount: 16,
    timeLimit: 150,
    gravity: 'left',
  },
  {
    level: 4,
    name: 'Rightward Surge',
    description: 'Gravity shifts rightward! Anticipate tile displacement.',
    rows: 8,
    cols: 12,
    uniqueTilesCount: 18,
    timeLimit: 140,
    gravity: 'right',
  },
  {
    level: 5,
    name: 'Vortex Inward',
    description: 'Gravity pulls toward center! Top and bottom halves converge.',
    rows: 8,
    cols: 12,
    uniqueTilesCount: 20,
    timeLimit: 130,
    gravity: 'center-vertical',
  },
  {
    level: 6,
    name: 'Cyber Chaos',
    description: 'The ultimate trial! 22 creature symbols with upward gravity.',
    rows: 8,
    cols: 12,
    uniqueTilesCount: 22,
    timeLimit: 120,
    gravity: 'up',
  },
];

export const BASE_MATCH_SCORE = 100;
export const TIME_BONUS_PER_MATCH = 3; // +3 seconds per match
export const COMBO_WINDOW_MS = 3500; // 3.5s to maintain streak
export const INITIAL_HINTS = 3;
export const INITIAL_SHUFFLES = 3;

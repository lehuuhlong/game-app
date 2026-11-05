import { Clues, Puzzle } from './types';

/**
 * Computes consecutive line clues from a 2D binary solution array.
 */
export function generateClues(solution: number[][]): Clues {
  const height = solution.length;
  const width = solution[0]?.length || 0;

  // Row Clues
  const rowClues: number[][] = [];
  for (let r = 0; r < height; r++) {
    const clues: number[] = [];
    let count = 0;
    for (let c = 0; c < width; c++) {
      if (solution[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    rowClues.push(clues.length > 0 ? clues : [0]);
  }

  // Column Clues
  const colClues: number[][] = [];
  for (let c = 0; c < width; c++) {
    const clues: number[] = [];
    let count = 0;
    for (let r = 0; r < height; r++) {
      if (solution[r][c] === 1) {
        count++;
      } else if (count > 0) {
        clues.push(count);
        count = 0;
      }
    }
    if (count > 0) clues.push(count);
    colClues.push(clues.length > 0 ? clues : [0]);
  }

  return { rowClues, colClues };
}

export const PUZZLES: Puzzle[] = [
  // ── 5x5 Easy ──────────────────────────────────────────────────────────────
  {
    id: 'easy_heart',
    title: 'Neon Heart',
    icon: '❤️',
    difficulty: 'EASY',
    width: 5,
    height: 5,
    accentColor: '#f43f5e', // rose-500
    glowColor: 'rgba(244, 63, 94, 0.6)',
    solution: [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    id: 'easy_lightning',
    title: 'Cyber Bolt',
    icon: '⚡',
    difficulty: 'EASY',
    width: 5,
    height: 5,
    accentColor: '#eab308', // yellow-500
    glowColor: 'rgba(234, 179, 8, 0.6)',
    solution: [
      [0, 0, 1, 1, 0],
      [0, 1, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 1, 0],
      [0, 1, 0, 0, 0],
    ],
  },
  {
    id: 'easy_ghost',
    title: 'Arcade Ghost',
    icon: '👻',
    difficulty: 'EASY',
    width: 5,
    height: 5,
    accentColor: '#38bdf8', // sky-400
    glowColor: 'rgba(56, 189, 248, 0.6)',
    solution: [
      [0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1],
    ],
  },
  {
    id: 'easy_star',
    title: 'Power Star',
    icon: '⭐',
    difficulty: 'EASY',
    width: 5,
    height: 5,
    accentColor: '#f59e0b', // amber-500
    glowColor: 'rgba(245, 158, 11, 0.6)',
    solution: [
      [0, 0, 1, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 1, 0, 1, 0],
      [1, 0, 0, 0, 1],
    ],
  },

  // ── 10x10 Medium ──────────────────────────────────────────────────────────
  {
    id: 'med_gamepad',
    title: 'Retro Gamepad',
    icon: '🎮',
    difficulty: 'MEDIUM',
    width: 10,
    height: 10,
    accentColor: '#a855f7', // purple-500
    glowColor: 'rgba(168, 85, 247, 0.6)',
    solution: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
      [1, 0, 1, 0, 0, 0, 0, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
      [0, 1, 0, 0, 0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'med_sword',
    title: 'Energy Sword',
    icon: '🗡️',
    difficulty: 'MEDIUM',
    width: 10,
    height: 10,
    accentColor: '#06b6d4', // cyan-500
    glowColor: 'rgba(6, 182, 212, 0.6)',
    solution: [
      [0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
      [0, 1, 1, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'med_diamond',
    title: 'Cyber Diamond',
    icon: '💎',
    difficulty: 'MEDIUM',
    width: 10,
    height: 10,
    accentColor: '#38bdf8', // sky-400
    glowColor: 'rgba(56, 189, 248, 0.6)',
    solution: [
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'med_cat',
    title: 'Neon Cat',
    icon: '🐱',
    difficulty: 'MEDIUM',
    width: 10,
    height: 10,
    accentColor: '#f59e0b', // amber-500
    glowColor: 'rgba(245, 158, 11, 0.6)',
    solution: [
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 0, 0, 1, 1, 1, 1],
      [1, 0, 1, 1, 1, 1, 1, 1, 0, 1],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 0, 1, 0, 0],
      [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    ],
  },

  // ── 15x15 Hard ────────────────────────────────────────────────────────────
  {
    id: 'hard_invader',
    title: 'Space Invader',
    icon: '👾',
    difficulty: 'HARD',
    width: 15,
    height: 15,
    accentColor: '#10b981', // emerald-500
    glowColor: 'rgba(16, 185, 129, 0.6)',
    solution: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0],
      [0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0],
      [0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'hard_skull',
    title: 'Cyber Skull',
    icon: '💀',
    difficulty: 'HARD',
    width: 15,
    height: 15,
    accentColor: '#ec4899', // pink-500
    glowColor: 'rgba(236, 72, 153, 0.6)',
    solution: [
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1],
      [1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1],
      [1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0],
      [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
  {
    id: 'hard_crown',
    title: 'Royal Crown',
    icon: '👑',
    difficulty: 'HARD',
    width: 15,
    height: 15,
    accentColor: '#f59e0b', // amber-500
    glowColor: 'rgba(245, 158, 11, 0.6)',
    solution: [
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      [0, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0],
      [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ],
  },
];

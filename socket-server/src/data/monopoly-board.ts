/**
 * Business Tour Style Monopoly Board — 32 spaces (9x9 Grid).
 *
 * Layout (clockwise from START):
 *   Bottom row  :  0 (START) → 8 (Lost Island corner)
 *   Left column :  8 (Lost Island) → 16 (World Championships corner)
 *   Top row     : 16 (World Championships) → 24 (World Tour corner)
 *   Right column: 24 (World Tour) → 31 (wraps back to 0 START)
 */

import type { MonopolyBoardSpace } from '../../types';

export const MONOPOLY_BOARD: MonopolyBoardSpace[] = [
  // ── Bottom row (0-8) ────────────────────────────────────────────
  {
    index: 0,
    name: 'START',
    type: 'go',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 1,
    name: 'Granada',
    type: 'property',
    colorGroup: 'brown',
    price: 120,
    baseRent: 4,
    rentScale: [20, 60, 180, 320, 500],
  },
  {
    index: 2,
    name: 'Seville',
    type: 'property',
    colorGroup: 'brown',
    price: 120,
    baseRent: 8,
    rentScale: [40, 120, 360, 640, 900],
  },
  {
    index: 3,
    name: 'Madrid',
    type: 'property',
    colorGroup: 'brown',
    price: 120,
    baseRent: 8,
    rentScale: [40, 120, 360, 640, 900],
  },
  {
    index: 4,
    name: 'Bali',
    type: 'railroad',
    colorGroup: 'railroad',
    price: 400,
    baseRent: 50,
  },
  {
    index: 5,
    name: 'Hong Kong',
    type: 'property',
    colorGroup: 'light_blue',
    price: 200,
    baseRent: 12,
    rentScale: [60, 180, 540, 800, 1100],
  },
  {
    index: 6,
    name: 'Beijing',
    type: 'property',
    colorGroup: 'light_blue',
    price: 200,
    baseRent: 12,
    rentScale: [60, 180, 540, 800, 1100],
  },
  {
    index: 7,
    name: 'Shanghai',
    type: 'property',
    colorGroup: 'light_blue',
    price: 240,
    baseRent: 16,
    rentScale: [80, 200, 600, 900, 1200],
  },

  // ── Left column (8-16) ──────────────────────────────────────────
  {
    index: 8,
    name: 'Lost Island',
    type: 'jail',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 9,
    name: 'Venice',
    type: 'property',
    colorGroup: 'pink',
    price: 240,
    baseRent: 16,
    rentScale: [80, 200, 600, 900, 1200],
  },
  {
    index: 10,
    name: 'Milan',
    type: 'property',
    colorGroup: 'pink',
    price: 280,
    baseRent: 20,
    rentScale: [100, 300, 900, 1250, 1500],
  },
  {
    index: 11,
    name: 'Home',
    type: 'property',
    colorGroup: 'pink',
    price: 320,
    baseRent: 24,
    rentScale: [120, 360, 1000, 1400, 1800],
  },
  {
    index: 12,
    name: 'Chance',
    type: 'chance',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 13,
    name: 'Hamburg',
    type: 'property',
    colorGroup: 'orange',
    price: 360,
    baseRent: 28,
    rentScale: [140, 400, 1100, 1500, 1900],
  },
  {
    index: 14,
    name: 'Cyprus',
    type: 'railroad',
    colorGroup: 'railroad',
    price: 400,
    baseRent: 50,
  },
  {
    index: 15,
    name: 'Berlin',
    type: 'property',
    colorGroup: 'orange',
    price: 360,
    baseRent: 28,
    rentScale: [140, 400, 1100, 1500, 1900],
  },

  // ── Top row (16-24) ─────────────────────────────────────────────
  {
    index: 16,
    name: 'World Championships',
    type: 'free_parking',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 17,
    name: 'London',
    type: 'property',
    colorGroup: 'red',
    price: 360,
    baseRent: 28,
    rentScale: [140, 400, 1100, 1500, 1900],
  },
  {
    index: 18,
    name: 'Dubai',
    type: 'railroad',
    colorGroup: 'railroad',
    price: 400,
    baseRent: 50,
  },
  {
    index: 19,
    name: 'Sydney',
    type: 'property',
    colorGroup: 'red',
    price: 440,
    baseRent: 36,
    rentScale: [180, 500, 1400, 1750, 2100],
  },
  {
    index: 20,
    name: 'Chance',
    type: 'chance',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 21,
    name: 'Chicago',
    type: 'property',
    colorGroup: 'yellow',
    price: 440,
    baseRent: 36,
    rentScale: [180, 500, 1400, 1750, 2100],
  },
  {
    index: 22,
    name: 'Las Vegas',
    type: 'property',
    colorGroup: 'yellow',
    price: 480,
    baseRent: 40,
    rentScale: [200, 600, 1500, 1850, 2200],
  },
  {
    index: 23,
    name: 'New York',
    type: 'property',
    colorGroup: 'yellow',
    price: 480,
    baseRent: 40,
    rentScale: [200, 600, 1500, 1850, 2200],
  },

  // ── Right column (24-31) ────────────────────────────────────────
  {
    index: 24,
    name: 'World Tour',
    type: 'go_to_jail',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 25,
    name: 'Nice',
    type: 'railroad',
    colorGroup: 'railroad',
    price: 400,
    baseRent: 50,
  },
  {
    index: 26,
    name: 'Lyon',
    type: 'property',
    colorGroup: 'green',
    price: 520,
    baseRent: 44,
    rentScale: [220, 660, 1600, 1950, 2300],
  },
  {
    index: 27,
    name: 'Paris',
    type: 'property',
    colorGroup: 'green',
    price: 560,
    baseRent: 48,
    rentScale: [240, 720, 1700, 2050, 2400],
  },
  {
    index: 28,
    name: 'Chance',
    type: 'chance',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 29,
    name: 'Osaka',
    type: 'property',
    colorGroup: 'dark_blue',
    price: 600,
    baseRent: 52,
    rentScale: [260, 780, 1800, 2200, 2550],
  },
  {
    index: 30,
    name: 'Tax',
    type: 'tax',
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 31,
    name: 'Tokyo',
    type: 'property',
    colorGroup: 'dark_blue',
    price: 700,
    baseRent: 70,
    rentScale: [350, 1000, 2200, 2600, 3000],
  },
];

export function getUpgradeCost(price: number): number {
  return Math.floor(price * 0.5);
}

export function getSaleValue(price: number, houseLevel: number = 0): number {
  const baseValue = Math.floor(price * 0.8);
  const houseValue = Math.floor(houseLevel * (price * 0.5) * 0.8);
  return baseValue + houseValue;
}

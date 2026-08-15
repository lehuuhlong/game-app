/**
 * Business Tour Style Monopoly Board — 32 spaces (9x9 Grid).
 *
 * Layout (clockwise from START):
 *   Bottom row  :  0 (START) → 8 (Lost Island corner)
 *   Left column :  8 (Lost Island) → 16 (World Cup corner)
 *   Top row     : 16 (World Cup) → 24 (World Tour corner)
 *   Right column: 24 (World Tour) → 31 (wraps back to 0 START)
 */

import type { MonopolyBoardSpace } from "../../types";

export const MONOPOLY_BOARD: MonopolyBoardSpace[] = [
  // ── Bottom row (0-8) ────────────────────────────────────────────
  {
    index: 0,
    name: "START",
    type: "go",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 1,
    name: "Granada",
    type: "property",
    colorGroup: "brown",
    price: 60,
    baseRent: 2,
    rentScale: [10, 30, 90, 160, 250],
  },
  {
    index: 2,
    name: "Community Chest",
    type: "community_chest",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 3,
    name: "Seville",
    type: "property",
    colorGroup: "brown",
    price: 60,
    baseRent: 4,
    rentScale: [20, 60, 180, 320, 450],
  },
  {
    index: 4,
    name: "Income Tax",
    type: "tax",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 5,
    name: "Reading RR",
    type: "railroad",
    colorGroup: "railroad",
    price: 200,
    baseRent: 25,
  },
  {
    index: 6,
    name: "Madrid",
    type: "property",
    colorGroup: "light_blue",
    price: 100,
    baseRent: 6,
    rentScale: [30, 90, 270, 400, 550],
  },
  {
    index: 7,
    name: "Bali",
    type: "property",
    colorGroup: "light_blue",
    price: 100,
    baseRent: 6,
    rentScale: [30, 90, 270, 400, 550],
  },

  // ── Left column (8-16) ──────────────────────────────────────────
  {
    index: 8,
    name: "Lost Island",
    type: "jail",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 9,
    name: "Hong Kong",
    type: "property",
    colorGroup: "light_blue",
    price: 120,
    baseRent: 8,
    rentScale: [40, 100, 300, 450, 600],
  },
  {
    index: 10,
    name: "Beijing",
    type: "property",
    colorGroup: "pink",
    price: 140,
    baseRent: 10,
    rentScale: [50, 150, 450, 625, 750],
  },
  {
    index: 11,
    name: "Electric Co.",
    type: "utility",
    colorGroup: "utility",
    price: 150,
    baseRent: null,
  },
  {
    index: 12,
    name: "Shanghai",
    type: "property",
    colorGroup: "pink",
    price: 140,
    baseRent: 10,
    rentScale: [50, 150, 450, 625, 750],
  },
  {
    index: 13,
    name: "Venice",
    type: "property",
    colorGroup: "pink",
    price: 160,
    baseRent: 12,
    rentScale: [60, 180, 500, 700, 900],
  },
  {
    index: 14,
    name: "Pennsylvania RR",
    type: "railroad",
    colorGroup: "railroad",
    price: 200,
    baseRent: 25,
  },
  {
    index: 15,
    name: "Milan",
    type: "property",
    colorGroup: "orange",
    price: 180,
    baseRent: 14,
    rentScale: [70, 200, 550, 750, 950],
  },

  // ── Top row (16-24) ─────────────────────────────────────────────
  {
    index: 16,
    name: "World Cup",
    type: "free_parking",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 17,
    name: "Rome",
    type: "property",
    colorGroup: "orange",
    price: 180,
    baseRent: 14,
    rentScale: [70, 200, 550, 750, 950],
  },
  {
    index: 18,
    name: "Hamburg",
    type: "property",
    colorGroup: "orange",
    price: 200,
    baseRent: 16,
    rentScale: [80, 220, 600, 800, 1000],
  },
  {
    index: 19,
    name: "Chance",
    type: "chance",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 20,
    name: "Cyprus",
    type: "property",
    colorGroup: "red",
    price: 220,
    baseRent: 18,
    rentScale: [90, 250, 700, 875, 1050],
  },
  {
    index: 21,
    name: "London",
    type: "property",
    colorGroup: "red",
    price: 220,
    baseRent: 18,
    rentScale: [90, 250, 700, 875, 1050],
  },
  {
    index: 22,
    name: "Dubai",
    type: "property",
    colorGroup: "red",
    price: 240,
    baseRent: 20,
    rentScale: [100, 300, 750, 925, 1100],
  },
  {
    index: 23,
    name: "B. & O. RR",
    type: "railroad",
    colorGroup: "railroad",
    price: 200,
    baseRent: 25,
  },

  // ── Right column (24-31) ────────────────────────────────────────
  {
    index: 24,
    name: "World Tour",
    type: "go_to_jail",
    colorGroup: null,
    price: null,
    baseRent: null,
  },
  {
    index: 25,
    name: "Sydney",
    type: "property",
    colorGroup: "yellow",
    price: 260,
    baseRent: 22,
    rentScale: [110, 330, 800, 975, 1150],
  },
  {
    index: 26,
    name: "Chicago",
    type: "property",
    colorGroup: "yellow",
    price: 260,
    baseRent: 22,
    rentScale: [110, 330, 800, 975, 1150],
  },
  {
    index: 27,
    name: "Las Vegas",
    type: "property",
    colorGroup: "yellow",
    price: 280,
    baseRent: 24,
    rentScale: [120, 360, 850, 1025, 1200],
  },
  {
    index: 28,
    name: "New York",
    type: "property",
    colorGroup: "green",
    price: 300,
    baseRent: 26,
    rentScale: [130, 390, 900, 1100, 1275],
  },
  {
    index: 29,
    name: "Nice",
    type: "property",
    colorGroup: "green",
    price: 300,
    baseRent: 26,
    rentScale: [130, 390, 900, 1100, 1275],
  },
  {
    index: 30,
    name: "Lyon",
    type: "property",
    colorGroup: "green",
    price: 320,
    baseRent: 28,
    rentScale: [150, 450, 1000, 1200, 1400],
  },
  {
    index: 31,
    name: "Paris",
    type: "property",
    colorGroup: "dark_blue",
    price: 350,
    baseRent: 35,
    rentScale: [175, 500, 1100, 1300, 1500],
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


/**
 * Business Tour Style Monopoly Board — 32 spaces (9×9 Grid).
 *
 * Layout (clockwise from START):
 *   Bottom row  :  0 (START) → 8 (Lost Island corner)
 *   Left column :  8 (Lost Island) → 16 (World Championships corner)
 *   Top row     : 16 (World Championships) → 24 (World Tour corner)
 *   Right column: 24 (World Tour) → 31 (wraps back to 0 START)
 *
 * Synced with backend: socket-server/src/data/monopoly-board.ts
 */

import type { MonopolyBoardSpace } from "@/types/socket";

export const MONOPOLY_BOARD: MonopolyBoardSpace[] = [
  // ── Bottom row (0-8) ────────────────────────────────────────────
  { index: 0, name: "START", type: "go", colorGroup: null, price: null, baseRent: null },
  { index: 1, name: "Granada", type: "property", colorGroup: "brown", price: 60, baseRent: 2, rentScale: [10, 30, 90, 160, 250] },
  { index: 2, name: "Seville", type: "property", colorGroup: "brown", price: 60, baseRent: 4, rentScale: [20, 60, 180, 320, 450] },
  { index: 3, name: "Madrid", type: "property", colorGroup: "brown", price: 60, baseRent: 4, rentScale: [20, 60, 180, 320, 450] },
  { index: 4, name: "Bali", type: "beach", colorGroup: "beach", price: 200, baseRent: 25 },
  { index: 5, name: "Hong Kong", type: "property", colorGroup: "light_blue", price: 100, baseRent: 6, rentScale: [30, 90, 270, 400, 550] },
  { index: 6, name: "Beijing", type: "property", colorGroup: "light_blue", price: 100, baseRent: 6, rentScale: [30, 90, 270, 400, 550] },
  { index: 7, name: "Shanghai", type: "property", colorGroup: "light_blue", price: 120, baseRent: 8, rentScale: [40, 100, 300, 450, 600] },

  // ── Left column (8-16) ──────────────────────────────────────────
  { index: 8, name: "Lost Island", type: "jail", colorGroup: null, price: null, baseRent: null },
  { index: 9, name: "Venice", type: "property", colorGroup: "pink", price: 120, baseRent: 8, rentScale: [40, 100, 300, 450, 600] },
  { index: 10, name: "Milan", type: "property", colorGroup: "pink", price: 140, baseRent: 10, rentScale: [50, 150, 450, 625, 750] },
  { index: 11, name: "Home", type: "property", colorGroup: "pink", price: 160, baseRent: 12, rentScale: [60, 180, 500, 700, 900] },
  { index: 12, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 13, name: "Hamburg", type: "property", colorGroup: "orange", price: 180, baseRent: 14, rentScale: [70, 200, 550, 750, 950] },
  { index: 14, name: "Cyprus", type: "beach", colorGroup: "beach", price: 200, baseRent: 25 },
  { index: 15, name: "Berlin", type: "property", colorGroup: "orange", price: 180, baseRent: 14, rentScale: [70, 200, 550, 750, 950] },

  // ── Top row (16-24) ─────────────────────────────────────────────
  { index: 16, name: "World Championships", type: "free_parking", colorGroup: null, price: null, baseRent: null },
  { index: 17, name: "London", type: "property", colorGroup: "red", price: 180, baseRent: 14, rentScale: [70, 200, 550, 750, 950] },
  { index: 18, name: "Dubai", type: "beach", colorGroup: "beach", price: 200, baseRent: 25 },
  { index: 19, name: "Sydney", type: "property", colorGroup: "red", price: 220, baseRent: 18, rentScale: [90, 250, 700, 875, 1050] },
  { index: 20, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 21, name: "Chicago", type: "property", colorGroup: "yellow", price: 220, baseRent: 18, rentScale: [90, 250, 700, 875, 1050] },
  { index: 22, name: "Las Vegas", type: "property", colorGroup: "yellow", price: 240, baseRent: 20, rentScale: [100, 300, 750, 925, 1100] },
  { index: 23, name: "New York", type: "property", colorGroup: "yellow", price: 240, baseRent: 20, rentScale: [100, 300, 750, 925, 1100] },

  // ── Right column (24-31) ────────────────────────────────────────
  { index: 24, name: "World Tour", type: "go_to_jail", colorGroup: null, price: null, baseRent: null },
  { index: 25, name: "Nice", type: "beach", colorGroup: "beach", price: 200, baseRent: 25 },
  { index: 26, name: "Lyon", type: "property", colorGroup: "green", price: 260, baseRent: 22, rentScale: [110, 330, 800, 975, 1150] },
  { index: 27, name: "Paris", type: "property", colorGroup: "green", price: 280, baseRent: 24, rentScale: [120, 360, 850, 1025, 1200] },
  { index: 28, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 29, name: "Osaka", type: "property", colorGroup: "dark_blue", price: 300, baseRent: 26, rentScale: [130, 390, 900, 1100, 1275] },
  { index: 30, name: "Tax", type: "tax", colorGroup: null, price: null, baseRent: null },
  { index: 31, name: "Tokyo", type: "property", colorGroup: "dark_blue", price: 350, baseRent: 35, rentScale: [175, 500, 1100, 1300, 1500] },
];

/**
 * Vibrant Business Tour color palettes for property groups with soft background tones.
 */
export const COLOR_GROUP_STYLES: Record<string, {
  bg: string;
  softBg: string;
  darkSoftBg: string;
  text: string;
  border: string;
  glow: string;
  barGradient: string;
}> = {
  brown:      { bg: "bg-amber-800", softBg: "bg-amber-100/70", darkSoftBg: "dark:bg-amber-950/40", text: "text-amber-900 dark:text-amber-100", border: "border-amber-300 dark:border-amber-800/60", glow: "shadow-amber-900/30", barGradient: "from-amber-700 to-amber-900" },
  light_blue: { bg: "bg-sky-500", softBg: "bg-sky-100/70", darkSoftBg: "dark:bg-sky-950/40", text: "text-sky-900 dark:text-sky-100", border: "border-sky-300 dark:border-sky-800/60", glow: "shadow-sky-500/30", barGradient: "from-sky-400 to-cyan-500" },
  pink:       { bg: "bg-pink-500", softBg: "bg-pink-100/70", darkSoftBg: "dark:bg-pink-950/40", text: "text-pink-900 dark:text-pink-100", border: "border-pink-300 dark:border-pink-800/60", glow: "shadow-pink-500/30", barGradient: "from-pink-400 to-rose-500" },
  orange:     { bg: "bg-orange-500", softBg: "bg-orange-100/70", darkSoftBg: "dark:bg-orange-950/40", text: "text-orange-900 dark:text-orange-100", border: "border-orange-300 dark:border-orange-800/60", glow: "shadow-orange-500/30", barGradient: "from-amber-500 to-orange-500" },
  red:        { bg: "bg-red-500", softBg: "bg-rose-100/70", darkSoftBg: "dark:bg-rose-950/40", text: "text-rose-900 dark:text-rose-100", border: "border-rose-300 dark:border-rose-800/60", glow: "shadow-red-500/30", barGradient: "from-rose-500 to-red-600" },
  yellow:     { bg: "bg-amber-400", softBg: "bg-yellow-100/70", darkSoftBg: "dark:bg-yellow-950/40", text: "text-yellow-950 dark:text-yellow-100", border: "border-yellow-300 dark:border-yellow-800/60", glow: "shadow-yellow-400/30", barGradient: "from-yellow-300 to-amber-400" },
  green:      { bg: "bg-emerald-500", softBg: "bg-emerald-100/70", darkSoftBg: "dark:bg-emerald-950/40", text: "text-emerald-900 dark:text-emerald-100", border: "border-emerald-300 dark:border-emerald-800/60", glow: "shadow-emerald-500/30", barGradient: "from-emerald-400 to-teal-600" },
  dark_blue:  { bg: "bg-blue-600", softBg: "bg-blue-100/70", darkSoftBg: "dark:bg-blue-950/40", text: "text-blue-900 dark:text-blue-100", border: "border-blue-300 dark:border-blue-800/60", glow: "shadow-blue-600/30", barGradient: "from-blue-500 to-indigo-600" },
  beach:      { bg: "bg-cyan-600", softBg: "bg-cyan-100/75", darkSoftBg: "dark:bg-cyan-950/40", text: "text-cyan-950 dark:text-cyan-100", border: "border-cyan-300 dark:border-cyan-800/60", glow: "shadow-cyan-600/30", barGradient: "from-cyan-400 to-teal-500" },
  utility:    { bg: "bg-teal-600", softBg: "bg-teal-100/70", darkSoftBg: "dark:bg-teal-950/40", text: "text-teal-900 dark:text-teal-100", border: "border-teal-300 dark:border-teal-800/60", glow: "shadow-teal-600/30", barGradient: "from-teal-500 to-cyan-700" },
};

export const COLOR_GROUP_CSS: Record<string, string> = {
  brown:      "bg-amber-900",
  light_blue: "bg-sky-500",
  pink:       "bg-pink-500",
  orange:     "bg-orange-500",
  red:        "bg-red-600",
  yellow:     "bg-yellow-400",
  green:      "bg-emerald-600",
  dark_blue:  "bg-indigo-700",
  beach:      "bg-cyan-600",
  utility:    "bg-teal-700",
};

/**
 * Business Tour Character Tokens & Positions in 4 Corners:
 *  - Player 1 (Top-Left): 🤠 Pink / Magenta
 *  - Player 2 (Top-Right): 👑 Yellow / Gold
 *  - Player 3 (Bottom-Left): 🐲 Dragon / Green
 *  - Player 4 (Bottom-Right): 🐼 Panda / Blue
 */
export const TOKEN_STYLES: Record<string, { bg: string; ring: string; glow: string; badgeBg: string; text: string; emoji: string; avatar: string }> = {
  red:    { bg: "bg-rose-500", ring: "ring-rose-400", glow: "shadow-rose-500/50", badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30", text: "text-rose-400", emoji: "🔴", avatar: "🤠" },
  blue:   { bg: "bg-sky-500", ring: "ring-sky-400", glow: "shadow-sky-500/50", badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/30", text: "text-sky-400", emoji: "🔵", avatar: "🐼" },
  green:  { bg: "bg-emerald-500", ring: "ring-emerald-400", glow: "shadow-emerald-500/50", badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", text: "text-emerald-400", emoji: "🟢", avatar: "🐲" },
  yellow: { bg: "bg-amber-400", ring: "ring-amber-300", glow: "shadow-amber-400/50", badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/30", text: "text-amber-400", emoji: "🟡", avatar: "👑" },
};

export const TOKEN_COLORS: Record<string, string> = {
  red:    "bg-rose-500",
  blue:   "bg-sky-500",
  green:  "bg-emerald-500",
  yellow: "bg-amber-400",
};

export const TOKEN_RING_COLORS: Record<string, string> = {
  red:    "ring-rose-400",
  blue:   "ring-sky-400",
  green:  "ring-emerald-400",
  yellow: "ring-amber-300",
};

/**
 * Business Tour Special Corner & Space Icons.
 */
export const SPACE_ICONS: Record<string, string> = {
  go:              "🚩",
  jail:            "🏝️",
  free_parking:    "🏆",
  go_to_jail:      "✈️",
  chance:          "☸️",
  community_chest: "🎴",
  tax:             "💸",
  beach:           "🏖️",
  utility:         "⚡",
};

/**
 * House level display helpers.
 */
export const HOUSE_LEVEL_ICONS: Record<number, string> = {
  0: "",
  1: "🏠",
  2: "🏠🏠",
  3: "🏠🏠🏠",
  4: "🏨",
};

export const HOUSE_LEVEL_LABELS: Record<number, string> = {
  0: "Empty Lot",
  1: "House Lv.1",
  2: "House Lv.2",
  3: "House Lv.3",
  4: "Hotel",
};

/**
 * Cost to upgrade a property = 50% of purchase price per level.
 */
export function getUpgradeCost(price: number): number {
  return Math.floor(price * 0.5);
}

/**
 * Property resale value: 80% of base purchase price + 80% of any built houses.
 */
export function getSaleValue(price: number, houseLevel: number = 0): number {
  const baseValue = Math.floor(price * 0.8);
  const houseValue = Math.floor(houseLevel * (price * 0.5) * 0.8);
  return baseValue + houseValue;
}

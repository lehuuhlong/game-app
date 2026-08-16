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
  { index: 1, name: "Granada", type: "property", colorGroup: "brown", price: 120, baseRent: 4, rentScale: [20, 60, 180, 320, 500] },
  { index: 2, name: "Seville", type: "property", colorGroup: "brown", price: 120, baseRent: 8, rentScale: [40, 120, 360, 640, 900] },
  { index: 3, name: "Madrid", type: "property", colorGroup: "brown", price: 120, baseRent: 8, rentScale: [40, 120, 360, 640, 900] },
  { index: 4, name: "Bali", type: "railroad", colorGroup: "railroad", price: 400, baseRent: 50 },
  { index: 5, name: "Hong Kong", type: "property", colorGroup: "light_blue", price: 200, baseRent: 12, rentScale: [60, 180, 540, 800, 1100] },
  { index: 6, name: "Beijing", type: "property", colorGroup: "light_blue", price: 200, baseRent: 12, rentScale: [60, 180, 540, 800, 1100] },
  { index: 7, name: "Shanghai", type: "property", colorGroup: "light_blue", price: 240, baseRent: 16, rentScale: [80, 200, 600, 900, 1200] },

  // ── Left column (8-16) ──────────────────────────────────────────
  { index: 8, name: "Lost Island", type: "jail", colorGroup: null, price: null, baseRent: null },
  { index: 9, name: "Venice", type: "property", colorGroup: "pink", price: 240, baseRent: 16, rentScale: [80, 200, 600, 900, 1200] },
  { index: 10, name: "Milan", type: "property", colorGroup: "pink", price: 280, baseRent: 20, rentScale: [100, 300, 900, 1250, 1500] },
  { index: 11, name: "Home", type: "property", colorGroup: "pink", price: 320, baseRent: 24, rentScale: [120, 360, 1000, 1400, 1800] },
  { index: 12, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 13, name: "Hamburg", type: "property", colorGroup: "orange", price: 360, baseRent: 28, rentScale: [140, 400, 1100, 1500, 1900] },
  { index: 14, name: "Cyprus", type: "railroad", colorGroup: "railroad", price: 400, baseRent: 50 },
  { index: 15, name: "Berlin", type: "property", colorGroup: "orange", price: 360, baseRent: 28, rentScale: [140, 400, 1100, 1500, 1900] },

  // ── Top row (16-24) ─────────────────────────────────────────────
  { index: 16, name: "World Championships", type: "free_parking", colorGroup: null, price: null, baseRent: null },
  { index: 17, name: "London", type: "property", colorGroup: "red", price: 360, baseRent: 28, rentScale: [140, 400, 1100, 1500, 1900] },
  { index: 18, name: "Dubai", type: "railroad", colorGroup: "railroad", price: 400, baseRent: 50 },
  { index: 19, name: "Sydney", type: "property", colorGroup: "red", price: 440, baseRent: 36, rentScale: [180, 500, 1400, 1750, 2100] },
  { index: 20, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 21, name: "Chicago", type: "property", colorGroup: "yellow", price: 440, baseRent: 36, rentScale: [180, 500, 1400, 1750, 2100] },
  { index: 22, name: "Las Vegas", type: "property", colorGroup: "yellow", price: 480, baseRent: 40, rentScale: [200, 600, 1500, 1850, 2200] },
  { index: 23, name: "New York", type: "property", colorGroup: "yellow", price: 480, baseRent: 40, rentScale: [200, 600, 1500, 1850, 2200] },

  // ── Right column (24-31) ────────────────────────────────────────
  { index: 24, name: "World Tour", type: "go_to_jail", colorGroup: null, price: null, baseRent: null },
  { index: 25, name: "Nice", type: "railroad", colorGroup: "railroad", price: 400, baseRent: 50 },
  { index: 26, name: "Lyon", type: "property", colorGroup: "green", price: 520, baseRent: 44, rentScale: [220, 660, 1600, 1950, 2300] },
  { index: 27, name: "Paris", type: "property", colorGroup: "green", price: 560, baseRent: 48, rentScale: [240, 720, 1700, 2050, 2400] },
  { index: 28, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 29, name: "Osaka", type: "property", colorGroup: "dark_blue", price: 600, baseRent: 52, rentScale: [260, 780, 1800, 2200, 2550] },
  { index: 30, name: "Tax", type: "tax", colorGroup: null, price: null, baseRent: null },
  { index: 31, name: "Tokyo", type: "property", colorGroup: "dark_blue", price: 700, baseRent: 70, rentScale: [350, 1000, 2200, 2600, 3000] },
];

/**
 * Vibrant Business Tour color palettes for property groups.
 */
export const COLOR_GROUP_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; barGradient: string }> = {
  brown:      { bg: "bg-amber-900", text: "text-amber-200", border: "border-amber-700", glow: "shadow-amber-900/40", barGradient: "from-amber-800 to-amber-950" },
  light_blue: { bg: "bg-sky-500", text: "text-sky-100", border: "border-sky-400", glow: "shadow-sky-500/40", barGradient: "from-sky-400 to-cyan-600" },
  pink:       { bg: "bg-pink-500", text: "text-pink-100", border: "border-pink-400", glow: "shadow-pink-500/40", barGradient: "from-pink-400 to-rose-600" },
  orange:     { bg: "bg-orange-500", text: "text-orange-100", border: "border-orange-400", glow: "shadow-orange-500/40", barGradient: "from-amber-500 to-orange-600" },
  red:        { bg: "bg-red-600", text: "text-red-100", border: "border-red-500", glow: "shadow-red-600/40", barGradient: "from-rose-500 to-red-700" },
  yellow:     { bg: "bg-yellow-400", text: "text-slate-950 font-bold", border: "border-yellow-300", glow: "shadow-yellow-400/40", barGradient: "from-yellow-300 to-amber-500" },
  green:      { bg: "bg-emerald-600", text: "text-emerald-100", border: "border-emerald-500", glow: "shadow-emerald-600/40", barGradient: "from-emerald-400 to-teal-700" },
  dark_blue:  { bg: "bg-indigo-700", text: "text-indigo-100", border: "border-indigo-500", glow: "shadow-indigo-700/40", barGradient: "from-blue-600 to-indigo-800" },
  railroad:   { bg: "bg-slate-700", text: "text-slate-200", border: "border-slate-600", glow: "shadow-slate-700/40", barGradient: "from-slate-600 to-slate-800" },
  utility:    { bg: "bg-teal-700", text: "text-teal-100", border: "border-teal-600", glow: "shadow-teal-700/40", barGradient: "from-teal-600 to-cyan-800" },
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
  railroad:   "bg-slate-700",
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
  railroad:        "🚄",
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

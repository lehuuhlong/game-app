/**
 * Business Tour Style Monopoly Board — 32 spaces (9×9 Grid).
 *
 * Layout (clockwise from START):
 *   Bottom row  :  0 (START) → 8 (Lost Island corner)
 *   Left column :  8 (Lost Island) → 16 (World Cup corner)
 *   Top row     : 16 (World Cup) → 24 (World Tour corner)
 *   Right column: 24 (World Tour) → 31 (wraps back to 0 START)
 *
 * Synced with backend: socket-server/src/data/monopoly-board.ts
 */

import type { MonopolyBoardSpace } from "@/types/socket";

export const MONOPOLY_BOARD: MonopolyBoardSpace[] = [
  // ── Bottom row (0-8) ────────────────────────────────────────────
  { index: 0, name: "START", type: "go", colorGroup: null, price: null, baseRent: null },
  { index: 1, name: "Granada", type: "property", colorGroup: "brown", price: 60, baseRent: 2, rentScale: [10, 30, 90, 160, 250] },
  { index: 2, name: "Community Chest", type: "community_chest", colorGroup: null, price: null, baseRent: null },
  { index: 3, name: "Seville", type: "property", colorGroup: "brown", price: 60, baseRent: 4, rentScale: [20, 60, 180, 320, 450] },
  { index: 4, name: "Income Tax", type: "tax", colorGroup: null, price: null, baseRent: null },
  { index: 5, name: "Reading RR", type: "railroad", colorGroup: "railroad", price: 200, baseRent: 25 },
  { index: 6, name: "Madrid", type: "property", colorGroup: "light_blue", price: 100, baseRent: 6, rentScale: [30, 90, 270, 400, 550] },
  { index: 7, name: "Bali", type: "property", colorGroup: "light_blue", price: 100, baseRent: 6, rentScale: [30, 90, 270, 400, 550] },

  // ── Left column (8-16) ──────────────────────────────────────────
  { index: 8, name: "Lost Island", type: "jail", colorGroup: null, price: null, baseRent: null },
  { index: 9, name: "Hong Kong", type: "property", colorGroup: "light_blue", price: 120, baseRent: 8, rentScale: [40, 100, 300, 450, 600] },
  { index: 10, name: "Beijing", type: "property", colorGroup: "pink", price: 140, baseRent: 10, rentScale: [50, 150, 450, 625, 750] },
  { index: 11, name: "Electric Co.", type: "utility", colorGroup: "utility", price: 150, baseRent: null },
  { index: 12, name: "Shanghai", type: "property", colorGroup: "pink", price: 140, baseRent: 10, rentScale: [50, 150, 450, 625, 750] },
  { index: 13, name: "Venice", type: "property", colorGroup: "pink", price: 160, baseRent: 12, rentScale: [60, 180, 500, 700, 900] },
  { index: 14, name: "Pennsylvania RR", type: "railroad", colorGroup: "railroad", price: 200, baseRent: 25 },
  { index: 15, name: "Milan", type: "property", colorGroup: "orange", price: 180, baseRent: 14, rentScale: [70, 200, 550, 750, 950] },

  // ── Top row (16-24) ─────────────────────────────────────────────
  { index: 16, name: "World Cup", type: "free_parking", colorGroup: null, price: null, baseRent: null },
  { index: 17, name: "Rome", type: "property", colorGroup: "orange", price: 180, baseRent: 14, rentScale: [70, 200, 550, 750, 950] },
  { index: 18, name: "Hamburg", type: "property", colorGroup: "orange", price: 200, baseRent: 16, rentScale: [80, 220, 600, 800, 1000] },
  { index: 19, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 20, name: "Cyprus", type: "property", colorGroup: "red", price: 220, baseRent: 18, rentScale: [90, 250, 700, 875, 1050] },
  { index: 21, name: "London", type: "property", colorGroup: "red", price: 220, baseRent: 18, rentScale: [90, 250, 700, 875, 1050] },
  { index: 22, name: "Dubai", type: "property", colorGroup: "red", price: 240, baseRent: 20, rentScale: [100, 300, 750, 925, 1100] },
  { index: 23, name: "B. & O. RR", type: "railroad", colorGroup: "railroad", price: 200, baseRent: 25 },

  // ── Right column (24-31) ────────────────────────────────────────
  { index: 24, name: "World Tour", type: "go_to_jail", colorGroup: null, price: null, baseRent: null },
  { index: 25, name: "Sydney", type: "property", colorGroup: "yellow", price: 260, baseRent: 22, rentScale: [110, 330, 800, 975, 1150] },
  { index: 26, name: "Chicago", type: "property", colorGroup: "yellow", price: 260, baseRent: 22, rentScale: [110, 330, 800, 975, 1150] },
  { index: 27, name: "Las Vegas", type: "property", colorGroup: "yellow", price: 280, baseRent: 24, rentScale: [120, 360, 850, 1025, 1200] },
  { index: 28, name: "New York", type: "property", colorGroup: "green", price: 300, baseRent: 26, rentScale: [130, 390, 900, 1100, 1275] },
  { index: 29, name: "Nice", type: "property", colorGroup: "green", price: 300, baseRent: 26, rentScale: [130, 390, 900, 1100, 1275] },
  { index: 30, name: "Lyon", type: "property", colorGroup: "green", price: 320, baseRent: 28, rentScale: [150, 450, 1000, 1200, 1400] },
  { index: 31, name: "Paris", type: "property", colorGroup: "dark_blue", price: 350, baseRent: 35, rentScale: [175, 500, 1100, 1300, 1500] },
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

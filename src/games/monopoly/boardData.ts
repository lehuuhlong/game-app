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
  { index: 16, name: "World Cup", type: "free_parking", colorGroup: null, price: null, baseRent: null },
  { index: 17, name: "London", type: "property", colorGroup: "red", price: 180, baseRent: 14, rentScale: [70, 200, 550, 750, 950] },
  { index: 18, name: "Dubai", type: "beach", colorGroup: "beach", price: 200, baseRent: 25 },
  { index: 19, name: "Sydney", type: "property", colorGroup: "red", price: 220, baseRent: 18, rentScale: [90, 250, 700, 875, 1050] },
  { index: 20, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 21, name: "Chicago", type: "property", colorGroup: "yellow", price: 220, baseRent: 18, rentScale: [90, 250, 700, 875, 1050] },
  { index: 22, name: "Las Vegas", type: "property", colorGroup: "yellow", price: 240, baseRent: 20, rentScale: [100, 300, 750, 925, 1100] },
  { index: 23, name: "New York", type: "property", colorGroup: "yellow", price: 240, baseRent: 20, rentScale: [100, 300, 750, 925, 1100] },

  // ── Right column (24-31) ────────────────────────────────────────
  { index: 24, name: "World Tour", type: "world_tour", colorGroup: null, price: null, baseRent: null },
  { index: 25, name: "Nice", type: "beach", colorGroup: "beach", price: 200, baseRent: 25 },
  { index: 26, name: "Lyon", type: "property", colorGroup: "green", price: 260, baseRent: 22, rentScale: [110, 330, 800, 975, 1150] },
  { index: 27, name: "Paris", type: "property", colorGroup: "green", price: 280, baseRent: 24, rentScale: [120, 360, 850, 1025, 1200] },
  { index: 28, name: "Chance", type: "chance", colorGroup: null, price: null, baseRent: null },
  { index: 29, name: "Osaka", type: "property", colorGroup: "dark_blue", price: 300, baseRent: 26, rentScale: [130, 390, 900, 1100, 1275] },
  { index: 30, name: "Tax", type: "tax", colorGroup: null, price: null, baseRent: null },
  { index: 31, name: "Tokyo", type: "property", colorGroup: "dark_blue", price: 350, baseRent: 35, rentScale: [175, 500, 1100, 1300, 1500] },
];

/**
 * Vibrant Business Tour & Monopoly 3D Color Palettes with rich multi-stop gradients.
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
  brown: {
    bg: "bg-amber-800",
    barGradient: "from-amber-600 via-amber-700 to-amber-900",
    softBg: "bg-gradient-to-br from-amber-100/95 via-amber-200/60 to-orange-100/90",
    darkSoftBg: "dark:from-amber-950/85 dark:via-amber-900/50 dark:to-stone-950/90",
    text: "text-amber-950 dark:text-amber-100 font-black",
    border: "border-amber-400 dark:border-amber-700/70",
    glow: "shadow-amber-900/30",
  },
  light_blue: {
    bg: "bg-sky-500",
    barGradient: "from-sky-400 via-sky-500 to-cyan-600",
    softBg: "bg-gradient-to-br from-sky-100/95 via-cyan-100/65 to-blue-100/90",
    darkSoftBg: "dark:from-sky-950/85 dark:via-cyan-950/50 dark:to-slate-950/90",
    text: "text-sky-950 dark:text-sky-100 font-black",
    border: "border-sky-400 dark:border-sky-700/70",
    glow: "shadow-sky-500/30",
  },
  pink: {
    bg: "bg-pink-500",
    barGradient: "from-pink-400 via-pink-500 to-rose-600",
    softBg: "bg-gradient-to-br from-pink-100/95 via-rose-100/65 to-fuchsia-100/90",
    darkSoftBg: "dark:from-pink-950/85 dark:via-rose-950/50 dark:to-slate-950/90",
    text: "text-pink-950 dark:text-pink-100 font-black",
    border: "border-pink-400 dark:border-pink-700/70",
    glow: "shadow-pink-500/30",
  },
  orange: {
    bg: "bg-orange-500",
    barGradient: "from-amber-400 via-orange-500 to-orange-600",
    softBg: "bg-gradient-to-br from-orange-100/95 via-amber-100/65 to-yellow-100/90",
    darkSoftBg: "dark:from-orange-950/85 dark:via-amber-950/50 dark:to-slate-950/90",
    text: "text-orange-950 dark:text-orange-100 font-black",
    border: "border-orange-400 dark:border-orange-700/70",
    glow: "shadow-orange-500/30",
  },
  red: {
    bg: "bg-rose-600",
    barGradient: "from-rose-500 via-red-600 to-rose-700",
    softBg: "bg-gradient-to-br from-rose-100/95 via-red-100/65 to-orange-100/90",
    darkSoftBg: "dark:from-rose-950/85 dark:via-red-950/50 dark:to-slate-950/90",
    text: "text-rose-950 dark:text-rose-100 font-black",
    border: "border-rose-400 dark:border-rose-700/70",
    glow: "shadow-rose-500/30",
  },
  yellow: {
    bg: "bg-amber-400",
    barGradient: "from-yellow-300 via-amber-400 to-yellow-500",
    softBg: "bg-gradient-to-br from-yellow-100/95 via-amber-100/65 to-orange-100/90",
    darkSoftBg: "dark:from-yellow-950/85 dark:via-amber-950/50 dark:to-slate-950/90",
    text: "text-yellow-950 dark:text-yellow-100 font-black",
    border: "border-yellow-400 dark:border-yellow-700/70",
    glow: "shadow-yellow-400/30",
  },
  green: {
    bg: "bg-emerald-600",
    barGradient: "from-emerald-400 via-emerald-500 to-teal-600",
    softBg: "bg-gradient-to-br from-emerald-100/95 via-teal-100/65 to-green-100/90",
    darkSoftBg: "dark:from-emerald-950/85 dark:via-teal-950/50 dark:to-slate-950/90",
    text: "text-emerald-950 dark:text-emerald-100 font-black",
    border: "border-emerald-400 dark:border-emerald-700/70",
    glow: "shadow-emerald-500/30",
  },
  dark_blue: {
    bg: "bg-indigo-600",
    barGradient: "from-blue-500 via-indigo-600 to-indigo-800",
    softBg: "bg-gradient-to-br from-indigo-100/95 via-blue-100/65 to-violet-100/90",
    darkSoftBg: "dark:from-indigo-950/85 dark:via-blue-950/50 dark:to-slate-950/90",
    text: "text-indigo-950 dark:text-indigo-100 font-black",
    border: "border-indigo-400 dark:border-indigo-700/70",
    glow: "shadow-indigo-600/30",
  },
  beach: {
    bg: "bg-cyan-600",
    barGradient: "from-amber-300 via-cyan-400 to-teal-500",
    softBg: "bg-gradient-to-br from-amber-100/95 via-cyan-100/80 to-sky-200/90",
    darkSoftBg: "dark:from-amber-950/60 dark:via-cyan-950/50 dark:to-sky-950/70",
    text: "text-teal-950 dark:text-cyan-100 font-black",
    border: "border-cyan-400 dark:border-cyan-700/70",
    glow: "shadow-cyan-600/30",
  },
  utility: {
    bg: "bg-teal-600",
    barGradient: "from-teal-400 via-teal-500 to-cyan-600",
    softBg: "bg-gradient-to-br from-teal-100/95 via-emerald-100/65 to-cyan-100/90",
    darkSoftBg: "dark:from-teal-950/85 dark:via-emerald-950/50 dark:to-slate-950/90",
    text: "text-teal-950 dark:text-teal-100 font-black",
    border: "border-teal-400 dark:border-teal-700/70",
    glow: "shadow-teal-600/30",
  },
};

/**
 * Business Tour Character Tokens & Positions in 4 Corners:
 *  - Player 1 (Top-Left): 🤠 Red / Cowboy
 *  - Player 2 (Top-Right): 👑 Yellow / King
 *  - Player 3 (Bottom-Left): 🐲 Green / Dragon
 *  - Player 4 (Bottom-Right): 🐼 Blue / Panda
 */
export const TOKEN_STYLES: Record<string, { bg: string; ring: string; glow: string; badgeBg: string; text: string; emoji: string; avatar: string }> = {
  red:    { bg: "bg-rose-500", ring: "ring-rose-400", glow: "shadow-rose-500/50", badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30", text: "text-rose-400", emoji: "🔴", avatar: "🤠" },
  blue:   { bg: "bg-sky-500", ring: "ring-sky-400", glow: "shadow-sky-500/50", badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/30", text: "text-sky-400", emoji: "🔵", avatar: "🐼" },
  green:  { bg: "bg-emerald-500", ring: "ring-emerald-400", glow: "shadow-emerald-500/50", badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", text: "text-emerald-400", emoji: "🟢", avatar: "🐲" },
  yellow: { bg: "bg-amber-400", ring: "ring-amber-300", glow: "shadow-amber-400/50", badgeBg: "bg-amber-400/20 text-amber-300 border-amber-400/30", text: "text-amber-400", emoji: "🟡", avatar: "👑" },
};

/**
 * Business Tour Special Corner & Space Icons.
 */
export const SPACE_ICONS: Record<string, string> = {
  go:              "🚩",
  jail:            "🏝️",
  free_parking:    "🏆",
  go_to_jail:      "✈️",
  world_tour:      "✈️",
  chance:          "☸️",
  community_chest: "🎴",
  tax:             "💸",
  beach:           "",
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

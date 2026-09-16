"use client";

// ─── Table Dimensions (pixels) ──────────────────────────────────────────────
// Standard billiards table aspect ratio is ~2:1
export const TABLE_WIDTH = 1000;
export const TABLE_HEIGHT = 500;
export const CUSHION_WIDTH = 30; // width of the rail cushions
export const POCKET_RADIUS = 22; // radius of pocket sensors
export const CORNER_POCKET_OFFSET = 8; // how far corner pockets sit from exact corner
export const SIDE_POCKET_OFFSET = 0; // side pockets sit exactly at midpoint

// Play area (inside cushions)
export const PLAY_LEFT = CUSHION_WIDTH;
export const PLAY_TOP = CUSHION_WIDTH;
export const PLAY_RIGHT = TABLE_WIDTH - CUSHION_WIDTH;
export const PLAY_BOTTOM = TABLE_HEIGHT - CUSHION_WIDTH;
export const PLAY_WIDTH = PLAY_RIGHT - PLAY_LEFT;
export const PLAY_HEIGHT = PLAY_BOTTOM - PLAY_TOP;

// ─── Ball Properties ────────────────────────────────────────────────────────
export const BALL_RADIUS = 11;
export const BALL_MASS = 0.17; // ~170g billiard ball
export const BALL_FRICTION = 0.015; // rolling friction on cloth
export const BALL_FRICTION_AIR = 0.004; // air/cloth drag tuned for 4 sub-steps per frame (~0.016/frame)
export const BALL_FRICTION_STATIC = 0.05;
export const BALL_RESTITUTION = 0.95; // bounciness between balls for explosive breaks
export const BALL_DENSITY = 0.0025;

// Cue ball can have slightly different properties
export const CUE_BALL_RESTITUTION = 0.95;

// ─── Cushion Properties ─────────────────────────────────────────────────────
export const CUSHION_RESTITUTION = 0.82; // lively rubber cushion bounce
export const CUSHION_FRICTION = 0.03;

// ─── Physics Engine ─────────────────────────────────────────────────────────
export const FIXED_TIMESTEP = 1000 / 60; // 60 Hz physics updates
export const VELOCITY_THRESHOLD = 0.08; // below this, a ball is "stopped"

// ─── Max Shooting Force ─────────────────────────────────────────────────────
export const MAX_FORCE = 0.22; // Powerful, punchy shot force for authentic break & bank shots
export const MIN_DRAG_DISTANCE = 6; // min pixels to drag before registering
export const MAX_DRAG_DISTANCE = 110; // comfortable drag distance to reach 100% full power smoothly

// ─── Ball IDs / Labels ──────────────────────────────────────────────────────
export const CUE_BALL_LABEL = "ball-0";
export const EIGHT_BALL_LABEL = "ball-8";
export const POCKET_LABEL_PREFIX = "pocket";

// ─── Ball Types ─────────────────────────────────────────────────────────────
export type BallType = "solid" | "stripe" | "cue" | "eight";

export interface BallConfig {
  number: number;
  label: string;
  type: BallType;
  color: string;
  stripeColor?: string; // for stripe balls, the base white + stripe color
}

// Standard billiard ball colors
export const BALL_CONFIGS: BallConfig[] = [
  { number: 0, label: "ball-0", type: "cue", color: "#FFFFFF" },
  { number: 1, label: "ball-1", type: "solid", color: "#FDD835" }, // Yellow
  { number: 2, label: "ball-2", type: "solid", color: "#1565C0" }, // Blue
  { number: 3, label: "ball-3", type: "solid", color: "#D32F2F" }, // Red
  { number: 4, label: "ball-4", type: "solid", color: "#6A1B9A" }, // Purple
  { number: 5, label: "ball-5", type: "solid", color: "#E65100" }, // Orange
  { number: 6, label: "ball-6", type: "solid", color: "#2E7D32" }, // Green
  { number: 7, label: "ball-7", type: "solid", color: "#7B1FA2" }, // Maroon/Dark Red
  { number: 8, label: "ball-8", type: "eight", color: "#212121" }, // Black
  { number: 9, label: "ball-9", type: "stripe", color: "#FFFFFF", stripeColor: "#FDD835" },
  { number: 10, label: "ball-10", type: "stripe", color: "#FFFFFF", stripeColor: "#1565C0" },
  { number: 11, label: "ball-11", type: "stripe", color: "#FFFFFF", stripeColor: "#D32F2F" },
  { number: 12, label: "ball-12", type: "stripe", color: "#FFFFFF", stripeColor: "#6A1B9A" },
  { number: 13, label: "ball-13", type: "stripe", color: "#FFFFFF", stripeColor: "#E65100" },
  { number: 14, label: "ball-14", type: "stripe", color: "#FFFFFF", stripeColor: "#2E7D32" },
  { number: 15, label: "ball-15", type: "stripe", color: "#FFFFFF", stripeColor: "#7B1FA2" },
];

// ─── Pocket Positions ───────────────────────────────────────────────────────
// Six pockets: 4 corners + 2 side (mid-long-rail)
export const POCKET_POSITIONS = [
  // Top-left corner
  { x: PLAY_LEFT + CORNER_POCKET_OFFSET, y: PLAY_TOP + CORNER_POCKET_OFFSET, id: "pocket-tl" },
  // Top-right corner
  { x: PLAY_RIGHT - CORNER_POCKET_OFFSET, y: PLAY_TOP + CORNER_POCKET_OFFSET, id: "pocket-tr" },
  // Bottom-left corner
  { x: PLAY_LEFT + CORNER_POCKET_OFFSET, y: PLAY_BOTTOM - CORNER_POCKET_OFFSET, id: "pocket-bl" },
  // Bottom-right corner
  { x: PLAY_RIGHT - CORNER_POCKET_OFFSET, y: PLAY_BOTTOM - CORNER_POCKET_OFFSET, id: "pocket-br" },
  // Mid-left side
  { x: TABLE_WIDTH / 2, y: PLAY_TOP - 2, id: "pocket-mt" },
  // Mid-right side
  { x: TABLE_WIDTH / 2, y: PLAY_BOTTOM + 2, id: "pocket-mb" },
];

// ─── Triangle Rack Formation ────────────────────────────────────────────────
// Standard 8-ball rack: 5 rows, 8-ball in center of 3rd row
// Ball placement order in the triangle (row by row, left to right):
// Row 1 (apex): 1 ball
// Row 2: 2 balls
// Row 3: 3 balls (8 must be center)
// Row 4: 4 balls
// Row 5: 5 balls
// Rule: one corner of row 5 must be solid, other must be stripe

export function getRackPositions(): { x: number; y: number }[] {
  const footSpotX = PLAY_LEFT + PLAY_WIDTH * 0.73; // foot spot at ~73% of table
  const footSpotY = TABLE_HEIGHT / 2;
  const spacing = BALL_RADIUS * 2.05; // slight gap between balls

  const positions: { x: number; y: number }[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const x = footSpotX + row * spacing * Math.cos(Math.PI / 6); // ~30° offset for tight packing
      const y = footSpotY + (col - row / 2) * spacing;
      positions.push({ x, y });
    }
  }

  return positions;
}

// Standard rack order: ensures 8-ball is at index 4 (center of row 3)
// Row1: [0] -> ball at apex
// Row2: [1, 2]
// Row3: [3, 4, 5] -> index 4 is center (8-ball)
// Row4: [6, 7, 8, 9]
// Row5: [10, 11, 12, 13, 14]
// The specific arrangement ensures mixed solid/stripe and 8 in center
export const RACK_BALL_ORDER = [
  1,   // Row 1: apex - solid
  11, 2,  // Row 2: stripe, solid
  3, 8, 10, // Row 3: solid, 8-BALL, stripe
  14, 7, 12, 4, // Row 4: stripe, solid, stripe, solid
  6, 9, 5, 13, 15, // Row 5: solid, stripe, solid, stripe, stripe
];

// ─── Head String (Cue Ball Start) ───────────────────────────────────────────
export const CUE_BALL_START_X = PLAY_LEFT + PLAY_WIDTH * 0.25;
export const CUE_BALL_START_Y = TABLE_HEIGHT / 2;

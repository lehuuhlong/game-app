/**
 * Type definitions for the T-Rex Runner canvas game.
 *
 * All positional / physics data lives OUTSIDE React state to avoid
 * per-frame re-renders.  Only "display-worthy" values (score, highScore,
 * isGameOver) are surfaced to the React layer.
 */

// ── Entity types ────────────────────────────────────────────────────

export interface Dino {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Current vertical velocity (px / frame) */
  velocityY: number;
  /** True while the dino is above ground level */
  isJumping: boolean;
  /** True while the dino is ducking */
  isDucking: boolean;
  /** Frame counter for leg animation */
  frameCount: number;
}

export type ObstacleKind = "cactus-small" | "cactus-large" | "pterodactyl";

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: ObstacleKind;
  /** Frame counter for pterodactyl wing animation */
  frameCount: number;
  /** Whether this obstacle has already been passed (for scoring) */
  scored: boolean;
}

export interface Cloud {
  x: number;
  y: number;
  width: number;
}

export interface GroundSegment {
  x: number;
}

// ── Game state (the subset exposed to React) ────────────────────────

export interface TrexGameState {
  score: number;
  highScore: number;
  isGameOver: boolean;
  isPlaying: boolean;
}

// ── Engine configuration ────────────────────────────────────────────

export interface EngineConfig {
  /** Canvas logical width */
  canvasWidth: number;
  /** Canvas logical height */
  canvasHeight: number;
  /** Ground Y position (from top) */
  groundY: number;
  /** Initial scroll speed (px / frame) */
  initialSpeed: number;
  /** Maximum scroll speed */
  maxSpeed: number;
  /** Speed increment per frame */
  speedIncrement: number;
  /** Jump initial velocity */
  jumpVelocity: number;
  /** Gravity applied per frame */
  gravity: number;
  /** Fast-fall multiplier when ducking mid-air */
  fastFallMultiplier: number;
  /** Minimum frames between obstacle spawns */
  minObstacleGap: number;
  /** Maximum frames between obstacle spawns */
  maxObstacleGap: number;
}

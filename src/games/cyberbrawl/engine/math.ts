/**
 * Cyber Brawl — Core Math Utilities
 *
 * Pure functions with zero side-effects. Every function is deterministic —
 * given the same inputs, it will always produce the same outputs.
 * No mutable state, no DOM access, no imports beyond our own types.
 */

import type { AABB, BoxOffset, FacingDirection, Vector2D } from './types';

// ─── Vector2D Operations ─────────────────────────────────────────────────────

/** Create a new Vector2D. */
export function vec2(x: number, y: number): Vector2D {
  return { x, y };
}

/** Add two vectors. */
export function vec2Add(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Subtract vector `b` from vector `a`. */
export function vec2Sub(a: Vector2D, b: Vector2D): Vector2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Scale a vector by a scalar. */
export function vec2Scale(v: Vector2D, s: number): Vector2D {
  return { x: v.x * s, y: v.y * s };
}

/** Compute the Euclidean length of a vector. */
export function vec2Length(v: Vector2D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/** Compute the squared length (avoids sqrt — useful for comparisons). */
export function vec2LengthSq(v: Vector2D): number {
  return v.x * v.x + v.y * v.y;
}

/** Normalize a vector to unit length. Returns zero vector if length is ~0. */
export function vec2Normalize(v: Vector2D): Vector2D {
  const len = vec2Length(v);
  if (len < 1e-8) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** Linear interpolation between two vectors. */
export function vec2Lerp(a: Vector2D, b: Vector2D, t: number): Vector2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

// ─── Scalar Utilities ────────────────────────────────────────────────────────

/** Clamp a value between min and max (inclusive). */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation between two scalars. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Return the sign of a number: -1, 0, or +1. */
export function sign(value: number): -1 | 0 | 1 {
  if (value > 0) return 1;
  if (value < 0) return -1;
  return 0;
}

/** Move `current` toward `target` by at most `maxDelta`. */
export function moveToward(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + sign(target - current) * maxDelta;
}

// ─── AABB Operations ─────────────────────────────────────────────────────────

/**
 * Test whether two AABBs intersect (overlap).
 * Returns `true` if ANY overlap exists (touching edges count as intersecting).
 */
export function aabbIntersects(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Compute the overlap depth between two intersecting AABBs along each axis.
 * Returns `null` if the AABBs do not intersect.
 * Positive values indicate overlap magnitude.
 */
export function aabbOverlap(a: AABB, b: AABB): Vector2D | null {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  if (overlapX <= 0 || overlapY <= 0) return null;

  return { x: overlapX, y: overlapY };
}

/**
 * Compute the center of an AABB.
 */
export function aabbCenter(box: AABB): Vector2D {
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Test whether a point is inside an AABB.
 */
export function aabbContainsPoint(box: AABB, point: Vector2D): boolean {
  return (
    point.x >= box.x &&
    point.x <= box.x + box.width &&
    point.y >= box.y &&
    point.y <= box.y + box.height
  );
}

// ─── Box Offset → World-Space AABB ──────────────────────────────────────────

/**
 * Convert a BoxOffset (relative to a fighter's anchor) into a world-space AABB.
 *
 * The fighter's anchor `(baseX, baseY)` is at their feet-center.
 * `offsetX` is auto-mirrored when facing LEFT so that attack hitboxes
 * naturally flip direction.
 *
 * @param offset  - The box offset definition (designed for RIGHT-facing).
 * @param baseX   - Fighter's world X (feet center).
 * @param baseY   - Fighter's world Y (feet / ground level).
 * @param facing  - Current facing direction.
 * @returns World-space AABB.
 */
export function boxOffsetToWorldAABB(
  offset: BoxOffset,
  baseX: number,
  baseY: number,
  facing: FacingDirection,
): AABB {
  // Mirror offsetX when facing left
  const facingMultiplier = facing === 'right' ? 1 : -1;
  const worldOffsetX = offset.offsetX * facingMultiplier;

  // When facing left, the box starts at (base + mirrored offset - width)
  // because the offset points to the right edge in mirrored space.
  const x =
    facing === 'right'
      ? baseX + worldOffsetX
      : baseX + worldOffsetX - offset.width;

  // Y offset is relative to baseY (feet), growing upward (negative Y in screen coords).
  const y = baseY + offset.offsetY;

  return {
    x,
    y,
    width: offset.width,
    height: offset.height,
  };
}

// ─── Pushbox Separation ──────────────────────────────────────────────────────

/**
 * Given two pushbox AABBs, compute the horizontal displacement needed to
 * separate them symmetrically. Each fighter is pushed by half the overlap.
 *
 * @returns A tuple `[deltaA, deltaB]` of horizontal displacements to apply.
 *          Returns `[0, 0]` if no overlap exists.
 */
export function computePushboxSeparation(
  a: AABB,
  b: AABB,
): [number, number] {
  const overlap = aabbOverlap(a, b);
  if (!overlap) return [0, 0];

  const centerA = aabbCenter(a);
  const centerB = aabbCenter(b);

  // Push apart along X only (standard fighting game behavior)
  const halfOverlap = overlap.x / 2;

  if (centerA.x <= centerB.x) {
    // A is on the left → push A leftward, B rightward
    return [-halfOverlap, halfOverlap];
  } else {
    // A is on the right → push A rightward, B leftward
    return [halfOverlap, -halfOverlap];
  }
}

// ─── Stage Clamping ──────────────────────────────────────────────────────────

/**
 * Clamp a fighter's X position so their pushbox stays within stage bounds.
 *
 * @param fighterX   - Fighter's current X (feet center).
 * @param pushbox    - Fighter's pushbox offset (used to compute edges).
 * @param leftBound  - Stage left boundary.
 * @param rightBound - Stage right boundary.
 * @param facing     - Fighter's current facing direction.
 * @returns The clamped X position.
 */
export function clampToStageBounds(
  fighterX: number,
  pushbox: BoxOffset,
  leftBound: number,
  rightBound: number,
  facing: FacingDirection,
): number {
  // Convert pushbox to world space to find its edges
  const worldBox = boxOffsetToWorldAABB(pushbox, fighterX, 0, facing);
  const leftEdge = worldBox.x;
  const rightEdge = worldBox.x + worldBox.width;

  let clampedX = fighterX;

  if (leftEdge < leftBound) {
    clampedX += leftBound - leftEdge;
  }
  if (rightEdge > rightBound) {
    clampedX -= rightEdge - rightBound;
  }

  return clampedX;
}

// ─── Fixed Timestep Accumulator ──────────────────────────────────────────────

/**
 * The fixed timestep interval in seconds.
 * 60 updates per second → 1/60 ≈ 0.01667s per tick.
 */
export const FIXED_TIMESTEP = 1 / 60;

/**
 * Maximum number of simulation steps allowed per frame to prevent
 * the "spiral of death" on very slow machines.
 */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * Given a delta time from `requestAnimationFrame` and the current accumulator,
 * returns the updated accumulator and the number of fixed steps to execute.
 *
 * @param dtSeconds   - Raw delta time from rAF (in seconds).
 * @param accumulator - Previous accumulator value.
 * @returns `[newAccumulator, stepCount]`
 */
export function computeFixedSteps(
  dtSeconds: number,
  accumulator: number,
): [number, number] {
  // Clamp DT to prevent spiral of death (e.g., after tab switch)
  const clampedDt = Math.min(dtSeconds, FIXED_TIMESTEP * MAX_STEPS_PER_FRAME);
  let acc = accumulator + clampedDt;
  let steps = 0;

  while (acc >= FIXED_TIMESTEP && steps < MAX_STEPS_PER_FRAME) {
    acc -= FIXED_TIMESTEP;
    steps++;
  }

  return [acc, steps];
}

// ─── Facing Direction ────────────────────────────────────────────────────────

/**
 * Determine which direction a fighter should face based on
 * their position relative to the opponent.
 */
export function computeFacing(
  fighterX: number,
  opponentX: number,
): FacingDirection {
  return fighterX <= opponentX ? 'right' : 'left';
}

// ─── Tick-to-Seconds Conversion ──────────────────────────────────────────────

/** Convert simulation ticks to display seconds (floored integer). */
export function ticksToSeconds(ticks: number): number {
  return Math.ceil(ticks * FIXED_TIMESTEP);
}

/** Convert seconds to simulation ticks. */
export function secondsToTicks(seconds: number): number {
  return Math.round(seconds / FIXED_TIMESTEP);
}

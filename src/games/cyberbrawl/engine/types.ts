/**
 * Cyber Brawl — Core Engine Types
 *
 * Pure data definitions with zero runtime dependencies.
 * Every interface here is consumed by the engine subsystems
 * (Fighter, CombatSystem, Renderer, InputHandler).
 */

// ─── Primitives ──────────────────────────────────────────────────────────────

/** 2D vector used for position, velocity, and force calculations. */
export interface Vector2D {
  x: number;
  y: number;
}

/**
 * Axis-Aligned Bounding Box.
 * All collision math operates on AABBs in world-space coordinates.
 * (x, y) represents the TOP-LEFT corner; width/height extend rightward/downward.
 */
export interface AABB {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Box Offset Definitions ──────────────────────────────────────────────────
// These define box positions RELATIVE to the fighter's base (x, y).
// The engine converts them to world-space AABBs each tick.

/**
 * Offset rectangle relative to a fighter's anchor point.
 * `offsetX`/`offsetY` are measured from the fighter's base position.
 * `offsetX` is auto-flipped by facing direction at world-space conversion time.
 */
export interface BoxOffset {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

// ─── Fighter State Machine ──────────────────────────────────────────────────

export enum FighterState {
  IDLE = 'IDLE',
  WALK_FORWARD = 'WALK_FORWARD',
  WALK_BACKWARD = 'WALK_BACKWARD',
  CROUCH = 'CROUCH',
  JUMP_SQUAT = 'JUMP_SQUAT',
  JUMPING = 'JUMPING',
  FALLING = 'FALLING',
  ATTACK_PUNCH = 'ATTACK_PUNCH',
  ATTACK_KICK = 'ATTACK_KICK',
  HIT_STUN = 'HIT_STUN',
  BLOCK_STUN = 'BLOCK_STUN',
  DEAD = 'DEAD',
}

/** Direction the fighter sprite faces. Affects hitbox offset mirroring. */
export type FacingDirection = 'left' | 'right';

// ─── Frame Data ──────────────────────────────────────────────────────────────

/**
 * Frame data for a single attack.
 * Timings are in simulation ticks (1 tick = 1/60 s at 60 Hz fixed timestep).
 *
 * Lifecycle: STARTUP → ACTIVE → RECOVERY
 *   - STARTUP: Interruptible wind-up. No hitbox. Hurtbox active (vulnerable).
 *   - ACTIVE:  Hitbox spawns. Damage can register (single-hit confirmed).
 *   - RECOVERY: Hitbox removed. Fighter locked out of new actions until finished.
 */
export interface FrameData {
  /** Ticks before the hitbox becomes active. */
  startup: number;
  /** Ticks the hitbox stays active. */
  active: number;
  /** Ticks of cool-down after the hitbox deactivates. */
  recovery: number;
}

/**
 * Full configuration for an attack type.
 * Combines frame timing with combat values and the hitbox geometry.
 */
export interface AttackConfig {
  /** Human-readable name, e.g. "Light Punch". */
  name: string;
  /** Frame timing. */
  frameData: FrameData;
  /** Damage dealt to opponent on hit. */
  damage: number;
  /** Horizontal knockback velocity applied to the victim (absolute value). */
  knockbackX: number;
  /** Vertical knockback velocity (negative = upward, 0 = no lift). */
  knockbackY: number;
  /** Ticks the victim is locked in HIT_STUN after being hit. */
  hitstunDuration: number;
  /**
   * Hitbox offset relative to the fighter's anchor.
   * `offsetX` is always specified as if the fighter faces RIGHT.
   * The engine mirrors it for LEFT-facing fighters.
   */
  hitbox: BoxOffset;
}

// ─── Attack Instance (Runtime) ───────────────────────────────────────────────

/** Tracks a single in-progress attack's lifecycle state. */
export interface AttackInstance {
  /** The static config driving this attack. */
  config: AttackConfig;
  /** Current tick within the attack lifecycle (0-indexed). */
  currentTick: number;
  /** Total ticks for the full attack (startup + active + recovery). */
  totalTicks: number;
  /** True once the hitbox has already registered a hit this attack. */
  hasHit: boolean;
}

// ─── Fighter Collision Profile ───────────────────────────────────────────────

/**
 * Stance-dependent box offsets.
 * Each stance (standing, crouching, airborne) can define different
 * pushbox and hurtbox shapes.
 */
export interface StanceBoxes {
  pushbox: BoxOffset;
  hurtbox: BoxOffset;
}

export interface CollisionProfile {
  standing: StanceBoxes;
  crouching: StanceBoxes;
  airborne: StanceBoxes;
}

// ─── Fighter Data (Static Config) ────────────────────────────────────────────

/** Immutable constants defining a fighter archetype. */
export interface FighterConfig {
  /** Display name. */
  name: string;
  /** Maximum health points. */
  maxHealth: number;
  /** Horizontal walk speed in pixels/tick. */
  walkSpeed: number;
  /** Vertical velocity applied on jump (negative = upward). */
  jumpVelocity: number;
  /** Ticks spent in JUMP_SQUAT before becoming airborne. */
  jumpSquatFrames: number;
  /** Gravity acceleration in px/tick². */
  gravity: number;
  /** Ground friction multiplier (0–1). Applied each tick to horizontal velocity. */
  friction: number;
  /** Fighter width for rendering (not collision — see collision profile). */
  renderWidth: number;
  /** Fighter height for rendering. */
  renderHeight: number;
  /** Box offsets per stance. */
  collisionProfile: CollisionProfile;
  /** Available attacks keyed by a logical name. */
  attacks: {
    punch: AttackConfig;
    kick: AttackConfig;
  };
}

// ─── Fighter Runtime State ───────────────────────────────────────────────────

/** Mutable per-tick state of a single fighter. */
export interface FighterRuntimeState {
  /** Player index: 0 = P1, 1 = P2. */
  playerIndex: 0 | 1;
  /** Reference to the immutable config. */
  config: FighterConfig;

  // Spatial
  position: Vector2D;
  velocity: Vector2D;
  facing: FacingDirection;
  isGrounded: boolean;

  // FSM
  state: FighterState;

  // Health
  health: number;

  // Attack lifecycle
  currentAttack: AttackInstance | null;

  // Hitstun timer (ticks remaining)
  hitstunRemaining: number;

  // Jump squat timer (ticks remaining)
  jumpSquatRemaining: number;

  // World-space bounding boxes (recomputed each tick)
  worldPushbox: AABB;
  worldHurtbox: AABB;
  worldHitbox: AABB | null; // null when no hitbox is active
}

// ─── Input ───────────────────────────────────────────────────────────────────

/** Logical input actions abstracted from raw key codes. */
export enum InputAction {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  UP = 'UP',
  DOWN = 'DOWN',
  PUNCH = 'PUNCH',
  KICK = 'KICK',
}

/** Snapshot of a player's active inputs for one tick. */
export type InputSnapshot = Set<InputAction>;

/** Key bindings for a single player. Maps raw `KeyboardEvent.code` → action. */
export type KeyBindings = Record<string, InputAction>;

// ─── Arena ───────────────────────────────────────────────────────────────────

export interface ArenaConfig {
  /** Canvas width in pixels. */
  width: number;
  /** Canvas height in pixels. */
  height: number;
  /** Y-coordinate of the floor (fighters clamp to this). */
  floorY: number;
  /** Left stage boundary (minimum fighter X). */
  leftBound: number;
  /** Right stage boundary (maximum fighter X). */
  rightBound: number;
}

// ─── Round / Match State ─────────────────────────────────────────────────────

export enum RoundPhase {
  /** Pre-fight intro ("ROUND 1 — FIGHT!"). */
  INTRO = 'INTRO',
  /** Active gameplay. */
  FIGHTING = 'FIGHTING',
  /** A KO or time-out has occurred; short freeze before next round. */
  KO = 'KO',
  /** Match is over. */
  MATCH_OVER = 'MATCH_OVER',
}

export interface RoundState {
  /** Current round number (1-indexed). */
  roundNumber: number;
  /** Rounds won by each player [P1, P2]. */
  wins: [number, number];
  /** Rounds needed to win the match. */
  roundsToWin: number;
  /** Current phase of the round. */
  phase: RoundPhase;
  /** Remaining time in the current round, in simulation ticks. */
  timerTicks: number;
  /** Winner of the current round (null while fighting). */
  roundWinner: 0 | 1 | null;
}

// ─── Game Events (Pub/Sub for React HUD) ─────────────────────────────────────

export enum GameEventType {
  HEALTH_CHANGED = 'HEALTH_CHANGED',
  ROUND_PHASE_CHANGED = 'ROUND_PHASE_CHANGED',
  TIMER_CHANGED = 'TIMER_CHANGED',
  HIT_LANDED = 'HIT_LANDED',
  MATCH_OVER = 'MATCH_OVER',
}

export interface GameEvent {
  type: GameEventType;
  payload: unknown;
}

export interface HealthChangedPayload {
  playerIndex: 0 | 1;
  currentHealth: number;
  maxHealth: number;
  damage: number;
}

export interface RoundPhaseChangedPayload {
  phase: RoundPhase;
  roundNumber: number;
  wins: [number, number];
  roundWinner: 0 | 1 | null;
}

export interface TimerChangedPayload {
  /** Remaining seconds (integer, for display). */
  seconds: number;
}

export interface HitLandedPayload {
  attackerIndex: 0 | 1;
  victimIndex: 0 | 1;
  attackName: string;
  damage: number;
}

export interface MatchOverPayload {
  winnerIndex: 0 | 1;
  wins: [number, number];
}

/** Callback signature for game event listeners. */
export type GameEventListener = (event: GameEvent) => void;

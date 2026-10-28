/**
 * Cyber Brawl — Fighter Class
 *
 * The Fighter is the core simulation entity. It owns:
 *   - Position / velocity / gravity physics
 *   - Finite State Machine transitions
 *   - Ground & floor collision
 *   - World-space bounding box recomputation
 *   - Auto-facing logic
 *
 * The Fighter does NOT know about the opponent or the combat system.
 * Cross-fighter interactions (pushbox separation, hit detection) are handled
 * externally by the CombatSystem, which operates on pairs of Fighters.
 *
 * All tick-based timings assume one call to `update()` = one fixed-timestep tick
 * (1/60 s). The game loop guarantees this via the delta-time accumulator in math.ts.
 */

import {
  boxOffsetToWorldAABB,
  clampToStageBounds,
  computeFacing,
} from './math';
import type {
  AABB,
  ArenaConfig,
  AttackConfig,
  AttackInstance,
  BoxOffset,
  FacingDirection,
  FighterConfig,
  FighterRuntimeState,
  InputSnapshot,
  StanceBoxes,
} from './types';
import { FighterState, InputAction } from './types';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Dead-zone threshold: velocities below this are snapped to 0. */
const VELOCITY_EPSILON = 0.01;

// ─── Fighter Class ───────────────────────────────────────────────────────────

export class Fighter {
  /** The full mutable runtime state. Exposed read-only to external systems. */
  public readonly state: FighterRuntimeState;

  constructor(
    playerIndex: 0 | 1,
    config: FighterConfig,
    spawnX: number,
    floorY: number,
    initialFacing: FacingDirection,
  ) {
    const zeroBox: AABB = { x: 0, y: 0, width: 0, height: 0 };

    this.state = {
      playerIndex,
      config,
      position: { x: spawnX, y: floorY },
      velocity: { x: 0, y: 0 },
      facing: initialFacing,
      isGrounded: true,
      state: FighterState.IDLE,
      health: config.maxHealth,
      currentAttack: null,
      hitstunRemaining: 0,
      jumpSquatRemaining: 0,
      worldPushbox: { ...zeroBox },
      worldHurtbox: { ...zeroBox },
      worldHitbox: null,
    };

    // Compute initial boxes
    this.recomputeWorldBoxes();
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Main per-tick update. Called once per fixed timestep (1/60 s).
   *
   * Order of operations matters:
   *   1. Process input → derive desired state transitions
   *   2. Advance FSM timers (attack lifecycle, hitstun, jump squat)
   *   3. Apply physics (velocity, gravity, friction)
   *   4. Resolve floor collision
   *   5. Clamp to stage bounds
   *   6. Recompute world-space bounding boxes
   *
   * Pushbox separation and auto-facing are handled EXTERNALLY after both
   * fighters have been updated individually, since they depend on the
   * opponent's position.
   */
  public update(input: InputSnapshot, arena: ArenaConfig): void {
    // Dead fighters don't update
    if (this.state.state === FighterState.DEAD) return;

    // 1. Process input & FSM transitions
    this.processInput(input);

    // 2. Advance timers
    this.advanceTimers();

    // 3. Apply physics
    this.applyPhysics(arena);

    // 4. Floor collision
    this.resolveFloorCollision(arena.floorY);

    // 5. Stage bounds
    this.clampToStage(arena);

    // 6. Recompute boxes
    this.recomputeWorldBoxes();
  }

  /**
   * Update facing direction based on opponent's position.
   * Called externally AFTER both fighters have moved, so we use
   * the latest positions.
   * Only updates facing when grounded and not in an attack/hitstun.
   */
  public updateFacing(opponentX: number): void {
    if (!this.state.isGrounded) return;
    if (this.isInActionLock()) return;

    this.state.facing = computeFacing(this.state.position.x, opponentX);
  }

  /**
   * Apply pushbox separation displacement (computed externally).
   * After displacement, re-clamp to stage and recompute boxes.
   */
  public applyPushDisplacement(deltaX: number, arena: ArenaConfig): void {
    this.state.position.x += deltaX;
    this.clampToStage(arena);
    this.recomputeWorldBoxes();
  }

  /**
   * Apply damage and enter hitstun. Called by CombatSystem on hit confirmation.
   */
  public receiveDamage(
    damage: number,
    knockbackX: number,
    knockbackY: number,
    hitstunDuration: number,
    attackerX: number,
  ): void {
    this.state.health = Math.max(0, this.state.health - damage);

    if (this.state.health <= 0) {
      this.transitionTo(FighterState.DEAD);
      this.state.velocity.x = 0;
      this.state.velocity.y = 0;
      this.state.currentAttack = null;
      return;
    }

    // Cancel any current attack
    this.state.currentAttack = null;
    this.state.worldHitbox = null;

    // Enter hitstun
    this.state.hitstunRemaining = hitstunDuration;
    this.transitionTo(FighterState.HIT_STUN);

    // Apply knockback — direction is AWAY from attacker
    const knockbackDir = this.state.position.x >= attackerX ? 1 : -1;
    this.state.velocity.x = knockbackX * knockbackDir;
    this.state.velocity.y = knockbackY; // negative = upward
  }

  /**
   * Start an attack if the fighter is in a valid state to do so.
   * Returns true if the attack was initiated.
   */
  public startAttack(attackConfig: AttackConfig): boolean {
    if (!this.canAttack()) return false;

    const targetState =
      attackConfig === this.state.config.attacks.punch
        ? FighterState.ATTACK_PUNCH
        : FighterState.ATTACK_KICK;

    this.transitionTo(targetState);

    this.state.currentAttack = {
      config: attackConfig,
      currentTick: 0,
      totalTicks:
        attackConfig.frameData.startup +
        attackConfig.frameData.active +
        attackConfig.frameData.recovery,
      hasHit: false,
    };

    // Stop horizontal movement when attacking on ground
    if (this.state.isGrounded) {
      this.state.velocity.x = 0;
    }

    return true;
  }

  /**
   * Reset the fighter to initial round state at a given spawn position.
   */
  public resetForRound(spawnX: number, floorY: number, facing: FacingDirection): void {
    this.state.position.x = spawnX;
    this.state.position.y = floorY;
    this.state.velocity.x = 0;
    this.state.velocity.y = 0;
    this.state.facing = facing;
    this.state.isGrounded = true;
    this.state.state = FighterState.IDLE;
    this.state.health = this.state.config.maxHealth;
    this.state.currentAttack = null;
    this.state.hitstunRemaining = 0;
    this.state.jumpSquatRemaining = 0;
    this.state.worldHitbox = null;
    this.recomputeWorldBoxes();
  }

  // ─── Input Processing ────────────────────────────────────────────────────

  /**
   * Translate input actions into state transitions and velocity changes.
   * Inputs are ignored during action-locked states (attacks, hitstun, jump squat).
   */
  private processInput(input: InputSnapshot): void {
    // No input processing during locked states
    if (this.isInActionLock()) return;

    // ── Grounded movement ──
    if (this.state.isGrounded) {
      this.processGroundedInput(input);
    }
    // ── Airborne: allow limited air control ──
    else {
      this.processAirborneInput(input);
    }
  }

  private processGroundedInput(input: InputSnapshot): void {
    const { config, facing } = this.state;

    // ── Attack inputs (take priority over movement) ──
    if (input.has(InputAction.PUNCH)) {
      this.startAttack(config.attacks.punch);
      return;
    }
    if (input.has(InputAction.KICK)) {
      this.startAttack(config.attacks.kick);
      return;
    }

    // ── Jump ──
    if (input.has(InputAction.UP)) {
      this.transitionTo(FighterState.JUMP_SQUAT);
      this.state.jumpSquatRemaining = config.jumpSquatFrames;
      this.state.velocity.x = 0; // Stop horizontal during jump squat
      return;
    }

    // ── Crouch ──
    if (input.has(InputAction.DOWN)) {
      this.transitionTo(FighterState.CROUCH);
      this.state.velocity.x = 0;
      return;
    }

    // ── Horizontal movement ──
    const hasLeft = input.has(InputAction.LEFT);
    const hasRight = input.has(InputAction.RIGHT);

    if (hasLeft && !hasRight) {
      this.state.velocity.x = -config.walkSpeed;
      // Walking toward or away from opponent?
      this.transitionTo(
        facing === 'right' ? FighterState.WALK_BACKWARD : FighterState.WALK_FORWARD,
      );
    } else if (hasRight && !hasLeft) {
      this.state.velocity.x = config.walkSpeed;
      this.transitionTo(
        facing === 'right' ? FighterState.WALK_FORWARD : FighterState.WALK_BACKWARD,
      );
    } else {
      // No horizontal input → idle
      this.state.velocity.x = 0;
      this.transitionTo(FighterState.IDLE);
    }
  }

  private processAirborneInput(input: InputSnapshot): void {
    // Minimal air control: allow slight horizontal nudge (no state transition)
    const hasLeft = input.has(InputAction.LEFT);
    const hasRight = input.has(InputAction.RIGHT);
    const airControlFactor = 0.3; // 30% of walk speed as air control

    if (hasLeft && !hasRight) {
      this.state.velocity.x -= this.state.config.walkSpeed * airControlFactor * 0.1;
    } else if (hasRight && !hasLeft) {
      this.state.velocity.x += this.state.config.walkSpeed * airControlFactor * 0.1;
    }

    // Air attacks
    if (input.has(InputAction.PUNCH)) {
      this.startAttack(this.state.config.attacks.punch);
    } else if (input.has(InputAction.KICK)) {
      this.startAttack(this.state.config.attacks.kick);
    }
  }

  // ─── Timer Advancement ───────────────────────────────────────────────────

  private advanceTimers(): void {
    // ── Jump squat countdown ──
    if (this.state.state === FighterState.JUMP_SQUAT) {
      this.state.jumpSquatRemaining--;
      if (this.state.jumpSquatRemaining <= 0) {
        this.performJump();
      }
      return; // Don't process other timers during jump squat
    }

    // ── Hitstun countdown ──
    if (this.state.state === FighterState.HIT_STUN) {
      this.state.hitstunRemaining--;
      if (this.state.hitstunRemaining <= 0) {
        this.state.hitstunRemaining = 0;
        this.transitionTo(
          this.state.isGrounded ? FighterState.IDLE : FighterState.FALLING,
        );
      }
      return;
    }

    // ── Attack lifecycle ──
    if (this.state.currentAttack) {
      this.advanceAttack();
    }
  }

  /**
   * Advance the current attack's tick counter.
   * Manages the startup → active → recovery lifecycle.
   */
  private advanceAttack(): void {
    const attack = this.state.currentAttack!;
    attack.currentTick++;

    // Check if attack is complete
    if (attack.currentTick >= attack.totalTicks) {
      this.state.currentAttack = null;
      this.state.worldHitbox = null;
      this.transitionTo(
        this.state.isGrounded ? FighterState.IDLE : FighterState.FALLING,
      );
      return;
    }

    // Determine current phase and update hitbox accordingly
    const { startup, active } = attack.config.frameData;

    if (attack.currentTick < startup) {
      // STARTUP phase — no hitbox
      this.state.worldHitbox = null;
    } else if (attack.currentTick < startup + active) {
      // ACTIVE phase — hitbox is live
      this.state.worldHitbox = boxOffsetToWorldAABB(
        attack.config.hitbox,
        this.state.position.x,
        this.state.position.y,
        this.state.facing,
      );
    } else {
      // RECOVERY phase — hitbox removed
      this.state.worldHitbox = null;
    }
  }

  private performJump(): void {
    this.state.velocity.y = this.state.config.jumpVelocity; // negative = upward
    this.state.isGrounded = false;
    this.transitionTo(FighterState.JUMPING);
  }

  // ─── Physics ─────────────────────────────────────────────────────────────

  private applyPhysics(arena: ArenaConfig): void {
    const { config } = this.state;

    // ── Gravity (always applied, even grounded — floor collision handles it) ──
    if (!this.state.isGrounded) {
      this.state.velocity.y += config.gravity;
    }

    // ── Friction (grounded only, and only when not actively walking) ──
    if (this.state.isGrounded && !this.isWalking()) {
      this.state.velocity.x *= config.friction;

      // Snap to zero below epsilon
      if (Math.abs(this.state.velocity.x) < VELOCITY_EPSILON) {
        this.state.velocity.x = 0;
      }
    }

    // ── Integrate position ──
    this.state.position.x += this.state.velocity.x;
    this.state.position.y += this.state.velocity.y;

    // ── Transition from JUMPING to FALLING ──
    if (
      this.state.state === FighterState.JUMPING &&
      this.state.velocity.y >= 0
    ) {
      this.transitionTo(FighterState.FALLING);
    }
  }

  private resolveFloorCollision(floorY: number): void {
    if (this.state.position.y >= floorY) {
      this.state.position.y = floorY;
      this.state.velocity.y = 0;

      const wasAirborne = !this.state.isGrounded;
      this.state.isGrounded = true;

      // Land: transition to idle (unless locked in attack/hitstun)
      if (wasAirborne && !this.isInActionLock()) {
        this.transitionTo(FighterState.IDLE);
      }
    }
  }

  private clampToStage(arena: ArenaConfig): void {
    const pushboxOffset = this.getCurrentPushboxOffset();
    const clampedX = clampToStageBounds(
      this.state.position.x,
      pushboxOffset,
      arena.leftBound,
      arena.rightBound,
      this.state.facing,
    );

    // If position was clamped, also zero out horizontal velocity in that direction
    if (clampedX !== this.state.position.x) {
      // Only zero velocity if pushing into the wall
      const delta = clampedX - this.state.position.x;
      if (
        (delta > 0 && this.state.velocity.x < 0) ||
        (delta < 0 && this.state.velocity.x > 0)
      ) {
        this.state.velocity.x = 0;
      }
      this.state.position.x = clampedX;
    }
  }

  // ─── Bounding Box Recomputation ──────────────────────────────────────────

  /**
   * Recompute all world-space bounding boxes from current position and stance.
   * Called at the end of every update tick.
   */
  private recomputeWorldBoxes(): void {
    const { position, facing } = this.state;
    const stanceBoxes = this.getCurrentStanceBoxes();

    this.state.worldPushbox = boxOffsetToWorldAABB(
      stanceBoxes.pushbox,
      position.x,
      position.y,
      facing,
    );

    this.state.worldHurtbox = boxOffsetToWorldAABB(
      stanceBoxes.hurtbox,
      position.x,
      position.y,
      facing,
    );

    // Hitbox is managed by advanceAttack() — only recompute if active
    if (this.state.currentAttack && this.state.worldHitbox) {
      this.state.worldHitbox = boxOffsetToWorldAABB(
        this.state.currentAttack.config.hitbox,
        position.x,
        position.y,
        facing,
      );
    }
  }

  // ─── Stance Helpers ──────────────────────────────────────────────────────

  /**
   * Return the correct StanceBoxes for the fighter's current stance.
   */
  private getCurrentStanceBoxes(): StanceBoxes {
    const { collisionProfile } = this.state.config;

    if (!this.state.isGrounded) {
      return collisionProfile.airborne;
    }
    if (this.state.state === FighterState.CROUCH) {
      return collisionProfile.crouching;
    }
    return collisionProfile.standing;
  }

  /**
   * Return the pushbox offset for the current stance (used for stage clamping).
   */
  private getCurrentPushboxOffset(): BoxOffset {
    return this.getCurrentStanceBoxes().pushbox;
  }

  // ─── State Helpers ───────────────────────────────────────────────────────

  /**
   * Whether the fighter is locked in an uninterruptible action.
   * During an action lock, inputs are ignored.
   */
  private isInActionLock(): boolean {
    const s = this.state.state;
    return (
      s === FighterState.ATTACK_PUNCH ||
      s === FighterState.ATTACK_KICK ||
      s === FighterState.HIT_STUN ||
      s === FighterState.BLOCK_STUN ||
      s === FighterState.JUMP_SQUAT ||
      s === FighterState.DEAD
    );
  }

  /** Whether the fighter can initiate a new attack. */
  private canAttack(): boolean {
    const s = this.state.state;
    return (
      s === FighterState.IDLE ||
      s === FighterState.WALK_FORWARD ||
      s === FighterState.WALK_BACKWARD ||
      s === FighterState.JUMPING ||
      s === FighterState.FALLING
    );
  }

  /** Whether the fighter is actively walking. */
  private isWalking(): boolean {
    const s = this.state.state;
    return (
      s === FighterState.WALK_FORWARD || s === FighterState.WALK_BACKWARD
    );
  }

  /**
   * Perform a state transition. This is the ONLY place `this.state.state` is assigned
   * (besides the constructor and reset). This makes FSM debugging straightforward.
   */
  private transitionTo(newState: FighterState): void {
    // No-op if already in this state (prevents re-entry side effects)
    if (this.state.state === newState) return;
    this.state.state = newState;
  }
}

// ─── Default Fighter Configs ─────────────────────────────────────────────────

/**
 * Default fighter archetype. Both P1 and P2 use identical stats for balance.
 * Tuned for a 1024×576 canvas with floorY at ~480.
 *
 * Design notes on box offsets:
 *   - Anchor point is at feet-center.
 *   - offsetX/offsetY are measured FROM the anchor.
 *   - Pushbox and hurtbox use NEGATIVE offsetX (centered around anchor).
 *   - offsetY is NEGATIVE to extend UPWARD from the feet.
 *   - Hitbox offsetX is POSITIVE to extend in the facing direction.
 */
export const DEFAULT_FIGHTER_CONFIG: FighterConfig = {
  name: 'Brawler',
  maxHealth: 100,
  walkSpeed: 3.5,
  jumpVelocity: -10, // Negative = upward in screen coords
  jumpSquatFrames: 3, // 3 ticks of squat before airborne
  gravity: 0.55,      // px/tick² — tuned for ~18-tick hang time
  friction: 0.75,     // Rapid deceleration when not walking
  renderWidth: 80,
  renderHeight: 140,

  collisionProfile: {
    standing: {
      pushbox: {
        offsetX: -25,  // Centered: extends 25px left and right of anchor
        offsetY: -130,  // Extends from feet (y) up to near the head
        width: 50,
        height: 130,
      },
      hurtbox: {
        offsetX: -30,
        offsetY: -135,
        width: 60,
        height: 135,
      },
    },
    crouching: {
      pushbox: {
        offsetX: -25,
        offsetY: -80, // Shorter when crouching
        width: 50,
        height: 80,
      },
      hurtbox: {
        offsetX: -30,
        offsetY: -85,
        width: 60,
        height: 85,
      },
    },
    airborne: {
      pushbox: {
        offsetX: -25,
        offsetY: -120,
        width: 50,
        height: 120,
      },
      hurtbox: {
        offsetX: -30,
        offsetY: -125,
        width: 60,
        height: 125,
      },
    },
  },

  attacks: {
    punch: {
      name: 'Light Punch',
      frameData: {
        startup: 4,  // 4 ticks wind-up
        active: 3,   // 3 ticks hitbox active
        recovery: 8, // 8 ticks cooldown
      },
      damage: 8,
      knockbackX: 5,
      knockbackY: -1, // Slight upward lift
      hitstunDuration: 12,
      hitbox: {
        offsetX: 25,   // Extends forward from the fighter
        offsetY: -110, // Around chest height
        width: 55,
        height: 25,
      },
    },
    kick: {
      name: 'Heavy Kick',
      frameData: {
        startup: 7,   // Slower wind-up
        active: 4,    // 4 ticks hitbox active
        recovery: 14, // Longer cooldown — higher risk/reward
      },
      damage: 14,
      knockbackX: 8,
      knockbackY: -2, // More lift
      hitstunDuration: 18,
      hitbox: {
        offsetX: 20,
        offsetY: -60, // Lower — at leg height
        width: 70,    // Longer reach
        height: 30,
      },
    },
  },
};

// ─── Arena Defaults ──────────────────────────────────────────────────────────

export const DEFAULT_ARENA: ArenaConfig = {
  width: 1024,
  height: 576,
  floorY: 480,    // Ground plane — fighters stand at y=480
  leftBound: 0,
  rightBound: 1024,
};

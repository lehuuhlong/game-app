/**
 * Cyber Brawl — Combat System
 *
 * The CombatSystem is the top-level game orchestrator. It owns:
 *   - The two Fighter instances
 *   - Cross-fighter physics (pushbox separation)
 *   - Hit detection (hitbox vs hurtbox)
 *   - Single-hit confirmation (per-attack `hasHit` flag)
 *   - Damage application + knockback delegation
 *   - Auto-facing coordination
 *   - Round lifecycle (intro → fighting → KO → match over)
 *   - Timer countdown
 *   - Event bus (pub/sub bridge to React HUD)
 *
 * Design: The CombatSystem calls `fighter.update()` each tick, then runs
 * cross-fighter resolution passes. The Fighter class is intentionally blind
 * to the opponent — all pair-wise logic lives here.
 *
 * This file also exports the `GameEventBus` class used by the React shell
 * to subscribe to state changes without per-frame React re-renders.
 */

import { Fighter, DEFAULT_FIGHTER_CONFIG, DEFAULT_ARENA } from './Fighter';
import {
  aabbIntersects,
  computePushboxSeparation,
  secondsToTicks,
  ticksToSeconds,
} from './math';
import type {
  ArenaConfig,
  FighterConfig,
  GameEvent,
  GameEventListener,
  HealthChangedPayload,
  HitLandedPayload,
  InputSnapshot,
  MatchOverPayload,
  RoundPhaseChangedPayload,
  RoundState,
  TimerChangedPayload,
} from './types';
import { FighterState, GameEventType, RoundPhase } from './types';

// ─── Event Bus ───────────────────────────────────────────────────────────────

/**
 * Lightweight pub/sub for decoupling the engine from React.
 *
 * The React HUD subscribes to specific event types. The engine emits events
 * ONLY when values actually change — never on every tick. This ensures
 * zero React state updates in the hot path.
 */
export class GameEventBus {
  private listeners: Map<GameEventType, Set<GameEventListener>> = new Map();

  /** Subscribe to a specific event type. Returns an unsubscribe function. */
  public on(type: GameEventType, listener: GameEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /** Emit an event to all subscribers of its type. */
  public emit(type: GameEventType, payload: unknown): void {
    const event: GameEvent = { type, payload };
    this.listeners.get(type)?.forEach((listener) => listener(event));
  }

  /** Remove all listeners. Call on cleanup/unmount. */
  public clear(): void {
    this.listeners.clear();
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Default round duration in seconds. */
const ROUND_DURATION_SECONDS = 99;

/** Number of rounds needed to win the match (best of 3 → need 2). */
const ROUNDS_TO_WIN = 2;

/** Ticks to display the intro announcement ("ROUND X — FIGHT!"). */
const INTRO_DURATION_TICKS = 120; // 2 seconds at 60 ticks/s

/** Ticks to freeze after a KO before transitioning. */
const KO_FREEZE_TICKS = 180; // 3 seconds

/** Spawn positions for P1 and P2 (X coordinates). */
const P1_SPAWN_X = 300;
const P2_SPAWN_X = 724;

// ─── Combat System ───────────────────────────────────────────────────────────

export class CombatSystem {
  public readonly fighters: [Fighter, Fighter];
  public readonly arena: ArenaConfig;
  public readonly eventBus: GameEventBus;
  public roundState: RoundState;

  /** Internal: ticks elapsed in the current phase (used for intro/KO timing). */
  private phaseTickCounter: number = 0;

  /** Internal: last emitted timer value (to avoid spamming events). */
  private lastEmittedTimerSeconds: number = -1;

  constructor(
    p1Config: FighterConfig = DEFAULT_FIGHTER_CONFIG,
    p2Config: FighterConfig = DEFAULT_FIGHTER_CONFIG,
    arena: ArenaConfig = DEFAULT_ARENA,
  ) {
    this.arena = arena;
    this.eventBus = new GameEventBus();

    this.fighters = [
      new Fighter(0, p1Config, P1_SPAWN_X, arena.floorY, 'right'),
      new Fighter(1, p2Config, P2_SPAWN_X, arena.floorY, 'left'),
    ];

    this.roundState = {
      roundNumber: 1,
      wins: [0, 0],
      roundsToWin: ROUNDS_TO_WIN,
      phase: RoundPhase.INTRO,
      timerTicks: secondsToTicks(ROUND_DURATION_SECONDS),
      roundWinner: null,
    };

    this.phaseTickCounter = 0;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /**
   * Main per-tick update. Called once per fixed timestep (1/60 s).
   *
   * Tick pipeline:
   *   1. Phase gate — skip fighter updates during intro/KO/match over
   *   2. Update each fighter individually (input → physics → boxes)
   *   3. Cross-fighter resolution pass:
   *      a. Auto-facing
   *      b. Pushbox separation
   *      c. Hit detection + single-hit confirmation
   *      d. Damage application + knockback
   *   4. Round timer countdown
   *   5. Win condition checks (KO, timeout)
   *   6. Event emission (only on value change)
   */
  public tick(p1Input: InputSnapshot, p2Input: InputSnapshot): void {
    switch (this.roundState.phase) {
      case RoundPhase.INTRO:
        this.tickIntro();
        return;

      case RoundPhase.FIGHTING:
        this.tickFighting(p1Input, p2Input);
        return;

      case RoundPhase.KO:
        this.tickKO();
        return;

      case RoundPhase.MATCH_OVER:
        // No updates — waiting for external reset or menu navigation
        return;
    }
  }

  /**
   * Get a snapshot of current game state for the renderer.
   * This is a read-only view — no mutations.
   */
  public getSnapshot(): CombatSnapshot {
    return {
      fighters: [this.fighters[0].state, this.fighters[1].state],
      roundState: this.roundState,
      phase: this.roundState.phase,
    };
  }

  /**
   * Fully reset the match (all rounds, health, positions).
   */
  public resetMatch(): void {
    this.roundState = {
      roundNumber: 1,
      wins: [0, 0],
      roundsToWin: ROUNDS_TO_WIN,
      phase: RoundPhase.INTRO,
      timerTicks: secondsToTicks(ROUND_DURATION_SECONDS),
      roundWinner: null,
    };

    this.phaseTickCounter = 0;
    this.lastEmittedTimerSeconds = -1;

    this.fighters[0].resetForRound(P1_SPAWN_X, this.arena.floorY, 'right');
    this.fighters[1].resetForRound(P2_SPAWN_X, this.arena.floorY, 'left');

    this.emitRoundPhaseChanged();
    this.emitHealthChanged(0);
    this.emitHealthChanged(1);
    this.emitTimerChanged();
  }

  // ─── Phase Handlers ──────────────────────────────────────────────────────

  private tickIntro(): void {
    this.phaseTickCounter++;
    if (this.phaseTickCounter >= INTRO_DURATION_TICKS) {
      this.roundState.phase = RoundPhase.FIGHTING;
      this.phaseTickCounter = 0;
      this.emitRoundPhaseChanged();
    }
  }

  private tickFighting(p1Input: InputSnapshot, p2Input: InputSnapshot): void {
    const [p1, p2] = this.fighters;

    // ── 1. Individual fighter updates ──
    p1.update(p1Input, this.arena);
    p2.update(p2Input, this.arena);

    // ── 2. Auto-facing (both fighters face each other) ──
    p1.updateFacing(p2.state.position.x);
    p2.updateFacing(p1.state.position.x);

    // ── 3. Pushbox separation ──
    this.resolvePushboxCollision();

    // ── 4. Hit detection ──
    this.resolveHitDetection(p1, p2);
    this.resolveHitDetection(p2, p1);

    // ── 5. Round timer ──
    this.tickTimer();

    // ── 6. Win conditions ──
    this.checkWinConditions();
  }

  private tickKO(): void {
    this.phaseTickCounter++;
    if (this.phaseTickCounter >= KO_FREEZE_TICKS) {
      this.advanceRound();
    }
  }

  // ─── Pushbox Resolution ──────────────────────────────────────────────────

  /**
   * Detect and resolve pushbox overlap between the two fighters.
   * Pushes them apart symmetrically along the X axis.
   */
  private resolvePushboxCollision(): void {
    const [p1, p2] = this.fighters;
    const [deltaP1, deltaP2] = computePushboxSeparation(
      p1.state.worldPushbox,
      p2.state.worldPushbox,
    );

    if (deltaP1 !== 0 || deltaP2 !== 0) {
      p1.applyPushDisplacement(deltaP1, this.arena);
      p2.applyPushDisplacement(deltaP2, this.arena);
    }
  }

  // ─── Hit Detection ───────────────────────────────────────────────────────

  /**
   * Check if the attacker's active hitbox overlaps the defender's hurtbox.
   *
   * Single-Hit Confirmation:
   *   Each AttackInstance has a `hasHit` flag. Once it registers a hit,
   *   it cannot hit again for the remainder of that attack. This prevents
   *   multi-frame hitboxes from dealing damage every tick they overlap.
   *
   * Flow:
   *   1. Is the attacker in an active attack with a live hitbox?
   *   2. Has this attack already hit? (single-hit check)
   *   3. Does the hitbox intersect the defender's hurtbox?
   *   4. If yes → apply damage, set hasHit, emit events.
   */
  private resolveHitDetection(attacker: Fighter, defender: Fighter): void {
    const attack = attacker.state.currentAttack;

    // No active attack or no hitbox this tick
    if (!attack || !attacker.state.worldHitbox) return;

    // Single-hit confirmation: already hit this attack instance
    if (attack.hasHit) return;

    // Defender is already dead — no point hitting
    if (defender.state.state === FighterState.DEAD) return;

    // AABB intersection test: hitbox vs hurtbox
    if (!aabbIntersects(attacker.state.worldHitbox, defender.state.worldHurtbox)) {
      return;
    }

    // ── HIT CONFIRMED ──

    // 1. Mark single-hit flag
    attack.hasHit = true;

    // 2. Capture pre-damage health for event
    const prevHealth = defender.state.health;

    // 3. Apply damage + knockback to defender
    defender.receiveDamage(
      attack.config.damage,
      attack.config.knockbackX,
      attack.config.knockbackY,
      attack.config.hitstunDuration,
      attacker.state.position.x,
    );

    // 4. Emit HIT_LANDED event
    this.eventBus.emit(GameEventType.HIT_LANDED, {
      attackerIndex: attacker.state.playerIndex,
      victimIndex: defender.state.playerIndex,
      attackName: attack.config.name,
      damage: attack.config.damage,
    } satisfies HitLandedPayload);

    // 5. Emit HEALTH_CHANGED event (only if health actually changed)
    if (defender.state.health !== prevHealth) {
      this.emitHealthChanged(defender.state.playerIndex);
    }
  }

  // ─── Timer ───────────────────────────────────────────────────────────────

  private tickTimer(): void {
    if (this.roundState.timerTicks > 0) {
      this.roundState.timerTicks--;
    }

    // Emit timer event only when the displayed second changes
    const currentSeconds = ticksToSeconds(this.roundState.timerTicks);
    if (currentSeconds !== this.lastEmittedTimerSeconds) {
      this.lastEmittedTimerSeconds = currentSeconds;
      this.emitTimerChanged();
    }
  }

  // ─── Win Conditions ──────────────────────────────────────────────────────

  private checkWinConditions(): void {
    const [p1, p2] = this.fighters;

    // ── KO: one or both fighters dead ──
    if (p1.state.state === FighterState.DEAD || p2.state.state === FighterState.DEAD) {
      this.endRound(this.determineRoundWinner());
      return;
    }

    // ── Timeout: time ran out ──
    if (this.roundState.timerTicks <= 0) {
      this.endRound(this.determineRoundWinner());
    }
  }

  /**
   * Determine the winner based on remaining health.
   * If health is equal, it's a draw — P1 wins by default (house rules).
   */
  private determineRoundWinner(): 0 | 1 {
    const p1Health = this.fighters[0].state.health;
    const p2Health = this.fighters[1].state.health;

    if (p1Health > p2Health) return 0;
    if (p2Health > p1Health) return 1;

    // Draw: P1 wins by convention (could be extended to double KO)
    return 0;
  }

  private endRound(winner: 0 | 1): void {
    this.roundState.phase = RoundPhase.KO;
    this.roundState.roundWinner = winner;
    this.roundState.wins[winner]++;
    this.phaseTickCounter = 0;

    this.emitRoundPhaseChanged();
  }

  // ─── Round Advancement ───────────────────────────────────────────────────

  private advanceRound(): void {
    const { wins, roundsToWin } = this.roundState;

    // Check if someone has won the match
    if (wins[0] >= roundsToWin || wins[1] >= roundsToWin) {
      this.roundState.phase = RoundPhase.MATCH_OVER;
      this.phaseTickCounter = 0;

      const matchWinner: 0 | 1 = wins[0] >= roundsToWin ? 0 : 1;

      this.emitRoundPhaseChanged();
      this.eventBus.emit(GameEventType.MATCH_OVER, {
        winnerIndex: matchWinner,
        wins: [...this.roundState.wins] as [number, number],
      } satisfies MatchOverPayload);
      return;
    }

    // Start next round
    this.roundState.roundNumber++;
    this.roundState.phase = RoundPhase.INTRO;
    this.roundState.timerTicks = secondsToTicks(ROUND_DURATION_SECONDS);
    this.roundState.roundWinner = null;
    this.phaseTickCounter = 0;
    this.lastEmittedTimerSeconds = -1;

    // Reset fighters to spawn positions
    this.fighters[0].resetForRound(P1_SPAWN_X, this.arena.floorY, 'right');
    this.fighters[1].resetForRound(P2_SPAWN_X, this.arena.floorY, 'left');

    this.emitRoundPhaseChanged();
    this.emitHealthChanged(0);
    this.emitHealthChanged(1);
    this.emitTimerChanged();
  }

  // ─── Event Emission ──────────────────────────────────────────────────────
  // These helpers encapsulate payload construction. They are the ONLY places
  // that call eventBus.emit(), ensuring consistent payload shapes.

  private emitHealthChanged(playerIndex: 0 | 1): void {
    const fighter = this.fighters[playerIndex];
    this.eventBus.emit(GameEventType.HEALTH_CHANGED, {
      playerIndex,
      currentHealth: fighter.state.health,
      maxHealth: fighter.state.config.maxHealth,
      damage: fighter.state.config.maxHealth - fighter.state.health,
    } satisfies HealthChangedPayload);
  }

  private emitRoundPhaseChanged(): void {
    this.eventBus.emit(GameEventType.ROUND_PHASE_CHANGED, {
      phase: this.roundState.phase,
      roundNumber: this.roundState.roundNumber,
      wins: [...this.roundState.wins] as [number, number],
      roundWinner: this.roundState.roundWinner,
    } satisfies RoundPhaseChangedPayload);
  }

  private emitTimerChanged(): void {
    this.eventBus.emit(GameEventType.TIMER_CHANGED, {
      seconds: ticksToSeconds(this.roundState.timerTicks),
    } satisfies TimerChangedPayload);
  }
}

// ─── Snapshot Type (for Renderer) ────────────────────────────────────────────

import type { FighterRuntimeState } from './types';

/** Read-only snapshot of the full game state, consumed by the Renderer. */
export interface CombatSnapshot {
  fighters: [FighterRuntimeState, FighterRuntimeState];
  roundState: RoundState;
  phase: RoundPhase;
}

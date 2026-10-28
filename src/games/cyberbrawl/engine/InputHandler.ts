/**
 * Cyber Brawl — Input Handler
 *
 * Tracks simultaneous key presses for two local players using a continuous
 * key-state `Set<string>`. This eliminates OS key-repeat latency and
 * keyboard ghosting artifacts that plague naive `keypress` listeners.
 *
 * Architecture:
 *   - Raw keyboard events (`keydown`/`keyup`) toggle entries in a
 *     `Set<string>` of currently held key codes.
 *   - Each tick, `poll()` reads the raw set and maps it through each
 *     player's `KeyBindings` to produce two `InputSnapshot` sets of
 *     logical `InputAction` values.
 *   - The game loop calls `poll()` once per fixed timestep, then passes
 *     the snapshots to `CombatSystem.tick()`.
 *
 * Why `KeyboardEvent.code` instead of `key`:
 *   - `code` represents the physical key position (e.g., "KeyA"), which is
 *     layout-independent. This means AZERTY/QWERTZ users get the same
 *     physical positions as QWERTY users.
 *   - `key` varies by layout and modifier state, causing bugs with Shift.
 */

import type { InputSnapshot, KeyBindings } from './types';
import { InputAction } from './types';

// ─── Default Key Bindings ────────────────────────────────────────────────────

/**
 * Player 1: WASD + F/G
 *   W = Jump, A = Left, S = Crouch/Block, D = Right
 *   F = Punch, G = Kick
 */
export const P1_KEY_BINDINGS: KeyBindings = {
  KeyW: InputAction.UP,
  KeyA: InputAction.LEFT,
  KeyS: InputAction.DOWN,
  KeyD: InputAction.RIGHT,
  KeyF: InputAction.PUNCH,
  KeyG: InputAction.KICK,
};

/**
 * Player 2: Arrow Keys + K/L
 *   ArrowUp = Jump, ArrowLeft = Left, ArrowDown = Crouch/Block, ArrowRight = Right
 *   K = Punch, L = Kick
 */
export const P2_KEY_BINDINGS: KeyBindings = {
  ArrowUp: InputAction.UP,
  ArrowLeft: InputAction.LEFT,
  ArrowDown: InputAction.DOWN,
  ArrowRight: InputAction.RIGHT,
  KeyK: InputAction.PUNCH,
  KeyL: InputAction.KICK,
};

// ─── Input Handler Class ─────────────────────────────────────────────────────

export class InputHandler {
  /**
   * Raw set of currently held `KeyboardEvent.code` values.
   * Toggled by keydown/keyup listeners. Persists across frames.
   */
  private readonly heldKeys: Set<string> = new Set();

  /** Per-player key bindings. Index 0 = P1, Index 1 = P2. */
  private readonly bindings: [KeyBindings, KeyBindings];

  /** Bound event handler references (for cleanup). */
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private readonly onBlur: () => void;

  /** Whether the handler is currently listening to events. */
  private attached: boolean = false;

  constructor(
    p1Bindings: KeyBindings = P1_KEY_BINDINGS,
    p2Bindings: KeyBindings = P2_KEY_BINDINGS,
  ) {
    this.bindings = [p1Bindings, p2Bindings];

    // Pre-bind handlers to preserve `this` context and enable removal
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onBlur = this.handleBlur.bind(this);
  }

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  /**
   * Attach keyboard listeners to the window.
   * Safe to call multiple times — will not double-attach.
   */
  public attach(): void {
    if (this.attached) return;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);

    this.attached = true;
  }

  /**
   * Detach all keyboard listeners. Call on component unmount.
   * Clears all held keys to prevent stuck inputs.
   */
  public detach(): void {
    if (!this.attached) return;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);

    this.heldKeys.clear();
    this.attached = false;
  }

  // ─── Polling ─────────────────────────────────────────────────────────────

  /**
   * Poll the current key state and return logical input snapshots
   * for both players. Called once per fixed timestep tick.
   *
   * This method is allocation-light: it creates two small Sets per call,
   * which is negligible at 60 Hz. No arrays, no object spreads.
   *
   * @returns A tuple `[p1Input, p2Input]` of InputSnapshots.
   */
  public poll(): [InputSnapshot, InputSnapshot] {
    const p1: InputSnapshot = new Set<InputAction>();
    const p2: InputSnapshot = new Set<InputAction>();

    // Single pass over held keys — O(k) where k = number of held keys (typically 1–4)
    this.heldKeys.forEach((code) => {
      const p1Action = this.bindings[0][code];
      if (p1Action !== undefined) {
        p1.add(p1Action);
      }

      const p2Action = this.bindings[1][code];
      if (p2Action !== undefined) {
        p2.add(p2Action);
      }
    });

    return [p1, p2];
  }

  /**
   * Check if a specific raw key code is currently held.
   * Useful for non-gameplay keys (e.g., Tab for debug toggle).
   */
  public isKeyHeld(code: string): boolean {
    return this.heldKeys.has(code);
  }

  /**
   * Clear all held keys. Useful when pausing or switching focus.
   */
  public clearAll(): void {
    this.heldKeys.clear();
  }

  // ─── Event Handlers ──────────────────────────────────────────────────────

  private handleKeyDown(e: KeyboardEvent): void {
    // Prevent default for game keys to avoid browser scrolling on arrows, etc.
    if (this.isGameKey(e.code)) {
      e.preventDefault();
    }

    // Set-based: adding an already-present key is a no-op.
    // This inherently eliminates OS key-repeat — repeated keydown
    // events for a held key simply re-add the same entry.
    this.heldKeys.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
  }

  /**
   * On window blur (tab switch, Alt+Tab), clear all keys.
   * Without this, keys held during the blur would appear "stuck"
   * because the keyup event fires in the other window/tab.
   */
  private handleBlur(): void {
    this.heldKeys.clear();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  /**
   * Check if a key code is bound to any game action (either player).
   * Used to determine whether to call `preventDefault()`.
   */
  private isGameKey(code: string): boolean {
    return code in this.bindings[0] || code in this.bindings[1];
  }
}

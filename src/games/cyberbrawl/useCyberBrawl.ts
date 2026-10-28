/**
 * Cyber Brawl — React Engine Hook
 *
 * Bridges the pure TypeScript engine to React. Owns the game loop
 * (requestAnimationFrame + fixed-timestep accumulator) and exposes
 * reactive state ONLY for HUD values that actually change.
 *
 * Architecture:
 *   - Engine objects (CombatSystem, InputHandler, Renderer) live in refs
 *     and are NEVER re-created on re-render.
 *   - React state is updated ONLY via the GameEventBus (pub/sub),
 *     meaning zero setState calls in the hot render/tick path.
 *   - The rAF loop runs at display refresh rate; simulation ticks run
 *     at a fixed 60 Hz via the delta-time accumulator.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CombatSystem } from './engine/CombatSystem';
import { InputHandler } from './engine/InputHandler';
import { Renderer } from './engine/Renderer';
import { computeFixedSteps } from './engine/math';
import type {
  HealthChangedPayload,
  HitLandedPayload,
  MatchOverPayload,
  RoundPhaseChangedPayload,
  TimerChangedPayload,
} from './engine/types';
import { GameEventType, RoundPhase } from './engine/types';

// ─── HUD State (what React actually needs) ───────────────────────────────────

export interface HUDState {
  p1Health: number;
  p1MaxHealth: number;
  p2Health: number;
  p2MaxHealth: number;
  timerSeconds: number;
  roundNumber: number;
  phase: RoundPhase;
  wins: [number, number];
  roundWinner: 0 | 1 | null;
  matchWinner: 0 | 1 | null;
  debugMode: boolean;
}

const INITIAL_HUD: HUDState = {
  p1Health: 100,
  p1MaxHealth: 100,
  p2Health: 100,
  p2MaxHealth: 100,
  timerSeconds: 99,
  roundNumber: 1,
  phase: RoundPhase.INTRO,
  wins: [0, 0],
  roundWinner: null,
  matchWinner: null,
  debugMode: false,
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCyberBrawl() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hud, setHud] = useState<HUDState>(INITIAL_HUD);
  const [isRunning, setIsRunning] = useState(false);

  // Engine refs (never trigger re-renders)
  const combatRef = useRef<CombatSystem | null>(null);
  const inputRef = useRef<InputHandler | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafIdRef = useRef<number>(0);
  const accumulatorRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // ── Subscribe to engine events → update React state ──────────────────

  const subscribeEvents = useCallback((combat: CombatSystem, renderer: Renderer) => {
    const bus = combat.eventBus;

    bus.on(GameEventType.HEALTH_CHANGED, (event) => {
      const p = event.payload as HealthChangedPayload;
      setHud((prev) => {
        if (p.playerIndex === 0) {
          return { ...prev, p1Health: p.currentHealth, p1MaxHealth: p.maxHealth };
        }
        return { ...prev, p2Health: p.currentHealth, p2MaxHealth: p.maxHealth };
      });
    });

    bus.on(GameEventType.TIMER_CHANGED, (event) => {
      const p = event.payload as TimerChangedPayload;
      setHud((prev) => ({ ...prev, timerSeconds: p.seconds }));
    });

    bus.on(GameEventType.ROUND_PHASE_CHANGED, (event) => {
      const p = event.payload as RoundPhaseChangedPayload;
      setHud((prev) => ({
        ...prev,
        phase: p.phase,
        roundNumber: p.roundNumber,
        wins: p.wins,
        roundWinner: p.roundWinner,
      }));
    });

    bus.on(GameEventType.HIT_LANDED, (event) => {
      const p = event.payload as HitLandedPayload;
      renderer.triggerHitFlash(p.victimIndex);
    });

    bus.on(GameEventType.MATCH_OVER, (event) => {
      const p = event.payload as MatchOverPayload;
      setHud((prev) => ({
        ...prev,
        matchWinner: p.winnerIndex,
      }));
    });
  }, []);

  // ── Game loop ────────────────────────────────────────────────────────────

  const gameLoop = useCallback((timestamp: number) => {
    const combat = combatRef.current;
    const input = inputRef.current;
    const renderer = rendererRef.current;
    if (!combat || !input || !renderer) return;

    // Delta time in seconds
    const dt = lastTimestampRef.current === 0
      ? 1 / 60
      : (timestamp - lastTimestampRef.current) / 1000;
    lastTimestampRef.current = timestamp;

    // Fixed timestep accumulator
    const [newAcc, steps] = computeFixedSteps(dt, accumulatorRef.current);
    accumulatorRef.current = newAcc;

    // Run simulation ticks
    for (let i = 0; i < steps; i++) {
      const [p1Input, p2Input] = input.poll();
      combat.tick(p1Input, p2Input);
    }

    // Handle Tab key for debug toggle (edge-detected)
    // We check raw key state and toggle on press
    if (input.isKeyHeld('Tab')) {
      // Debounce: only toggle once per press
      if (!(input as unknown as { _tabWasHeld?: boolean })._tabWasHeld) {
        (input as unknown as { _tabWasHeld?: boolean })._tabWasHeld = true;
        renderer.toggleDebug();
        setHud((prev) => ({ ...prev, debugMode: renderer.isDebugEnabled() }));
      }
    } else {
      (input as unknown as { _tabWasHeld?: boolean })._tabWasHeld = false;
    }

    // Render
    const snapshot = combat.getSnapshot();
    renderer.render(snapshot);

    // Continue loop
    rafIdRef.current = requestAnimationFrame(gameLoop);
  }, []);

  // ── Initialize engine ────────────────────────────────────────────────────

  const initEngine = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cancel any existing loop and listeners before re-creating
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    inputRef.current?.detach();
    combatRef.current?.eventBus.clear();

    // Create engine objects
    const combat = new CombatSystem();
    const input = new InputHandler();
    const renderer = new Renderer(canvas, combat.arena);

    combatRef.current = combat;
    inputRef.current = input;
    rendererRef.current = renderer;

    // Subscribe React HUD to events
    subscribeEvents(combat, renderer);

    // Attach input listeners
    input.attach();

    // Reset HUD
    setHud({
      ...INITIAL_HUD,
      p1MaxHealth: combat.fighters[0].state.config.maxHealth,
      p2MaxHealth: combat.fighters[1].state.config.maxHealth,
      p1Health: combat.fighters[0].state.config.maxHealth,
      p2Health: combat.fighters[1].state.config.maxHealth,
    });

    // Start game loop
    accumulatorRef.current = 0;
    lastTimestampRef.current = 0;
    rafIdRef.current = requestAnimationFrame(gameLoop);
    setIsRunning(true);
  }, [gameLoop, subscribeEvents]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      inputRef.current?.detach();
      combatRef.current?.eventBus.clear();
      setIsRunning(false);
    };
  }, []);

  // ── Rematch (reset match state) ──────────────────────────────────────────

  const rematch = useCallback(() => {
    const combat = combatRef.current;
    if (!combat) return;

    combat.resetMatch();
    setHud((prev) => ({
      ...prev,
      matchWinner: null,
    }));
  }, []);

  // ── Toggle debug (from UI button) ────────────────────────────────────────

  const toggleDebug = useCallback(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.toggleDebug();
    setHud((prev) => ({ ...prev, debugMode: renderer.isDebugEnabled() }));
  }, []);

  return {
    canvasRef,
    hud,
    isRunning,
    initEngine,
    rematch,
    toggleDebug,
  };
}

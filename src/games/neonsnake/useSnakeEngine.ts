"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Direction,
  GameOverReason,
  GameStatus,
  Point,
  SnakeEngineConfig,
  SnakeGameState,
} from "./types";
import { renderSnakeCanvas } from "./renderSnake";

// ── Grid & Performance Engine Constants ─────────────────────────────────────
export const GRID_SIZE = 20;
export const TILE_SIZE = 20;
export const CANVAS_SIZE = GRID_SIZE * TILE_SIZE; // 400x400

export const DEFAULT_CONFIG: SnakeEngineConfig = {
  gridSize: GRID_SIZE,
  tileSize: TILE_SIZE,
  initialTickRate: 120, // 120ms per tick
  minTickRate: 50,      // Maximum speed cap
  speedStep: 2,         // Speed increase (-2ms interval) per food
};

const STORAGE_KEY = "neon-snake-high-score";

const DIRECTION_VECTORS: Record<Direction, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

// ── Helpers ─────────────────────────────────────────────────────────────────
function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score));
  } catch {
    /* noop */
  }
}

export function generateRandomFood(snake: Point[], gridSize: number = GRID_SIZE): Point | null {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const available: Point[] = [];

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return null; // Victory: grid is completely filled!
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

/**
 * useSnakeEngine - High-performance tick-based Snake engine.
 *
 * Implements:
 * 1. Fixed time-step accumulator with delta time.
 * 2. Multi-key input buffer preventing rapid double-turn suicides and 180° turns.
 * 3. Wall, self, and food collision rules with speed scaling.
 * 4. Zero-allocation loop with ref-based physics.
 * 5. High-performance "Fake Glow" canvas rendering strictly redrawn on tick.
 */
export function useSnakeEngine(
  config: SnakeEngineConfig = DEFAULT_CONFIG,
  onGameOverCallback?: (score: number, reason: GameOverReason) => void
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Engine Simulation Refs (Zero-allocation / Outside React Render) ──────
  const snakeRef = useRef<Point[]>([...INITIAL_SNAKE]);
  const foodRef = useRef<Point>({ x: 15, y: 10 });
  const directionRef = useRef<Direction>("RIGHT");

  // Input queue buffer (max length 2) to prevent rapid 180° double-turn self-collisions
  const inputQueueRef = useRef<Direction[]>([]);

  // Tick rate & Delta Time accumulator
  const tickRateRef = useRef<number>(config.initialTickRate);
  const lastTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const tickCountRef = useRef<number>(0);

  // Status & Score refs to avoid stale closures in requestAnimationFrame
  const statusRef = useRef<GameStatus>("IDLE");
  const scoreRef = useRef<number>(0);
  const highScoreRef = useRef<number>(0);

  // ── React State (Minimal surface: only HUD/UI indicators) ─────────────────
  const [gameState, setGameState] = useState<SnakeGameState>({
    score: 0,
    highScore: 0,
    status: "IDLE",
    speed: config.initialTickRate,
    gameOverReason: null,
  });

  // Sync high score on mount
  useEffect(() => {
    const saved = loadHighScore();
    highScoreRef.current = saved;
    setGameState((prev) => ({ ...prev, highScore: saved }));
  }, []);

  // ── High-Performance Canvas Redraw Function ───────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    renderSnakeCanvas(ctx, {
      snake: snakeRef.current,
      food: foodRef.current,
      config,
    });
  }, [config]);

  const onRenderRef = useRef<() => void>(draw);
  useEffect(() => {
    onRenderRef.current = draw;
  }, [draw]);

  // Initial draw once mounted and canvas ref is available
  useEffect(() => {
    draw();
  }, [draw]);

  // ── Loop Control Lifecycle ────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // ── Game Over Handler ─────────────────────────────────────────────────────
  const handleGameOver = useCallback(
    (reason: GameOverReason) => {
      statusRef.current = "GAME_OVER";
      stopLoop();

      setGameState((prev) => ({
        ...prev,
        status: "GAME_OVER",
        gameOverReason: reason,
      }));

      if (onGameOverCallback) {
        onGameOverCallback(scoreRef.current, reason);
      }

      // Final redraw on game over
      if (onRenderRef.current) {
        onRenderRef.current();
      }
    },
    [onGameOverCallback, stopLoop]
  );

  // ── Input Buffering & Direction Control ───────────────────────────────────
  const changeDirection = useCallback((newDir: Direction) => {
    if (statusRef.current !== "PLAYING") {
      return;
    }

    // Reference the latest intended direction
    const lastIntended =
      inputQueueRef.current.length > 0
        ? inputQueueRef.current[inputQueueRef.current.length - 1]
        : directionRef.current;

    // Reject same direction and 180-degree instant reversals
    if (newDir === lastIntended || OPPOSITE_DIRECTIONS[newDir] === lastIntended) {
      return;
    }

    // Buffer up to 2 pending turns
    if (inputQueueRef.current.length < 2) {
      inputQueueRef.current.push(newDir);
    }
  }, []);

  // ── Tick Step: Movement & Collision Detection ─────────────────────────────
  const stepTick = useCallback(() => {
    if (statusRef.current !== "PLAYING") return;

    // 1. Dequeue next buffered input direction if available
    if (inputQueueRef.current.length > 0) {
      directionRef.current = inputQueueRef.current.shift()!;
    }

    const currentDirection = directionRef.current;
    const vector = DIRECTION_VECTORS[currentDirection];
    const snake = snakeRef.current;
    const head = snake[0];

    const newHead: Point = {
      x: head.x + vector.x,
      y: head.y + vector.y,
    };

    // 2. Wall Collision Check
    if (
      newHead.x < 0 ||
      newHead.x >= config.gridSize ||
      newHead.y < 0 ||
      newHead.y >= config.gridSize
    ) {
      handleGameOver("WALL_COLLISION");
      return;
    }

    // 3. Food Collision Check
    const currentFood = foodRef.current;
    const isEating = newHead.x === currentFood.x && newHead.y === currentFood.y;

    // 4. Self Collision Check
    const checkSegmentsLimit = isEating ? snake.length : snake.length - 1;
    for (let i = 0; i < checkSegmentsLimit; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        handleGameOver("SELF_COLLISION");
        return;
      }
    }

    // 5. Update Snake Body
    const nextSnake = [newHead, ...snake];

    if (isEating) {
      // Snake grows
      const newScore = scoreRef.current + 10;
      scoreRef.current = newScore;

      // Speed up slightly
      tickRateRef.current = Math.max(
        config.minTickRate,
        tickRateRef.current - config.speedStep
      );

      // High Score persistence
      if (newScore > highScoreRef.current) {
        highScoreRef.current = newScore;
        saveHighScore(newScore);
      }

      // Generate next food position
      const nextFood = generateRandomFood(nextSnake, config.gridSize);
      if (!nextFood) {
        // Entire grid filled: Victory!
        snakeRef.current = nextSnake;
        handleGameOver("VICTORY");
        return;
      }

      foodRef.current = nextFood;
      snakeRef.current = nextSnake;

      setGameState((prev) => ({
        ...prev,
        score: newScore,
        highScore: Math.max(prev.highScore, newScore),
        speed: tickRateRef.current,
      }));
    } else {
      // Normal move: remove tail
      nextSnake.pop();
      snakeRef.current = nextSnake;
    }
  }, [
    config.gridSize,
    config.minTickRate,
    config.speedStep,
    handleGameOver,
  ]);

  // ── Delta Time Game Loop ──────────────────────────────────────────────────
  const runLoop = useCallback(
    (currentTime: number) => {
      if (statusRef.current !== "PLAYING") {
        return;
      }

      // Clamp delta time to 250ms to prevent giant leap after tab switches
      const deltaTime = Math.min(currentTime - lastTimeRef.current, 250);
      lastTimeRef.current = currentTime;
      accumulatedTimeRef.current += deltaTime;

      let ticked = false;

      // Fixed time-step accumulator
      while (accumulatedTimeRef.current >= tickRateRef.current) {
        accumulatedTimeRef.current -= tickRateRef.current;
        tickCountRef.current += 1;
        ticked = true;

        stepTick();

        if (statusRef.current !== "PLAYING") {
          break;
        }
      }

      // Extreme Performance: ONLY redraw when a tick actually occurred!
      if (ticked && onRenderRef.current) {
        onRenderRef.current();
      }

      if (statusRef.current === "PLAYING") {
        rafIdRef.current = requestAnimationFrame(runLoop);
      }
    },
    [stepTick]
  );

  const startLoop = useCallback(() => {
    stopLoop();
    lastTimeRef.current = performance.now();
    accumulatedTimeRef.current = 0;
    rafIdRef.current = requestAnimationFrame(runLoop);
  }, [runLoop, stopLoop]);

  // ── Public Engine Controls ────────────────────────────────────────────────
  const startGame = useCallback(() => {
    snakeRef.current = INITIAL_SNAKE.map((p) => ({ ...p }));
    directionRef.current = "RIGHT";
    inputQueueRef.current = [];
    const initialFood = generateRandomFood(snakeRef.current, config.gridSize);
    foodRef.current = initialFood || { x: 15, y: 10 };
    tickRateRef.current = config.initialTickRate;
    scoreRef.current = 0;
    tickCountRef.current = 0;
    statusRef.current = "PLAYING";

    setGameState((prev) => ({
      ...prev,
      score: 0,
      status: "PLAYING",
      speed: config.initialTickRate,
      gameOverReason: null,
    }));

    startLoop();

    if (onRenderRef.current) {
      onRenderRef.current();
    }
  }, [config.gridSize, config.initialTickRate, startLoop]);

  const pauseGame = useCallback(() => {
    if (statusRef.current === "PLAYING") {
      statusRef.current = "PAUSED";
      stopLoop();
      setGameState((prev) => ({ ...prev, status: "PAUSED" }));
    } else if (statusRef.current === "PAUSED") {
      statusRef.current = "PLAYING";
      setGameState((prev) => ({ ...prev, status: "PLAYING" }));
      startLoop();
    }
  }, [startLoop, stopLoop]);

  const resetGame = useCallback(() => {
    stopLoop();
    statusRef.current = "IDLE";
    snakeRef.current = INITIAL_SNAKE.map((p) => ({ ...p }));
    directionRef.current = "RIGHT";
    inputQueueRef.current = [];
    foodRef.current = { x: 15, y: 10 };
    scoreRef.current = 0;
    tickRateRef.current = config.initialTickRate;
    accumulatedTimeRef.current = 0;

    setGameState((prev) => ({
      ...prev,
      score: 0,
      status: "IDLE",
      speed: config.initialTickRate,
      gameOverReason: null,
    }));

    if (onRenderRef.current) {
      onRenderRef.current();
    }
  }, [config.initialTickRate, stopLoop]);

  // ── Keyboard Controls Listener ────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling on arrow keys & space
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      ) {
        e.preventDefault();
      }

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          changeDirection("UP");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          changeDirection("DOWN");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          changeDirection("LEFT");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          changeDirection("RIGHT");
          break;
        case " ":
          if (statusRef.current === "IDLE" || statusRef.current === "GAME_OVER") {
            startGame();
          }
          break;
        case "Enter":
          if (statusRef.current === "IDLE" || statusRef.current === "GAME_OVER") {
            startGame();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeDirection, pauseGame, startGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopLoop();
    };
  }, [stopLoop]);

  return {
    canvasRef,
    gameState,
    snakeRef,
    foodRef,
    directionRef,
    inputQueueRef,
    tickRateRef,
    tickCountRef,
    statusRef,
    scoreRef,
    highScoreRef,
    setGameState,
    saveHighScore,
    startGame,
    pauseGame,
    resetGame,
    changeDirection,
    draw,
    config,
  };
}

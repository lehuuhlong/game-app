/**
 * useTrexEngine — High-performance canvas-based T-Rex Runner engine.
 *
 * All physics & position data lives in plain mutable objects (refs).
 * Only score / highScore / isGameOver are surfaced via React state
 * to avoid per-frame re-renders.
 */

"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import type {
  Dino,
  Obstacle,
  ObstacleKind,
  Cloud,
  GroundSegment,
  TrexGameState,
  EngineConfig,
} from "./types";

// ── Constants ────────────────────────────────────────────────────────

const DEFAULT_CONFIG: EngineConfig = {
  canvasWidth: 800,
  canvasHeight: 250,
  groundY: 200,
  initialSpeed: 5,         // Faster initial speed
  maxSpeed: 20,            // Higher max speed
  speedIncrement: 0.003,   // Faster acceleration
  jumpVelocity: -12.5,
  gravity: 0.65,
  fastFallMultiplier: 2.5,
  minObstacleGap: 30,      // More obstacles
  maxObstacleGap: 120,     // Less gap between obstacles
};

const STORAGE_KEY = "trex-high-score";

const DINO_WIDTH = 48;
const DINO_HEIGHT = 42;
const DINO_DUCK_HEIGHT = 42;
const DINO_DUCK_WIDTH = 60;

// ── Helpers ──────────────────────────────────────────────────────────

function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    return parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  } catch {
    return 0;
  }
}

function saveHighScore(s: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(s));
  } catch {
    /* noop */
  }
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Drawing helpers ──────────────────────────────────────────────────

// ── Sprite Definitions ───────────────────────────────────────────────

const TREX_STAND_1 = [
  "             █████ ",
  "             ██ ██ ",
  "             ██████",
  "             ███   ",
  "             █████ ",
  "             ████  ",
  "       █████████   ",
  "      ██████████ █ ",
  " █   █████████████ ",
  " ██ ████████████   ",
  " ██████████████    ",
  "  ████████████     ",
  "   ██████████      ",
  "     ███   ██      ",
  "     ██    ██      ",
  "     ███   ███     "
];

const TREX_STAND_2 = [
  "             █████ ",
  "             ██ ██ ",
  "             ██████",
  "             ███   ",
  "             █████ ",
  "             ████  ",
  "       █████████   ",
  "      ██████████ █ ",
  " █   █████████████ ",
  " ██ ████████████   ",
  " ██████████████    ",
  "  ████████████     ",
  "   ██████████      ",
  "     ██    ███     ",
  "     ██      ██    ",
  "     ███     ███   "
];

const TREX_DUCK_1 = [
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "               ████",
  "               ██ █",
  "        ███████████",
  "       ████████████",
  " █   ████████████  ",
  " ██████████████    ",
  "   ██████████      ",
  "     ██    ██      ",
  "     ███   ███     "
];

const TREX_DUCK_2 = [
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "                   ",
  "               ████",
  "               ██ █",
  "        ███████████",
  "       ████████████",
  " █   ████████████  ",
  " ██████████████    ",
  "   ██████████      ",
  "     ███   ███     ",
  "      ██    ██     "
];

function drawSprite(ctx: CanvasRenderingContext2D, x: number, y: number, sprite: string[], scale: number = 3) {
  ctx.fillStyle = "#535353";
  for (let r = 0; r < sprite.length; r++) {
    for (let c = 0; c < sprite[r].length; c++) {
      if (sprite[r][c] === "█") {
        ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
      }
    }
  }
}

function drawDino(ctx: CanvasRenderingContext2D, d: Dino) {
  const legPhase = Math.floor(d.frameCount / 5) % 2;

  let sprite = TREX_STAND_1;
  if (d.isDucking) {
    sprite = legPhase === 0 ? TREX_DUCK_1 : TREX_DUCK_2;
  } else if (!d.isJumping) {
    sprite = legPhase === 0 ? TREX_STAND_1 : TREX_STAND_2;
  }

  drawSprite(ctx, d.x, d.y, sprite, 3);
}

function drawCactus(
  ctx: CanvasRenderingContext2D,
  o: Obstacle
) {
  ctx.fillStyle = "#535353";
  if (o.kind === "cactus-small") {
    // Main trunk
    ctx.fillRect(o.x + 6, o.y, 8, o.height);
    // Left arm
    ctx.fillRect(o.x, o.y + 10, 8, 4);
    ctx.fillRect(o.x, o.y + 4, 4, 10);
    // Right arm
    ctx.fillRect(o.x + 12, o.y + 16, 8, 4);
    ctx.fillRect(o.x + 16, o.y + 10, 4, 10);
  } else {
    // Large cactus
    ctx.fillRect(o.x + 8, o.y, 10, o.height);
    // Left arm
    ctx.fillRect(o.x, o.y + 14, 10, 5);
    ctx.fillRect(o.x, o.y + 6, 5, 13);
    // Right arm
    ctx.fillRect(o.x + 16, o.y + 22, 10, 5);
    ctx.fillRect(o.x + 22, o.y + 14, 5, 13);
  }
}

function drawPterodactyl(
  ctx: CanvasRenderingContext2D,
  o: Obstacle
) {
  ctx.fillStyle = "#535353";
  const wingPhase = Math.floor(o.frameCount / 8) % 2;
  // Body
  ctx.fillRect(o.x + 4, o.y + 10, o.width - 8, 8);
  // Beak
  ctx.fillRect(o.x + o.width - 4, o.y + 12, 10, 4);
  // Wings
  if (wingPhase === 0) {
    // Wings up
    ctx.fillRect(o.x + 8, o.y, 6, 12);
    ctx.fillRect(o.x + 14, o.y - 4, 8, 6);
  } else {
    // Wings down
    ctx.fillRect(o.x + 8, o.y + 16, 6, 12);
    ctx.fillRect(o.x + 14, o.y + 24, 8, 6);
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, c: Cloud) {
  ctx.fillStyle = "#e0e0e0";
  ctx.beginPath();
  ctx.ellipse(c.x + 20, c.y + 10, 20, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(c.x + 40, c.y + 8, 16, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(c.x + 55, c.y + 12, 12, 7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(
  ctx: CanvasRenderingContext2D,
  segments: GroundSegment[],
  groundY: number,
  canvasWidth: number
) {
  ctx.strokeStyle = "#535353";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvasWidth, groundY);
  ctx.stroke();

  // Small random bumps
  for (const seg of segments) {
    const bx = seg.x;
    ctx.fillStyle = "#b0b0b0";
    ctx.fillRect(bx, groundY + 3, 3, 1);
    ctx.fillRect(bx + 8, groundY + 5, 5, 1);
    ctx.fillRect(bx + 18, groundY + 3, 2, 1);
  }
}

function drawScore(
  ctx: CanvasRenderingContext2D,
  score: number,
  highScore: number,
  canvasWidth: number
) {
  ctx.fillStyle = "#535353";
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "right";
  const s = String(Math.floor(score)).padStart(5, "0");
  if (highScore > 0) {
    const hs = String(Math.floor(highScore)).padStart(5, "0");
    ctx.fillText(`HI ${hs}  ${s}`, canvasWidth - 12, 24);
  } else {
    ctx.fillText(s, canvasWidth - 12, 24);
  }
}

// ── Collision Detection ──────────────────────────────────────────────

function checkCollision(dino: Dino, obs: Obstacle): boolean {
  // Shrink hitboxes slightly for forgiveness
  const pad = 6;
  const dx = dino.x + pad;
  const dy = dino.y + pad;
  const dw = dino.width - pad * 2;
  const dh = dino.height - pad;

  const ox = obs.x + 4;
  const oy = obs.y + 4;
  const ow = obs.width - 8;
  const oh = obs.height - 4;

  return dx < ox + ow && dx + dw > ox && dy < oy + oh && dy + dh > oy;
}

// ── Main Hook ────────────────────────────────────────────────────────

export function useTrexEngine(config: Partial<EngineConfig> = {}) {
  // Memoize config to prevent recreating gameLoop on every render
  const cfg = useRef({ ...DEFAULT_CONFIG, ...config }).current;

  // React state (only updated on meaningful events, not every frame)
  const [gameState, setGameState] = useState<TrexGameState>({
    score: 0,
    highScore: loadHighScore(),
    isGameOver: false,
    isPlaying: false,
  });

  // Canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // ── Mutable engine state (never triggers re-renders) ────────────
  const dino = useRef<Dino>({
    x: 50,
    y: cfg.groundY - DINO_HEIGHT,
    width: DINO_WIDTH,
    height: DINO_HEIGHT,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
    frameCount: 0,
  });

  const obstacles = useRef<Obstacle[]>([]);
  const clouds = useRef<Cloud[]>([]);
  const ground = useRef<GroundSegment[]>([]);
  const speed = useRef(cfg.initialSpeed);
  const framesSinceObstacle = useRef(0);
  const nextObstacleAt = useRef(randomBetween(cfg.minObstacleGap, cfg.maxObstacleGap));
  const scoreRef = useRef(0);
  const highScoreRef = useRef(loadHighScore());
  const isPlayingRef = useRef(false);
  const isGameOverRef = useRef(false);
  const lastScoreFlash = useRef(-1);

  // Input tracking (mutable, avoids stale closures)
  const keys = useRef<Set<string>>(new Set());

  // ── Reset all mutable state ────────────────────────────────────
  const resetEngine = useCallback(() => {
    const d = dino.current;
    d.x = 50;
    d.y = cfg.groundY - DINO_HEIGHT;
    d.width = DINO_WIDTH;
    d.height = DINO_HEIGHT;
    d.velocityY = 0;
    d.isJumping = false;
    d.isDucking = false;
    d.frameCount = 0;

    obstacles.current = [];
    clouds.current = [];
    speed.current = cfg.initialSpeed;
    framesSinceObstacle.current = 0;
    nextObstacleAt.current = randomBetween(cfg.minObstacleGap, cfg.maxObstacleGap);
    scoreRef.current = 0;
    isGameOverRef.current = false;
    lastScoreFlash.current = -1;

    // Init ground segments
    ground.current = [];
    for (let x = 0; x < cfg.canvasWidth + 40; x += 30) {
      ground.current.push({ x });
    }

    // Init some clouds
    clouds.current = [
      { x: 100, y: 30, width: 70 },
      { x: 350, y: 50, width: 60 },
      { x: 600, y: 25, width: 75 },
    ];
  }, [cfg.groundY, cfg.canvasWidth, cfg.initialSpeed, cfg.minObstacleGap, cfg.maxObstacleGap]);

  // ── Spawn an obstacle ──────────────────────────────────────────
  const spawnObstacle = useCallback(() => {
    const kinds: ObstacleKind[] = ["cactus-small", "cactus-large"];
    if (speed.current > 7) kinds.push("pterodactyl");

    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    let obs: Obstacle;

    switch (kind) {
      case "cactus-small":
        obs = {
          x: cfg.canvasWidth,
          y: cfg.groundY - 34,
          width: 20,
          height: 34,
          kind,
          frameCount: 0,
          scored: false,
        };
        break;
      case "cactus-large":
        obs = {
          x: cfg.canvasWidth,
          y: cfg.groundY - 48,
          width: 28,
          height: 48,
          kind,
          frameCount: 0,
          scored: false,
        };
        break;
      case "pterodactyl": {
        const heights = [cfg.groundY - 60, cfg.groundY - 36, cfg.groundY - 80];
        obs = {
          x: cfg.canvasWidth,
          y: heights[Math.floor(Math.random() * heights.length)],
          width: 38,
          height: 28,
          kind,
          frameCount: 0,
          scored: false,
        };
        break;
      }
    }

    obstacles.current.push(obs);
  }, [cfg.canvasWidth, cfg.groundY]);

  // ── Game loop ──────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (isGameOverRef.current || !isPlayingRef.current) return;

    const d = dino.current;
    const spd = speed.current;

    // ── Input ──────────────────────────────────────────────────
    const wantsJump =
      keys.current.has("Space") ||
      keys.current.has("ArrowUp") ||
      keys.current.has("KeyW");
    const wantsDuck =
      keys.current.has("ArrowDown") || keys.current.has("KeyS");

    // ── Dino physics ───────────────────────────────────────────
    if (wantsJump && !d.isJumping && !d.isDucking) {
      d.velocityY = cfg.jumpVelocity;
      d.isJumping = true;
    }

    if (d.isJumping) {
      let grav = cfg.gravity;
      if (wantsDuck && d.velocityY < 0) {
        grav *= cfg.fastFallMultiplier;
      }
      d.velocityY += grav;
      d.y += d.velocityY;

      const standY = cfg.groundY - (wantsDuck ? DINO_DUCK_HEIGHT : DINO_HEIGHT);
      if (d.y >= standY) {
        d.y = standY;
        d.velocityY = 0;
        d.isJumping = false;
      }
    }

    // Duck handling
    if (wantsDuck && !d.isJumping) {
      d.isDucking = true;
      d.height = DINO_DUCK_HEIGHT;
      d.width = DINO_DUCK_WIDTH;
      d.y = cfg.groundY - DINO_DUCK_HEIGHT;
    } else {
      if (d.isDucking && !d.isJumping) {
        d.y = cfg.groundY - DINO_HEIGHT;
      }
      d.isDucking = false;
      d.height = DINO_HEIGHT;
      d.width = DINO_WIDTH;
    }

    d.frameCount++;

    // ── Obstacles ──────────────────────────────────────────────
    framesSinceObstacle.current++;
    if (framesSinceObstacle.current >= nextObstacleAt.current) {
      spawnObstacle();
      framesSinceObstacle.current = 0;
      nextObstacleAt.current = randomBetween(
        Math.max(30, cfg.minObstacleGap - Math.floor(spd)),
        Math.max(60, cfg.maxObstacleGap - Math.floor(spd * 2))
      );
    }

    for (let i = obstacles.current.length - 1; i >= 0; i--) {
      const o = obstacles.current[i];
      o.x -= spd;
      o.frameCount++;

      // Score when passed
      if (!o.scored && o.x + o.width < d.x) {
        o.scored = true;
        scoreRef.current += 1;
      }

      // Remove off-screen
      if (o.x + o.width < -20) {
        obstacles.current.splice(i, 1);
        continue;
      }

      // Collision
      if (checkCollision(d, o)) {
        isGameOverRef.current = true;
        isPlayingRef.current = false;
        if (scoreRef.current > highScoreRef.current) {
          highScoreRef.current = scoreRef.current;
          saveHighScore(highScoreRef.current);
        }
        setGameState({
          score: scoreRef.current,
          highScore: highScoreRef.current,
          isGameOver: true,
          isPlaying: false,
        });
        // Draw final frame with game over
        renderFrame(ctx, canvas.width, canvas.height);
        return;
      }
    }

    // ── Clouds ─────────────────────────────────────────────────
    for (const c of clouds.current) {
      c.x -= spd * 0.3;
      if (c.x + c.width < -20) {
        c.x = cfg.canvasWidth + randomBetween(20, 100);
        c.y = randomBetween(20, 70);
      }
    }

    // ── Ground scroll ──────────────────────────────────────────
    for (const g of ground.current) {
      g.x -= spd;
      if (g.x < -30) {
        g.x += cfg.canvasWidth + 60;
      }
    }

    // ── Speed increase ─────────────────────────────────────────
    if (speed.current < cfg.maxSpeed) {
      speed.current += cfg.speedIncrement;
    }

    // ── Score flash (update React state every 10 points) ──────
    const scoreTen = Math.floor(scoreRef.current / 10);
    if (scoreTen > lastScoreFlash.current) {
      lastScoreFlash.current = scoreTen;
      setGameState((prev) => ({
        ...prev,
        score: scoreRef.current,
      }));
    }

    // ── Render ─────────────────────────────────────────────────
    renderFrame(ctx, canvas.width, canvas.height);

    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [cfg, spawnObstacle]);

  // ── Render a single frame ──────────────────────────────────────
  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);

      // Clouds
      for (const c of clouds.current) drawCloud(ctx, c);

      // Ground
      drawGround(ctx, ground.current, cfg.groundY, cfg.canvasWidth);

      // Obstacles
      for (const o of obstacles.current) {
        if (o.kind === "pterodactyl") drawPterodactyl(ctx, o);
        else drawCactus(ctx, o);
      }

      // Dino
      drawDino(ctx, dino.current);

      // Score
      drawScore(ctx, scoreRef.current, highScoreRef.current, cfg.canvasWidth);

      // Game over text
      if (isGameOverRef.current) {
        ctx.fillStyle = "#535353";
        ctx.font = "bold 20px monospace";
        ctx.textAlign = "center";
        ctx.fillText("G A M E   O V E R", w / 2, h / 2 - 20);

        ctx.font = "14px monospace";
        ctx.fillText("Press Space or Tap to restart", w / 2, h / 2 + 10);
      }
    },
    [cfg.groundY, cfg.canvasWidth]
  );

  // ── Start / Restart ────────────────────────────────────────────
  const startGame = useCallback(() => {
    resetEngine();
    isPlayingRef.current = true;
    isGameOverRef.current = false;
    setGameState({
      score: 0,
      highScore: highScoreRef.current,
      isGameOver: false,
      isPlaying: true,
    });

    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [resetEngine, gameLoop]);

  // ── Draw idle frame (before first play) ────────────────────────
  const drawIdleFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    resetEngine();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGround(ctx, ground.current, cfg.groundY, cfg.canvasWidth);
    for (const c of clouds.current) drawCloud(ctx, c);
    drawDino(ctx, dino.current);
    drawScore(ctx, 0, highScoreRef.current, cfg.canvasWidth);

    ctx.fillStyle = "#535353";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Press Space or Tap to start", canvas.width / 2, canvas.height / 2);
  }, [resetEngine, cfg.groundY, cfg.canvasWidth]);

  // ── Key handlers ───────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      keys.current.add(e.code);

      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown"
      ) {
        e.preventDefault();
      }

      if (
        (e.code === "Space" || e.code === "ArrowUp") &&
        !isPlayingRef.current
      ) {
        startGame();
      }
    },
    [startGame]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keys.current.delete(e.code);
  }, []);

  // ── Touch handler (mobile) ─────────────────────────────────────
  const handleTouch = useCallback(() => {
    if (!isPlayingRef.current) {
      startGame();
      return;
    }
    // Simulate jump
    const d = dino.current;
    if (!d.isJumping) {
      d.velocityY = cfg.jumpVelocity;
      d.isJumping = true;
    }
  }, [startGame, cfg.jumpVelocity]);

  // ── Lifecycle ──────────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Clean up animation frame ONLY on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Draw idle frame once on mount
  useEffect(() => {
    const t = setTimeout(drawIdleFrame, 50);
    return () => clearTimeout(t);
  }, [drawIdleFrame]);

  return {
    canvasRef,
    gameState,
    startGame,
    handleTouch,
    config: cfg,
  };
}

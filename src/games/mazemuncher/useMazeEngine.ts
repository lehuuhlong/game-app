"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  INITIAL_MAZE_MAP,
  PALETTE,
  TILE_SIZE,
  MAZE_COLS,
  MAZE_ROWS,
  MUNCHER_START_POS,
  MUNCHER_SPEED,
  MUNCHER_RADIUS,
  TURN_THRESHOLD,
  CHASER_SPEED,
  CHASER_FRIGHTENED_SPEED,
  CHASER_RADIUS,
  INITIAL_CHASERS,
} from "./constants";
import {
  ChaserEntity,
  Direction,
  EngineConfig,
  FloatingParticle,
  GameState,
  MuncherEntity,
  TileType,
} from "./types";
import { sfx } from "./audio";

/**
 * Checks if a given tile cell allows Muncher movement in the target direction.
 */
function canMoveInDir(
  col: number,
  row: number,
  dir: Direction,
  map: TileType[][]
): boolean {
  if (dir === "NONE") return false;
  let targetCol = col;
  let targetRow = row;

  if (dir === "LEFT") targetCol = col - 1;
  else if (dir === "RIGHT") targetCol = col + 1;
  else if (dir === "UP") targetRow = row - 1;
  else if (dir === "DOWN") targetRow = row + 1;

  // Tunnel wrap-around corridors (Row 10)
  if (row === 10 && (targetCol < 0 || targetCol >= MAZE_COLS)) {
    return true;
  }

  if (
    targetCol < 0 ||
    targetCol >= MAZE_COLS ||
    targetRow < 0 ||
    targetRow >= MAZE_ROWS
  ) {
    return false;
  }

  // Prevent Muncher from entering the Chaser base door (Row 9, cols 8..10)
  if (
    targetRow === 9 &&
    targetCol >= 8 &&
    targetCol <= 10 &&
    dir === "DOWN"
  ) {
    return false;
  }

  // Prevent Muncher from entering inside Chaser base
  if (
    (targetRow === 10 || targetRow === 11) &&
    targetCol >= 8 &&
    targetCol <= 10
  ) {
    return false;
  }

  return map[targetRow][targetCol] !== 1;
}

/**
 * Checks if a given tile cell allows Chaser movement.
 */
function canChaserMoveInDir(
  col: number,
  row: number,
  dir: Direction,
  map: TileType[][],
  isLeavingBase: boolean
): boolean {
  if (dir === "NONE") return false;
  let targetCol = col;
  let targetRow = row;

  if (dir === "LEFT") targetCol = col - 1;
  else if (dir === "RIGHT") targetCol = col + 1;
  else if (dir === "UP") targetRow = row - 1;
  else if (dir === "DOWN") targetRow = row + 1;

  if (row === 10 && (targetCol < 0 || targetCol >= MAZE_COLS)) {
    return true;
  }

  if (
    targetCol < 0 ||
    targetCol >= MAZE_COLS ||
    targetRow < 0 ||
    targetRow >= MAZE_ROWS
  ) {
    return false;
  }

  // Wall collision
  if (map[targetRow][targetCol] === 1) return false;

  // Chaser base door: allow UP through gate when leaving base, otherwise forbidden
  if (targetRow === 9 && (targetCol === 8 || targetCol === 9 || targetCol === 10)) {
    if (isLeavingBase && dir === "UP") return true;
    return false;
  }

  return true;
}

function isOpposite(d1: Direction, d2: Direction): boolean {
  return (
    (d1 === "UP" && d2 === "DOWN") ||
    (d1 === "DOWN" && d2 === "UP") ||
    (d1 === "LEFT" && d2 === "RIGHT") ||
    (d1 === "RIGHT" && d2 === "LEFT")
  );
}

const ALL_DIRECTIONS: Direction[] = ["UP", "LEFT", "DOWN", "RIGHT"];

export function useMazeEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Deep clone initial map to hold dynamic pellet state
  const mazeMapRef = useRef<TileType[][]>(
    INITIAL_MAZE_MAP.map((row) => [...row])
  );

  const halfTile = TILE_SIZE / 2;

  // Muncher entity
  const muncherRef = useRef<MuncherEntity>({
    x: MUNCHER_START_POS.col * TILE_SIZE + halfTile,
    y: MUNCHER_START_POS.row * TILE_SIZE + halfTile,
    dir: "NONE",
    bufferedDir: "NONE",
    speed: MUNCHER_SPEED,
    isMoving: false,
    radius: MUNCHER_RADIUS,
  });

  // Chasers entities
  const chasersRef = useRef<ChaserEntity[]>(
    INITIAL_CHASERS.map((c) => ({
      id: c.id,
      name: c.name,
      x: c.baseCol * TILE_SIZE + halfTile,
      y: c.baseRow * TILE_SIZE + halfTile,
      dir: c.id === 0 ? "LEFT" : "UP",
      state: "CHASE",
      color: c.color,
      speed: CHASER_SPEED,
      radius: CHASER_RADIUS,
      baseCol: c.baseCol,
      baseRow: c.baseRow,
      isInBase: c.isInBase,
      spawnDelay: c.spawnDelay,
    }))
  );

  const roundStartTimeRef = useRef(Date.now());
  const pauseUntilRef = useRef(0); // brief pause after losing life

  // Score & interaction refs
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const initialPelletCount = useRef(
    INITIAL_MAZE_MAP.reduce(
      (acc, row) =>
        acc + row.filter((tile) => tile === 2 || tile === 3).length,
      0
    )
  ).current;
  const pelletsRemainingRef = useRef(initialPelletCount);
  const scoreDirtyRef = useRef(false);
  const lastSyncTickRef = useRef(0);

  // Frightened state timer
  const frightenedEndTimeRef = useRef(0);
  const prevFrightenedRef = useRef(false);

  // Floating particles
  const particlesRef = useRef<FloatingParticle[]>([]);

  // Sound mute state
  const [isMuted, setIsMuted] = useState(() => sfx.getIsMuted());

  // React UI state
  const [gameState, setGameState] = useState<GameState>(() => {
    let localHighScore = 0;
    if (typeof window !== "undefined") {
      localHighScore = Number.parseInt(
        localStorage.getItem("mazemuncher_high_score") || "0",
        10
      );
    }
    return {
      score: 0,
      highScore: Number.isNaN(localHighScore) ? 0 : localHighScore,
      lives: 3,
      pelletsRemaining: initialPelletCount,
      totalPellets: initialPelletCount,
      isGameOver: false,
      isGameWon: false,
      isFrightened: false,
      frightenedTimeRemaining: 0,
      isPaused: false,
      gameStarted: false,
    };
  });

  const config: EngineConfig = {
    cols: MAZE_COLS,
    rows: MAZE_ROWS,
    tileSize: TILE_SIZE,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };

  // ── Reset Positions (after life lost or round restart) ─────────────
  const resetEntityPositions = useCallback(() => {
    muncherRef.current = {
      x: MUNCHER_START_POS.col * TILE_SIZE + halfTile,
      y: MUNCHER_START_POS.row * TILE_SIZE + halfTile,
      dir: "NONE",
      bufferedDir: "NONE",
      speed: MUNCHER_SPEED,
      isMoving: false,
      radius: MUNCHER_RADIUS,
    };

    chasersRef.current = INITIAL_CHASERS.map((c) => ({
      id: c.id,
      name: c.name,
      x: c.baseCol * TILE_SIZE + halfTile,
      y: c.baseRow * TILE_SIZE + halfTile,
      dir: c.id === 0 ? "LEFT" : "UP",
      state: "CHASE",
      color: c.color,
      speed: CHASER_SPEED,
      radius: CHASER_RADIUS,
      baseCol: c.baseCol,
      baseRow: c.baseRow,
      isInBase: c.isInBase,
      spawnDelay: c.spawnDelay,
    }));

    roundStartTimeRef.current = Date.now();
    pauseUntilRef.current = Date.now() + 1000;
  }, [halfTile]);

  // ── Toggle Mute ───────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    const muted = sfx.toggleMute();
    setIsMuted(muted);
  }, []);

  // ── Input handler: buffers next directional intent ─────────────────
  const handleDirectionInput = useCallback((dir: Direction) => {
    if (dir === "NONE") return;
    muncherRef.current.bufferedDir = dir;

    setGameState((prev) => (prev.gameStarted ? prev : { ...prev, gameStarted: true }));
  }, []);

  // ── Keyboard event listeners ───────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dir: Direction | null = null;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dir = "UP";
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dir = "DOWN";
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dir = "LEFT";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dir = "RIGHT";
          break;
      }

      if (dir) {
        e.preventDefault();
        handleDirectionInput(dir);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDirectionInput]);

  // ── Pellet & Power-Pellet Interactions ────────────────────────────
  const checkPelletCollisions = useCallback(() => {
    const m = muncherRef.current;
    const map = mazeMapRef.current;

    const cellCol = Math.floor(m.x / TILE_SIZE);
    const cellRow = Math.floor(m.y / TILE_SIZE);

    if (
      cellCol >= 0 &&
      cellCol < MAZE_COLS &&
      cellRow >= 0 &&
      cellRow < MAZE_ROWS
    ) {
      const tile = map[cellRow][cellCol];
      const centerX = cellCol * TILE_SIZE + halfTile;
      const centerY = cellRow * TILE_SIZE + halfTile;
      const dist = Math.hypot(m.x - centerX, m.y - centerY);

      if (dist <= halfTile * 0.75) {
        if (tile === 2) {
          map[cellRow][cellCol] = 0;
          scoreRef.current += 10;
          pelletsRemainingRef.current -= 1;
          scoreDirtyRef.current = true;
          sfx.playMunch();

          particlesRef.current.push({
            x: centerX,
            y: centerY,
            vy: -0.6,
            color: "#fde047",
            alpha: 1,
            scale: 2.5,
            lifetime: 14,
            age: 0,
          });
        } else if (tile === 3) {
          map[cellRow][cellCol] = 0;
          scoreRef.current += 50;
          pelletsRemainingRef.current -= 1;
          scoreDirtyRef.current = true;

          // Activate Frightened State for 7 seconds
          frightenedEndTimeRef.current = performance.now() + 7000;
          sfx.playPowerPellet();

          // Flip all active non-respawning Chasers to FRIGHTENED and reverse
          chasersRef.current.forEach((c) => {
            if (c.state !== "RESPAWNING") {
              c.state = "FRIGHTENED";
              c.speed = CHASER_FRIGHTENED_SPEED;
              // Reverse direction on frightened trigger
              if (c.dir === "UP") c.dir = "DOWN";
              else if (c.dir === "DOWN") c.dir = "UP";
              else if (c.dir === "LEFT") c.dir = "RIGHT";
              else if (c.dir === "RIGHT") c.dir = "LEFT";
            }
          });

          particlesRef.current.push({
            x: centerX,
            y: centerY,
            vy: -1.2,
            text: "+50",
            color: "#38bdf8",
            alpha: 1,
            scale: 1,
            lifetime: 40,
            age: 0,
          });
        }

        // Check Victory Condition: all pellets consumed
        if (pelletsRemainingRef.current <= 0) {
          sfx.playWin();
          setGameState((prev) => ({ ...prev, isGameWon: true }));
        }
      }
    }
  }, [halfTile]);

  // ── Muncher Movement ──────────────────────────────────────────────
  const updateMuncher = useCallback(() => {
    const m = muncherRef.current;
    const map = mazeMapRef.current;
    const speed = m.speed;

    if (m.bufferedDir !== "NONE" && isOpposite(m.dir, m.bufferedDir)) {
      m.dir = m.bufferedDir;
      m.bufferedDir = "NONE";
      m.isMoving = true;
    }

    const cellCol = Math.floor(m.x / TILE_SIZE);
    const cellRow = Math.floor(m.y / TILE_SIZE);
    const centerCellX = cellCol * TILE_SIZE + halfTile;
    const centerCellY = cellRow * TILE_SIZE + halfTile;

    if (m.dir === "NONE") {
      if (m.bufferedDir !== "NONE") {
        if (canMoveInDir(cellCol, cellRow, m.bufferedDir, map)) {
          m.dir = m.bufferedDir;
          m.bufferedDir = "NONE";
          m.isMoving = true;
        }
      }
      return;
    }

    if (m.dir === "LEFT" || m.dir === "RIGHT") {
      m.y = centerCellY;
      const distX = m.x - centerCellX;

      if (
        (m.bufferedDir === "UP" || m.bufferedDir === "DOWN") &&
        Math.abs(distX) <= TURN_THRESHOLD
      ) {
        if (canMoveInDir(cellCol, cellRow, m.bufferedDir, map)) {
          m.x = centerCellX;
          m.dir = m.bufferedDir;
          m.bufferedDir = "NONE";
          m.isMoving = true;
          return;
        }
      }

      if (m.dir === "RIGHT") {
        if (!canMoveInDir(cellCol, cellRow, "RIGHT", map) && m.x >= centerCellX) {
          m.x = centerCellX;
          m.isMoving = false;
        } else {
          m.x += speed;
          m.isMoving = true;
        }
      } else if (m.dir === "LEFT") {
        if (!canMoveInDir(cellCol, cellRow, "LEFT", map) && m.x <= centerCellX) {
          m.x = centerCellX;
          m.isMoving = false;
        } else {
          m.x -= speed;
          m.isMoving = true;
        }
      }
    } else if (m.dir === "UP" || m.dir === "DOWN") {
      m.x = centerCellX;
      const distY = m.y - centerCellY;

      if (
        (m.bufferedDir === "LEFT" || m.bufferedDir === "RIGHT") &&
        Math.abs(distY) <= TURN_THRESHOLD
      ) {
        if (canMoveInDir(cellCol, cellRow, m.bufferedDir, map)) {
          m.y = centerCellY;
          m.dir = m.bufferedDir;
          m.bufferedDir = "NONE";
          m.isMoving = true;
          return;
        }
      }

      if (m.dir === "DOWN") {
        if (!canMoveInDir(cellCol, cellRow, "DOWN", map) && m.y >= centerCellY) {
          m.y = centerCellY;
          m.isMoving = false;
        } else {
          m.y += speed;
          m.isMoving = true;
        }
      } else if (m.dir === "UP") {
        if (!canMoveInDir(cellCol, cellRow, "UP", map) && m.y <= centerCellY) {
          m.y = centerCellY;
          m.isMoving = false;
        } else {
          m.y -= speed;
          m.isMoving = true;
        }
      }
    }

    if (m.x < -halfTile) {
      m.x = CANVAS_WIDTH + halfTile - 2;
    } else if (m.x > CANVAS_WIDTH + halfTile) {
      m.x = -halfTile + 2;
    }
  }, [halfTile]);

  // ── Chaser AI Movement & Pathfinding ──────────────────────────────
  const updateChasers = useCallback(
    (isFrightened: boolean) => {
      const now = Date.now();
      const elapsedRound = now - roundStartTimeRef.current;
      const map = mazeMapRef.current;
      const m = muncherRef.current;
      const muncherCol = Math.floor(m.x / TILE_SIZE);
      const muncherRow = Math.floor(m.y / TILE_SIZE);

      chasersRef.current.forEach((chaser) => {
        // Handle Frightened state recovery
        if (!isFrightened && chaser.state === "FRIGHTENED") {
          chaser.state = "CHASE";
          chaser.speed = CHASER_SPEED;
        }

        // Handle leaving base after initial spawn delay
        if (chaser.isInBase) {
          if (elapsedRound < chaser.spawnDelay) {
            // Bob up and down inside base
            chaser.y = chaser.baseRow * TILE_SIZE + halfTile + Math.sin(now * 0.005) * 3;
            return;
          }

          // Guide towards door (col 9, row 8)
          const targetX = 9 * TILE_SIZE + halfTile;
          const targetY = 8 * TILE_SIZE + halfTile;

          if (Math.abs(chaser.x - targetX) > 1) {
            chaser.x += chaser.x < targetX ? 1.5 : -1.5;
            chaser.dir = chaser.x < targetX ? "RIGHT" : "LEFT";
          } else if (chaser.y > targetY) {
            chaser.y -= 1.5;
            chaser.dir = "UP";
          } else {
            chaser.isInBase = false;
            chaser.y = targetY;
            chaser.dir = chaser.id % 2 === 0 ? "LEFT" : "RIGHT";
          }
          return;
        }

        // Standard Corridor Movement & Intersection AI
        const curCol = Math.floor(chaser.x / TILE_SIZE);
        const curRow = Math.floor(chaser.y / TILE_SIZE);
        const cellCenterX = curCol * TILE_SIZE + halfTile;
        const cellCenterY = curRow * TILE_SIZE + halfTile;

        // Check if Chaser is at cell center to make pathfinding decision
        const distToCenter = Math.hypot(chaser.x - cellCenterX, chaser.y - cellCenterY);

        if (distToCenter <= chaser.speed) {
          chaser.x = cellCenterX;
          chaser.y = cellCenterY;

          // Determine target tile based on personality and state
          let targetCol = muncherCol;
          let targetRow = muncherRow;

          if (chaser.state === "FRIGHTENED") {
            // Move randomly or away from Muncher
            targetCol = Math.floor(Math.random() * MAZE_COLS);
            targetRow = Math.floor(Math.random() * MAZE_ROWS);
          } else {
            // Distinct AI Personalities:
            if (chaser.id === 0) {
              // Crimson: Aggressive - directly targets Muncher tile
              targetCol = muncherCol;
              targetRow = muncherRow;
            } else if (chaser.id === 1) {
              // Pinky: Ambush - targets 2 tiles ahead of Muncher
              if (m.dir === "UP") targetRow = Math.max(0, muncherRow - 2);
              else if (m.dir === "DOWN") targetRow = Math.min(MAZE_ROWS - 1, muncherRow + 2);
              else if (m.dir === "LEFT") targetCol = Math.max(0, muncherCol - 2);
              else if (m.dir === "RIGHT") targetCol = Math.min(MAZE_COLS - 1, muncherCol + 2);
            } else if (chaser.id === 2) {
              // Azure: Patrol flanker - alternates between Muncher and bottom-left corner
              const distToMuncher = Math.hypot(curCol - muncherCol, curRow - muncherRow);
              if (distToMuncher > 6) {
                targetCol = muncherCol;
                targetRow = muncherRow;
              } else {
                targetCol = 1;
                targetRow = 18;
              }
            }
          }

          // Evaluate candidate directions (cannot reverse 180 unless dead end)
          const candidates = ALL_DIRECTIONS.filter((d) => {
            if (isOpposite(chaser.dir, d)) return false;
            return canChaserMoveInDir(curCol, curRow, d, map, false);
          });

          if (candidates.length > 0) {
            if (chaser.state === "FRIGHTENED") {
              // Choose random direction at intersection for erratic evasion
              chaser.dir = candidates[Math.floor(Math.random() * candidates.length)];
            } else {
              // Choose direction minimizing distance to target
              let bestDir = candidates[0];
              let minDistance = Number.POSITIVE_INFINITY;

              candidates.forEach((d) => {
                let nextCol = curCol;
                let nextRow = curRow;
                if (d === "LEFT") nextCol--;
                else if (d === "RIGHT") nextCol++;
                else if (d === "UP") nextRow--;
                else if (d === "DOWN") nextRow++;

                const dDist = Math.hypot(nextCol - targetCol, nextRow - targetRow);
                if (dDist < minDistance) {
                  minDistance = dDist;
                  bestDir = d;
                }
              });

              chaser.dir = bestDir;
            }
          } else {
            // Dead end: reverse
            if (canChaserMoveInDir(curCol, curRow, "UP", map, false)) chaser.dir = "UP";
            else if (canChaserMoveInDir(curCol, curRow, "DOWN", map, false)) chaser.dir = "DOWN";
            else if (canChaserMoveInDir(curCol, curRow, "LEFT", map, false)) chaser.dir = "LEFT";
            else if (canChaserMoveInDir(curCol, curRow, "RIGHT", map, false)) chaser.dir = "RIGHT";
          }
        }

        // Move along chosen direction
        const speed = chaser.speed;
        if (chaser.dir === "LEFT") chaser.x -= speed;
        else if (chaser.dir === "RIGHT") chaser.x += speed;
        else if (chaser.dir === "UP") chaser.y -= speed;
        else if (chaser.dir === "DOWN") chaser.y += speed;

        // Wrap around tunnel on row 10
        if (chaser.x < -halfTile) {
          chaser.x = CANVAS_WIDTH + halfTile - 2;
        } else if (chaser.x > CANVAS_WIDTH + halfTile) {
          chaser.x = -halfTile + 2;
        }
      });
    },
    [halfTile]
  );

  // ── Chaser Collisions with Muncher ────────────────────────────────
  const checkChaserCollisions = useCallback(() => {
    const m = muncherRef.current;
    const now = performance.now();
    const isFrightened = frightenedEndTimeRef.current > now;

    chasersRef.current.forEach((chaser) => {
      if (chaser.isInBase) return;

      const dist = Math.hypot(m.x - chaser.x, m.y - chaser.y);
      if (dist < MUNCHER_RADIUS + CHASER_RADIUS - 4) {
        if (chaser.state === "FRIGHTENED") {
          // ── Eat Frightened Chaser: Bonus points & respawn at base
          sfx.playEatChaser();
          scoreRef.current += 200;
          scoreDirtyRef.current = true;

          // Floating "+200" text
          particlesRef.current.push({
            x: chaser.x,
            y: chaser.y,
            vy: -1.3,
            text: "+200",
            color: "#67e8f9",
            alpha: 1,
            scale: 1,
            lifetime: 45,
            age: 0,
          });

          // Reset Chaser to center base
          chaser.x = chaser.baseCol * TILE_SIZE + halfTile;
          chaser.y = chaser.baseRow * TILE_SIZE + halfTile;
          chaser.state = "CHASE";
          chaser.speed = CHASER_SPEED;
          chaser.isInBase = true;
          chaser.spawnDelay = 3000;
        } else if (chaser.state === "CHASE") {
          // ── Caught by Normal Chaser: Lose Life
          sfx.playLoseLife();
          livesRef.current -= 1;
          scoreDirtyRef.current = true;

          // Emit explosion particles
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            particlesRef.current.push({
              x: m.x,
              y: m.y,
              vy: Math.sin(angle) * 1.5,
              color: "#f87171",
              alpha: 1,
              scale: 3,
              lifetime: 25,
              age: 0,
            });
          }

          if (livesRef.current <= 0) {
            setGameState((prev) => ({ ...prev, isGameOver: true, lives: 0 }));
          } else {
            resetEntityPositions();
          }
        }
      }
    });
  }, [halfTile, resetEntityPositions]);

  // ── Render function ────────────────────────────────────────────────
  const render = useCallback(
    (ctx: CanvasRenderingContext2D, time: number) => {
      // 1. Clear background
      ctx.shadowBlur = 0;
      ctx.fillStyle = PALETTE.bg;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Subtle dark grid pattern
      ctx.strokeStyle = "rgba(30, 41, 59, 0.15)";
      ctx.lineWidth = 0.5;
      for (let c = 0; c <= MAZE_COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * TILE_SIZE, 0);
        ctx.lineTo(c * TILE_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let r = 0; r <= MAZE_ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * TILE_SIZE);
        ctx.lineTo(CANVAS_WIDTH, r * TILE_SIZE);
        ctx.stroke();
      }

      const currentMap = mazeMapRef.current;

      // 2. Render Walls and Chaser base door
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const tile = currentMap[r][c];
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;

          if (tile === 1) {
            ctx.save();
            ctx.fillStyle = PALETTE.wallFill;
            ctx.strokeStyle = PALETTE.wallStroke;
            ctx.lineWidth = 1.5;
            ctx.shadowColor = PALETTE.wallGlow;
            ctx.shadowBlur = 4;

            const inset = 1;
            const cornerRadius = 4;
            const rx = x + inset;
            const ry = y + inset;
            const rw = TILE_SIZE - inset * 2;
            const rh = TILE_SIZE - inset * 2;

            ctx.beginPath();
            ctx.roundRect(rx, ry, rw, rh, cornerRadius);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          } else if (r === 9 && (c === 8 || c === 9 || c === 10)) {
            ctx.save();
            ctx.strokeStyle = PALETTE.door;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = PALETTE.door;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(x, y + TILE_SIZE / 2);
            ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 3. Render Pellets & Power-Pellets
      const pulse = Math.sin(time * 0.007);
      for (let r = 0; r < MAZE_ROWS; r++) {
        for (let c = 0; c < MAZE_COLS; c++) {
          const tile = currentMap[r][c];
          if (tile === 0 || tile === 1) continue;

          const centerX = c * TILE_SIZE + halfTile;
          const centerY = r * TILE_SIZE + halfTile;

          if (tile === 2) {
            ctx.save();
            ctx.fillStyle = PALETTE.pellet;
            ctx.shadowColor = PALETTE.pelletGlow;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 2.75, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else if (tile === 3) {
            ctx.save();
            const pRadius = 6.5 + pulse * 1.5;
            ctx.fillStyle = PALETTE.powerPelletRing;
            ctx.shadowColor = PALETTE.powerPelletGlow;
            ctx.shadowBlur = 10 + pulse * 4;

            ctx.beginPath();
            ctx.arc(centerX, centerY, pRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = PALETTE.powerPellet;
            ctx.shadowBlur = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3.5 + pulse * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // 4. Render Chasers (Enemies)
      const nowPerf = performance.now();
      const isFrightened = frightenedEndTimeRef.current > nowPerf;
      const frightenedRemainingMs = isFrightened ? frightenedEndTimeRef.current - nowPerf : 0;
      const isFlashing = frightenedRemainingMs <= 2200 && Math.floor(nowPerf / 180) % 2 === 0;

      chasersRef.current.forEach((chaser) => {
        ctx.save();
        ctx.translate(chaser.x, chaser.y);

        const r = chaser.radius;
        const wave = Math.sin(time * 0.015 + chaser.id) * 1.8;

        // Chaser Body Path (curved dome head + wavy jelly skirt)
        ctx.beginPath();
        ctx.arc(0, -2, r, Math.PI, 0, false);
        ctx.lineTo(r, 6);
        ctx.quadraticCurveTo(r * 0.66, 8 + wave, r * 0.33, 6);
        ctx.quadraticCurveTo(0, 8 - wave, -r * 0.33, 6);
        ctx.quadraticCurveTo(-r * 0.66, 8 + wave, -r, 6);
        ctx.closePath();

        if (chaser.state === "FRIGHTENED") {
          ctx.fillStyle = isFlashing ? PALETTE.chaserFrightenedFlash : PALETTE.chaserFrightened;
          ctx.shadowColor = PALETTE.chaserFrightened;
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = chaser.color;
          ctx.shadowColor = chaser.color;
          ctx.shadowBlur = 8;
        }
        ctx.fill();

        // Eyes
        ctx.shadowBlur = 0;
        if (chaser.state === "FRIGHTENED") {
          // Frightened eyes (small scared white dots)
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(-3.5, -2, 1.8, 0, Math.PI * 2);
          ctx.arc(3.5, -2, 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Directional looking eyes
          let pupilDx = 0;
          let pupilDy = 0;
          if (chaser.dir === "LEFT") pupilDx = -1.8;
          else if (chaser.dir === "RIGHT") pupilDx = 1.8;
          else if (chaser.dir === "UP") pupilDy = -1.8;
          else if (chaser.dir === "DOWN") pupilDy = 1.8;

          // Eye whites
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.ellipse(-3.8, -2, 3.2, 4, 0, 0, Math.PI * 2);
          ctx.ellipse(3.8, -2, 3.2, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Pupils
          ctx.fillStyle = "#0f172a";
          ctx.beginPath();
          ctx.arc(-3.8 + pupilDx, -2 + pupilDy, 1.8, 0, Math.PI * 2);
          ctx.arc(3.8 + pupilDx, -2 + pupilDy, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 5. Render Muncher entity
      const m = muncherRef.current;
      const mouthAngle = m.isMoving
        ? Math.abs(Math.sin(time * 0.018)) * 0.72 + 0.06
        : 0.35;

      ctx.save();
      ctx.translate(m.x, m.y);

      let angle = 0;
      if (m.dir === "DOWN") angle = Math.PI / 2;
      else if (m.dir === "LEFT") angle = Math.PI;
      else if (m.dir === "UP") angle = (Math.PI * 3) / 2;
      ctx.rotate(angle);

      ctx.fillStyle = PALETTE.muncher;
      ctx.shadowColor = "rgba(250, 204, 21, 0.75)";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius, mouthAngle, Math.PI * 2 - mouthAngle);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Eye
      ctx.fillStyle = "#0f172a";
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(2, -5.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(2.5, -6, 0.7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 6. Render Floating Particles / Popups
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age++;
        p.y += p.vy;
        p.alpha = Math.max(0, 1 - p.age / p.lifetime);

        if (p.age >= p.lifetime) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        if (p.text) {
          ctx.font = "bold 13px system-ui, sans-serif";
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.textAlign = "center";
          ctx.fillText(p.text, p.x, p.y);
        } else {
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * p.alpha, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    },
    [halfTile]
  );

  // ── Main requestAnimationFrame Loop ────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    let animationFrameId: number;

    const loop = (time: number) => {
      const now = Date.now();
      const isPaused = now < pauseUntilRef.current;

      const nowPerf = performance.now();
      const isFrightened = frightenedEndTimeRef.current > nowPerf;
      const frightenedRemaining = isFrightened
        ? Math.ceil((frightenedEndTimeRef.current - nowPerf) / 1000)
        : 0;

      if (!isPaused && !gameState.isGameOver) {
        updateMuncher();
        updateChasers(isFrightened);
        checkPelletCollisions();
        checkChaserCollisions();
      }

      // Sync state to React smoothly
      const nowMs = Date.now();
      const shouldSyncState =
        scoreDirtyRef.current ||
        isFrightened !== prevFrightenedRef.current ||
        (nowMs - lastSyncTickRef.current > 120 && isFrightened);

      if (shouldSyncState) {
        lastSyncTickRef.current = nowMs;
        scoreDirtyRef.current = false;
        prevFrightenedRef.current = isFrightened;

        setGameState((prev) => {
          const newScore = scoreRef.current;
          const newHigh = Math.max(prev.highScore, newScore);
          if (typeof window !== "undefined" && newHigh > prev.highScore) {
            localStorage.setItem("mazemuncher_high_score", String(newHigh));
          }
          return {
            ...prev,
            score: newScore,
            highScore: newHigh,
            lives: livesRef.current,
            pelletsRemaining: pelletsRemainingRef.current,
            isFrightened,
            frightenedTimeRemaining: frightenedRemaining,
          };
        });
      }

      render(ctx, time);
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    render,
    updateMuncher,
    updateChasers,
    checkPelletCollisions,
    checkChaserCollisions,
    gameState.isGameOver,
    gameState.isGameWon,
  ]);

  // ── Full Board & Game Restart ─────────────────────────────────────
  const restartGame = useCallback(() => {
    mazeMapRef.current = INITIAL_MAZE_MAP.map((row) => [...row]);
    scoreRef.current = 0;
    livesRef.current = 3;
    pelletsRemainingRef.current = initialPelletCount;
    scoreDirtyRef.current = false;
    frightenedEndTimeRef.current = 0;
    particlesRef.current = [];
    resetEntityPositions();
    setGameState((prev) => ({
      ...prev,
      score: 0,
      lives: 3,
      pelletsRemaining: initialPelletCount,
      isGameOver: false,
      isGameWon: false,
      isFrightened: false,
      frightenedTimeRemaining: 0,
      gameStarted: false,
    }));
  }, [initialPelletCount, resetEntityPositions]);

  return {
    canvasRef,
    gameState,
    setGameState,
    mazeMapRef,
    muncherRef,
    chasersRef,
    config,
    isMuted,
    toggleSound,
    handleDirectionInput,
    resetEntityPositions,
    restartGame,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlappyConfig, FlappyGameState, FlappyPipe } from "./types";

const CONFIG: FlappyConfig = { canvasWidth: 480, canvasHeight: 640 };
const STORAGE_KEY = "flappy-bird-high-score";
const GROUND_Y = 568;
const BIRD_X = 125;
const BIRD_RADIUS = 18;
const PIPE_WIDTH = 72;
const GRAVITY = 1480;
const FLAP_VELOCITY = -435;

function readHighScore() {
  if (typeof window === "undefined") return 0;
  const value = Number.parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
  return Number.isFinite(value) ? value : 0;
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  ctx.beginPath();
  ctx.arc(x, y, 18 * scale, 0, Math.PI * 2);
  ctx.arc(x + 22 * scale, y - 8 * scale, 24 * scale, 0, Math.PI * 2);
  ctx.arc(x + 48 * scale, y, 18 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  pipe: FlappyPipe,
) {
  const gapTop = pipe.gapY - pipe.gapSize / 2;
  const gapBottom = pipe.gapY + pipe.gapSize / 2;
  const gradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
  gradient.addColorStop(0, "#15803d");
  gradient.addColorStop(0.25, "#4ade80");
  gradient.addColorStop(0.72, "#22c55e");
  gradient.addColorStop(1, "#166534");
  ctx.fillStyle = gradient;
  ctx.strokeStyle = "#14532d";
  ctx.lineWidth = 4;

  ctx.fillRect(pipe.x, 0, PIPE_WIDTH, gapTop - 24);
  ctx.strokeRect(pipe.x, -4, PIPE_WIDTH, gapTop - 20);
  ctx.fillRect(pipe.x - 7, gapTop - 28, PIPE_WIDTH + 14, 28);
  ctx.strokeRect(pipe.x - 7, gapTop - 28, PIPE_WIDTH + 14, 28);

  ctx.fillRect(pipe.x, gapBottom + 24, PIPE_WIDTH, GROUND_Y - gapBottom - 24);
  ctx.strokeRect(pipe.x, gapBottom + 24, PIPE_WIDTH, GROUND_Y - gapBottom - 20);
  ctx.fillRect(pipe.x - 7, gapBottom, PIPE_WIDTH + 14, 28);
  ctx.strokeRect(pipe.x - 7, gapBottom, PIPE_WIDTH + 14, 28);
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  y: number,
  velocity: number,
  elapsed: number,
) {
  const angle = Math.max(-0.45, Math.min(1.15, velocity / 650));
  const wingLift = Math.sin(elapsed / 70) * 5;

  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate(angle);

  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#92400e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.ellipse(-8, 7 + wingLift, 14, 9, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(10, -7, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.arc(13, -7, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.moveTo(19, 1);
  ctx.lineTo(38, 6);
  ctx.lineTo(19, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function useFlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdYRef = useRef(285);
  const velocityRef = useRef(0);
  const pipesRef = useRef<FlappyPipe[]>([]);
  const scoreRef = useRef(0);
  const playingRef = useRef(false);
  const gameOverRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef(0);

  const [gameState, setGameState] = useState<FlappyGameState>({
    score: 0,
    highScore: 0,
    isPlaying: false,
    isGameOver: false,
  });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setGameState((state) => ({ ...state, highScore: readHighScore() }));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const startGame = useCallback(() => {
    birdYRef.current = 285;
    velocityRef.current = FLAP_VELOCITY;
    pipesRef.current = [];
    scoreRef.current = 0;
    spawnTimerRef.current = 0.72;
    elapsedRef.current = 0;
    playingRef.current = true;
    gameOverRef.current = false;
    setGameState((state) => ({
      ...state,
      score: 0,
      isPlaying: true,
      isGameOver: false,
    }));
  }, []);

  const flap = useCallback(() => {
    if (!playingRef.current) {
      startGame();
      return;
    }
    velocityRef.current = FLAP_VELOCITY;
  }, [startGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (["Space", "ArrowUp", "KeyW"].includes(event.code)) {
        event.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flap]);

  useEffect(() => {
    let animationFrame = 0;

    const finishGame = () => {
      if (!playingRef.current) return;
      playingRef.current = false;
      gameOverRef.current = true;
      const highScore = Math.max(readHighScore(), scoreRef.current);
      localStorage.setItem(STORAGE_KEY, String(highScore));
      setGameState({
        score: scoreRef.current,
        highScore,
        isPlaying: false,
        isGameOver: true,
      });
    };

    const render = (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrame = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const delta = lastFrameRef.current
        ? Math.min((time - lastFrameRef.current) / 1000, 0.034)
        : 0;
      lastFrameRef.current = time;
      elapsedRef.current += delta * 1000;

      if (playingRef.current) {
        velocityRef.current += GRAVITY * delta;
        birdYRef.current += velocityRef.current * delta;

        const pipeSpeed = Math.min(245, 168 + scoreRef.current * 2.8);
        spawnTimerRef.current -= delta;
        if (spawnTimerRef.current <= 0) {
          const gapSize = Math.max(122, 164 - scoreRef.current * 1.3);
          const margin = gapSize / 2 + 58;
          const gapY = margin + Math.random() * (GROUND_Y - margin * 2);
          pipesRef.current.push({
            x: CONFIG.canvasWidth + 18,
            gapY,
            gapSize,
            scored: false,
          });
          spawnTimerRef.current = Math.max(1.05, 1.42 - scoreRef.current * 0.008);
        }

        for (const pipe of pipesRef.current) {
          pipe.x -= pipeSpeed * delta;
          if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.scored = true;
            scoreRef.current += 1;
            setGameState((state) => ({ ...state, score: scoreRef.current }));
          }
        }
        pipesRef.current = pipesRef.current.filter(
          (pipe) => pipe.x + PIPE_WIDTH > -12,
        );

        const birdLeft = BIRD_X - BIRD_RADIUS + 4;
        const birdRight = BIRD_X + BIRD_RADIUS;
        const birdTop = birdYRef.current - BIRD_RADIUS + 3;
        const birdBottom = birdYRef.current + BIRD_RADIUS - 2;
        const hitPipe = pipesRef.current.some((pipe) => {
          const overlapsX = birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH;
          const gapTop = pipe.gapY - pipe.gapSize / 2;
          const gapBottom = pipe.gapY + pipe.gapSize / 2;
          return overlapsX && (birdTop < gapTop || birdBottom > gapBottom);
        });

        if (hitPipe || birdTop <= 0 || birdBottom >= GROUND_Y) finishGame();
      }

      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, "#38bdf8");
      sky.addColorStop(0.65, "#7dd3fc");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

      ctx.fillStyle = "rgba(255,255,255,.72)";
      drawCloud(ctx, 42, 104, 0.8);
      drawCloud(ctx, 300, 164, 1.05);
      drawCloud(ctx, 205, 68, 0.55);

      ctx.fillStyle = "rgba(14,165,233,.18)";
      for (let x = -20; x < CONFIG.canvasWidth; x += 58) {
        const height = 45 + ((x + 20) % 116);
        ctx.fillRect(x, GROUND_Y - height, 46, height);
      }

      pipesRef.current.forEach((pipe) => drawPipe(ctx, pipe));
      drawBird(ctx, birdYRef.current, velocityRef.current, elapsedRef.current);

      ctx.fillStyle = "#65a30d";
      ctx.fillRect(0, GROUND_Y, CONFIG.canvasWidth, 14);
      ctx.fillStyle = "#bef264";
      ctx.fillRect(0, GROUND_Y, CONFIG.canvasWidth, 6);
      ctx.fillStyle = "#d6b86a";
      ctx.fillRect(0, GROUND_Y + 14, CONFIG.canvasWidth, CONFIG.canvasHeight - GROUND_Y - 14);
      ctx.fillStyle = "rgba(120,53,15,.18)";
      const groundOffset = (elapsedRef.current * 0.08) % 28;
      for (let x = -groundOffset; x < CONFIG.canvasWidth; x += 28) {
        ctx.fillRect(x, GROUND_Y + 25, 14, 5);
        ctx.fillRect(x + 13, GROUND_Y + 44, 14, 5);
      }

      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.font = "900 54px ui-rounded, system-ui, sans-serif";
      ctx.strokeStyle = "rgba(15,23,42,.6)";
      ctx.lineWidth = 8;
      ctx.strokeText(String(scoreRef.current), CONFIG.canvasWidth / 2, 82);
      ctx.fillStyle = "#fff";
      ctx.fillText(String(scoreRef.current), CONFIG.canvasWidth / 2, 82);

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return { canvasRef, gameState, startGame, flap, config: CONFIG };
}

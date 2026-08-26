"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlappyConfig, FlappyGameState, FlappyParticle, FlappyPipe } from "./types";

const CONFIG: FlappyConfig = { canvasWidth: 480, canvasHeight: 640 };
const STORAGE_KEY = "flappy-bird-high-score";
const GROUND_Y = 560;
const BIRD_X = 125;
const BIRD_RADIUS = 18;
const PIPE_WIDTH = 74;
const GRAVITY = 1480;
const FLAP_VELOCITY = -430;

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

function drawCitySkyline(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.fillStyle = "rgba(14, 165, 233, 0.16)";
  const buildings = [
    { w: 42, h: 85 },
    { w: 32, h: 120 },
    { w: 50, h: 70 },
    { w: 38, h: 140 },
    { w: 45, h: 95 },
    { w: 36, h: 110 },
    { w: 54, h: 80 },
    { w: 40, h: 130 },
  ];
  let curX = -((offset * 0.15) % 337);
  while (curX < CONFIG.canvasWidth + 60) {
    for (const b of buildings) {
      ctx.fillRect(curX, GROUND_Y - b.h, b.w, b.h);
      // Window highlights
      ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      for (let wy = GROUND_Y - b.h + 12; wy < GROUND_Y - 10; wy += 18) {
        for (let wx = curX + 6; wx < curX + b.w - 8; wx += 12) {
          ctx.fillRect(wx, wy, 5, 8);
        }
      }
      ctx.fillStyle = "rgba(14, 165, 233, 0.16)";
      curX += b.w + 4;
    }
  }
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  pipe: FlappyPipe,
) {
  const gapTop = pipe.gapY - pipe.gapSize / 2;
  const gapBottom = pipe.gapY + pipe.gapSize / 2;
  const capHeight = 28;
  const capOverhang = 6;

  // Main Pipe Gradient
  const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
  pipeGradient.addColorStop(0, "#166534");
  pipeGradient.addColorStop(0.18, "#22c55e");
  pipeGradient.addColorStop(0.45, "#86efac");
  pipeGradient.addColorStop(0.75, "#16a34a");
  pipeGradient.addColorStop(1, "#14532d");

  ctx.fillStyle = pipeGradient;
  ctx.strokeStyle = "#052e16";
  ctx.lineWidth = 3.5;

  // ── Top Pipe ──────────────────────────────────────────────────
  if (gapTop > 0) {
    // Upper shaft
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, gapTop - capHeight);
    ctx.strokeRect(pipe.x, -4, PIPE_WIDTH, gapTop - capHeight + 4);

    // Upper rim cap
    ctx.fillRect(
      pipe.x - capOverhang,
      gapTop - capHeight,
      PIPE_WIDTH + capOverhang * 2,
      capHeight,
    );
    ctx.strokeRect(
      pipe.x - capOverhang,
      gapTop - capHeight,
      PIPE_WIDTH + capOverhang * 2,
      capHeight,
    );

    // Glossy lip line
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(pipe.x + 8, 0, 8, gapTop - capHeight);
    ctx.fillRect(pipe.x + 8, gapTop - capHeight, 8, capHeight - 4);
    ctx.fillStyle = pipeGradient;
  }

  // ── Bottom Pipe ───────────────────────────────────────────────
  if (gapBottom < GROUND_Y) {
    // Lower rim cap
    ctx.fillRect(
      pipe.x - capOverhang,
      gapBottom,
      PIPE_WIDTH + capOverhang * 2,
      capHeight,
    );
    ctx.strokeRect(
      pipe.x - capOverhang,
      gapBottom,
      PIPE_WIDTH + capOverhang * 2,
      capHeight,
    );

    // Lower shaft
    ctx.fillRect(
      pipe.x,
      gapBottom + capHeight,
      PIPE_WIDTH,
      GROUND_Y - gapBottom - capHeight,
    );
    ctx.strokeRect(
      pipe.x,
      gapBottom + capHeight,
      PIPE_WIDTH,
      GROUND_Y - gapBottom - capHeight + 4,
    );

    // Glossy lip line
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(pipe.x + 8, gapBottom + 4, 8, capHeight - 4);
    ctx.fillRect(
      pipe.x + 8,
      gapBottom + capHeight,
      8,
      GROUND_Y - gapBottom - capHeight,
    );
  }
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  y: number,
  velocity: number,
  elapsed: number,
  isDead = false,
) {
  const targetAngle = isDead ? 1.4 : Math.max(-0.48, Math.min(1.2, velocity / 600));
  const wingLift = isDead ? 0 : Math.sin(elapsed / 65) * 6;

  ctx.save();
  ctx.translate(BIRD_X, y);
  ctx.rotate(targetAngle);

  // Body Shadow
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(2, 4, 22, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bird Body Gradient
  const bodyGrad = ctx.createLinearGradient(-15, -15, 15, 15);
  bodyGrad.addColorStop(0, "#fbbf24");
  bodyGrad.addColorStop(0.7, "#f59e0b");
  bodyGrad.addColorStop(1, "#d97706");

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 23, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // White Belly Accent
  ctx.fillStyle = "rgba(254, 243, 199, 0.9)";
  ctx.beginPath();
  ctx.ellipse(-4, 6, 12, 9, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Wing
  const wingGrad = ctx.createLinearGradient(-16, 0, 6, 12);
  wingGrad.addColorStop(0, "#fde68a");
  wingGrad.addColorStop(1, "#f59e0b");
  ctx.fillStyle = wingGrad;
  ctx.beginPath();
  ctx.ellipse(-7, 4 + wingLift, 13, 8, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Eye
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(10, -7, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Pupil (with reflection shine)
  if (isDead) {
    // X eye when dead
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -10);
    ctx.lineTo(14, -4);
    ctx.moveTo(14, -10);
    ctx.lineTo(8, -4);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(13, -7, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye catch-light
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(14.5, -8.5, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cheerful Blush
  ctx.fillStyle = "rgba(244, 63, 94, 0.4)";
  ctx.beginPath();
  ctx.arc(4, 3, 5, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  const beakGrad = ctx.createLinearGradient(18, 0, 36, 6);
  beakGrad.addColorStop(0, "#fb923c");
  beakGrad.addColorStop(1, "#ea580c");
  ctx.fillStyle = beakGrad;
  ctx.strokeStyle = "#9a3412";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(36, 5);
  ctx.lineTo(18, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Beak separation line
  ctx.beginPath();
  ctx.moveTo(18, 5);
  ctx.lineTo(32, 5);
  ctx.stroke();

  ctx.restore();
}

export function useFlappyBird(externalHighScore = 0) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdYRef = useRef(280);
  const velocityRef = useRef(0);
  const pipesRef = useRef<FlappyPipe[]>([]);
  const particlesRef = useRef<FlappyParticle[]>([]);
  const scoreRef = useRef(0);
  const playingRef = useRef(false);
  const gameOverRef = useRef(false);
  const spawnTimerRef = useRef(0);
  const elapsedRef = useRef(0);
  const lastFrameRef = useRef(0);
  const speedRef = useRef(175);
  const externalHighScoreRef = useRef(externalHighScore);
  externalHighScoreRef.current = externalHighScore;

  const [gameState, setGameState] = useState<FlappyGameState>({
    score: 0,
    highScore: Math.max(readHighScore(), externalHighScore),
    isPlaying: false,
    isGameOver: false,
    isNewHighScore: false,
    currentSpeed: 175,
  });

  useEffect(() => {
    const local = readHighScore();
    const effective = Math.max(local, externalHighScore);
    setGameState((state) => ({ ...state, highScore: Math.max(state.highScore, effective) }));
  }, [externalHighScore]);

  const spawnFeatherParticles = (x: number, y: number) => {
    const colors = ["#fbbf24", "#f59e0b", "#fed7aa", "#ffffff", "#ea580c"];
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 220;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
      });
    }
  };

  const spawnScoreParticles = (x: number, y: number) => {
    const colors = ["#fbbf24", "#60a5fa", "#34d399", "#ffffff"];
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.3,
      });
    }
  };

  const startGame = useCallback(() => {
    birdYRef.current = 280;
    velocityRef.current = FLAP_VELOCITY;
    pipesRef.current = [];
    particlesRef.current = [];
    scoreRef.current = 0;
    speedRef.current = 175;
    spawnTimerRef.current = 0.8;
    elapsedRef.current = 0;
    playingRef.current = true;
    gameOverRef.current = false;

    setGameState((state) => ({
      ...state,
      score: 0,
      isPlaying: true,
      isGameOver: false,
      isNewHighScore: false,
      currentSpeed: 175,
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

      spawnFeatherParticles(BIRD_X, birdYRef.current);

      const oldHighScore = Math.max(readHighScore(), externalHighScoreRef.current);
      const currentScore = scoreRef.current;
      const isNewBest = currentScore > oldHighScore && currentScore > 0;
      const finalHighScore = Math.max(oldHighScore, currentScore);

      if (isNewBest) {
        localStorage.setItem(STORAGE_KEY, String(finalHighScore));
      }

      setGameState({
        score: currentScore,
        highScore: finalHighScore,
        isPlaying: false,
        isGameOver: true,
        isNewHighScore: isNewBest,
        currentSpeed: speedRef.current,
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

        const currentPipeSpeed = Math.min(265, 175 + scoreRef.current * 2.8);
        speedRef.current = Math.round(currentPipeSpeed);

        spawnTimerRef.current -= delta;
        if (spawnTimerRef.current <= 0) {
          const gapSize = Math.max(120, 166 - scoreRef.current * 1.25);
          const margin = gapSize / 2 + 55;
          const gapY = margin + Math.random() * (GROUND_Y - margin * 2);
          pipesRef.current.push({
            x: CONFIG.canvasWidth + 18,
            gapY,
            gapSize,
            scored: false,
          });
          spawnTimerRef.current = Math.max(1.08, 1.45 - scoreRef.current * 0.009);
        }

        for (const pipe of pipesRef.current) {
          pipe.x -= currentPipeSpeed * delta;
          if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
            pipe.scored = true;
            scoreRef.current += 1;
            spawnScoreParticles(BIRD_X + 10, birdYRef.current);
            setGameState((state) => ({
              ...state,
              score: scoreRef.current,
              currentSpeed: speedRef.current,
            }));
          }
        }
        pipesRef.current = pipesRef.current.filter(
          (pipe) => pipe.x + PIPE_WIDTH > -20,
        );

        // Check Collisions
        const birdLeft = BIRD_X - BIRD_RADIUS + 4;
        const birdRight = BIRD_X + BIRD_RADIUS - 2;
        const birdTop = birdYRef.current - BIRD_RADIUS + 3;
        const birdBottom = birdYRef.current + BIRD_RADIUS - 2;

        const hitPipe = pipesRef.current.some((pipe) => {
          const overlapsX = birdRight > pipe.x - 4 && birdLeft < pipe.x + PIPE_WIDTH + 4;
          const gapTop = pipe.gapY - pipe.gapSize / 2;
          const gapBottom = pipe.gapY + pipe.gapSize / 2;
          return overlapsX && (birdTop < gapTop || birdBottom > gapBottom);
        });

        if (hitPipe || birdTop <= 0 || birdBottom >= GROUND_Y) {
          finishGame();
        }
      }

      // Update Particles
      for (const p of particlesRef.current) {
        p.life += delta;
        p.x += p.vx * delta;
        p.y += p.vy * delta;
        p.vy += 420 * delta; // particle gravity
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);
      }
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

      // ── DRAWING PASS ──────────────────────────────────────────────
      // 1. Sky Background Gradient
      const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      sky.addColorStop(0, "#0284c7");
      sky.addColorStop(0.35, "#38bdf8");
      sky.addColorStop(0.75, "#7dd3fc");
      sky.addColorStop(1, "#bae6fd");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CONFIG.canvasWidth, CONFIG.canvasHeight);

      // 2. Parallax Floating Clouds
      ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
      const cloudOffset = (elapsedRef.current * 0.02) % (CONFIG.canvasWidth + 200);
      drawCloud(ctx, (50 - cloudOffset + CONFIG.canvasWidth + 200) % (CONFIG.canvasWidth + 200) - 50, 95, 0.85);
      drawCloud(ctx, (280 - cloudOffset * 1.2 + CONFIG.canvasWidth + 200) % (CONFIG.canvasWidth + 200) - 50, 155, 1.15);
      drawCloud(ctx, (190 - cloudOffset * 0.7 + CONFIG.canvasWidth + 200) % (CONFIG.canvasWidth + 200) - 50, 60, 0.6);

      // 3. City Skyline Silhouette
      drawCitySkyline(ctx, elapsedRef.current);

      // 4. Pipes
      pipesRef.current.forEach((pipe) => drawPipe(ctx, pipe));

      // 5. Particles
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Bird
      drawBird(
        ctx,
        birdYRef.current,
        velocityRef.current,
        elapsedRef.current,
        gameOverRef.current,
      );

      // 7. Ground Grass & Dirt Layers
      // Grass Top Strip
      ctx.fillStyle = "#65a30d";
      ctx.fillRect(0, GROUND_Y, CONFIG.canvasWidth, 14);
      ctx.fillStyle = "#a3e635";
      ctx.fillRect(0, GROUND_Y, CONFIG.canvasWidth, 5);

      // Underground Dirt
      const dirtGrad = ctx.createLinearGradient(0, GROUND_Y + 14, 0, CONFIG.canvasHeight);
      dirtGrad.addColorStop(0, "#d4a359");
      dirtGrad.addColorStop(1, "#b47f38");
      ctx.fillStyle = dirtGrad;
      ctx.fillRect(0, GROUND_Y + 14, CONFIG.canvasWidth, CONFIG.canvasHeight - GROUND_Y - 14);

      // Scrolling Grass & Dirt Texture
      ctx.fillStyle = "rgba(120, 53, 15, 0.22)";
      const groundScroll = (elapsedRef.current * (playingRef.current ? 0.16 : 0.05)) % 32;
      for (let x = -groundScroll; x < CONFIG.canvasWidth + 32; x += 32) {
        ctx.fillRect(x, GROUND_Y + 24, 15, 6);
        ctx.fillRect(x + 14, GROUND_Y + 46, 15, 6);
      }

      // 8. In-Game Dynamic Score Overlay (Only while playing)
      if (playingRef.current) {
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.font = "900 52px ui-rounded, Inter, system-ui, sans-serif";

        // Deep drop shadow
        ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
        ctx.lineWidth = 8;
        ctx.strokeText(String(scoreRef.current), CONFIG.canvasWidth / 2, 86);

        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(scoreRef.current), CONFIG.canvasWidth / 2, 86);
      }

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return {
    canvasRef,
    gameState,
    startGame,
    flap,
    config: CONFIG,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EGG_RADIUS,
  EGG_DIAMETER,
  GRID_COLS,
  GRID_ROWS,
  ROW_HEIGHT,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_TOP_OFFSET,
  SHOOTER_X,
  SHOOTER_Y,
  SHOOTER_AREA_HEIGHT,
  MIN_ANGLE,
  EGG_SPEED,
  type EggColor,
  type Grid,
  getXYFromRowCol,
  createEmptyGrid,
  populateGrid,
  getActiveColors,
  randomEggColor,
  findConnectedMatches,
  findFloatingOrphans,
  snapToNearestSlot,
} from "./utils/hexGrid";
import {
  playShootSound,
  playBounceSound,
  playPopSound,
  playDropSound,
  playWarningSound,
  playGameOverSound,
  getSoundMuted,
  setSoundMuted,
} from "./utils/sound";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

export const INITIAL_ROWS = 5;
export const MAX_FOULS = 5; // misses before ceiling descends
export const DANGER_ROW = GRID_ROWS - 3; // Row 12 is the danger threshold
export const DEADLINE_ROW = GRID_ROWS - 2; // Row 13 is immediate game over

export interface DifficultyLevel {
  level: number;
  name: string;
  minScore: number;
  unlockedColors: EggColor[];
  descentTime: number; // in seconds
  foulTolerance: number;
}

export const DIFFICULTY_LEVELS: DifficultyLevel[] = [
  {
    level: 1,
    name: "Jungle Hatchling",
    minScore: 0,
    unlockedColors: ["#EF4444", "#3B82F6", "#22C55E", "#FACC15"], // 4 initial colors
    descentTime: 15,
    foulTolerance: 5,
  },
  {
    level: 2,
    name: "Raptor Scout",
    minScore: 500,
    unlockedColors: ["#EF4444", "#3B82F6", "#22C55E", "#FACC15", "#A855F7"], // +Purple (5 colors)
    descentTime: 12.5,
    foulTolerance: 5,
  },
  {
    level: 3,
    name: "T-Rex Hunter",
    minScore: 1200,
    unlockedColors: ["#EF4444", "#3B82F6", "#22C55E", "#FACC15", "#A855F7", "#F97316"], // +Orange (6 colors)
    descentTime: 10.5,
    foulTolerance: 4,
  },
  {
    level: 4,
    name: "Apex Predator",
    minScore: 2500,
    unlockedColors: ["#EF4444", "#3B82F6", "#22C55E", "#FACC15", "#A855F7", "#F97316"], // 6 colors, tighter timer
    descentTime: 8.5,
    foulTolerance: 4,
  },
  {
    level: 5,
    name: "Meteor Survivor",
    minScore: 4500,
    unlockedColors: ["#EF4444", "#3B82F6", "#22C55E", "#FACC15", "#A855F7", "#F97316"], // 6 colors, high-stress
    descentTime: 7.0,
    foulTolerance: 3,
  },
];

export function getDifficultyForScore(score: number): DifficultyLevel {
  for (let i = DIFFICULTY_LEVELS.length - 1; i >= 0; i--) {
    if (score >= DIFFICULTY_LEVELS[i].minScore) {
      return DIFFICULTY_LEVELS[i];
    }
  }
  return DIFFICULTY_LEVELS[0];
}

export type GamePhase =
  | "ready"
  | "aiming"
  | "firing"
  | "descending"
  | "gameover"
  | "victory";

export interface FlyingEgg {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: EggColor;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface FallingEgg {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: EggColor;
  alpha: number;
}

export interface ScorePopup {
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
}

export interface EggEngineStats {
  score: number;
  shotsFired: number;
  eggsPopped: number;
  clustersDropped: number;
  combo: number;
  maxCombo: number;
  foulsLeft: number;
  maxFouls: number;
  isPaused: boolean;
  isMuted: boolean;
  level: number;
  levelName: string;
  descentTimeLeft: number;
  maxDescentTime: number;
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r},${g},${b})`;
}

interface EggSpot {
  x: number;
  y: number;
  r: number;
}

// Tightly packed organic spotted pattern matching classic Dynomite dinosaur eggs
const DINO_EGG_SPOTS: EggSpot[] = [
  // Center spot (prominent)
  { x: 0, y: 0, r: 0.28 },

  // Inner ring (6 spots arranged around center, leaving thin channels)
  { x: 0.46 * Math.cos(0), y: 0.46 * Math.sin(0), r: 0.25 },
  { x: 0.46 * Math.cos(Math.PI / 3), y: 0.46 * Math.sin(Math.PI / 3), r: 0.25 },
  { x: 0.46 * Math.cos((2 * Math.PI) / 3), y: 0.46 * Math.sin((2 * Math.PI) / 3), r: 0.25 },
  { x: 0.46 * Math.cos(Math.PI), y: 0.46 * Math.sin(Math.PI), r: 0.25 },
  { x: 0.46 * Math.cos((4 * Math.PI) / 3), y: 0.46 * Math.sin((4 * Math.PI) / 3), r: 0.25 },
  { x: 0.46 * Math.cos((5 * Math.PI) / 3), y: 0.46 * Math.sin((5 * Math.PI) / 3), r: 0.25 },

  // Outer ring (10 spots staggered along the perimeter, tightly packed)
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
    const angle = (i * Math.PI * 2) / 10 + Math.PI / 10;
    return {
      x: 0.81 * Math.cos(angle),
      y: 0.81 * Math.sin(angle),
      r: 0.23,
    };
  }),
];

const eggCanvasCache = new Map<string, HTMLCanvasElement>();

function renderSpottedEgg(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  radius: number,
) {
  ctx.save();

  // 1. Clip everything to the spherical egg boundary
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.clip();

  // 2. Base shell (warm eggshell ivory / cream with soft 3D lighting)
  const shellGrad = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.08,
    cx,
    cy,
    radius,
  );
  shellGrad.addColorStop(0, "#FFFFFF");
  shellGrad.addColorStop(0.5, "#F7F5EE");
  shellGrad.addColorStop(0.85, "#E2DFD6");
  shellGrad.addColorStop(1, "#A8A29E");

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.fillStyle = shellGrad;
  ctx.fill();

  // 3. Draw each colored dinosaur spot with individual 3D dome depth
  for (const spot of DINO_EGG_SPOTS) {
    const sx = cx + spot.x * radius;
    const sy = cy + spot.y * radius;
    const sr = spot.r * radius;

    const spotGrad = ctx.createRadialGradient(
      sx - sr * 0.32,
      sy - sr * 0.32,
      sr * 0.08,
      sx,
      sy,
      sr,
    );
    spotGrad.addColorStop(0, lightenColor(color, 65));
    spotGrad.addColorStop(0.5, color);
    spotGrad.addColorStop(0.9, darkenColor(color, 35));
    spotGrad.addColorStop(1.0, darkenColor(color, 55));

    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = spotGrad;
    ctx.fill();

    // Crisp darker contour around each spot
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.strokeStyle = darkenColor(color, 65);
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  // 4. Overall 3D Spherical Volume Overlay (Lighting from top-left, shadow on bottom-right)
  const sphereLighting = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.05,
    cx,
    cy,
    radius,
  );
  sphereLighting.addColorStop(0, "rgba(255, 255, 255, 0.40)");
  sphereLighting.addColorStop(0.35, "rgba(255, 255, 255, 0.06)");
  sphereLighting.addColorStop(0.65, "rgba(0, 0, 0, 0.0)");
  sphereLighting.addColorStop(0.85, "rgba(0, 0, 0, 0.32)");
  sphereLighting.addColorStop(1.0, "rgba(0, 0, 0, 0.70)");

  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.fillStyle = sphereLighting;
  ctx.fill();

  // 5. Glossy specular highlight sheen on top-left (curved ellipse)
  ctx.save();
  ctx.translate(cx - radius * 0.35, cy - radius * 0.35);
  ctx.rotate(-Math.PI / 4);

  const glossGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.28);
  glossGrad.addColorStop(0, "rgba(255, 255, 255, 0.90)");
  glossGrad.addColorStop(0.45, "rgba(255, 255, 255, 0.45)");
  glossGrad.addColorStop(1.0, "rgba(255, 255, 255, 0)");

  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.28, radius * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = glossGrad;
  ctx.fill();
  ctx.restore();

  // 6. Crisp outer perimeter rim
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.restore();
}

function getEggSprite(color: string, radius: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const roundedR = Math.round(radius);
  const key = `${color}_${roundedR}`;
  const cached = eggCanvasCache.get(key);
  if (cached) return cached;

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const padding = 2;
  const size = (roundedR + padding) * 2;
  const canvas = document.createElement("canvas");
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const cctx = canvas.getContext("2d");
  if (!cctx) return null;

  cctx.scale(dpr, dpr);
  renderSpottedEgg(cctx, roundedR + padding, roundedR + padding, color, roundedR);

  eggCanvasCache.set(key, canvas);
  return canvas;
}

function drawEgg(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  radius: number = EGG_RADIUS,
  alpha: number = 1,
) {
  if (alpha <= 0) return;
  const roundedR = Math.round(radius);
  const sprite = getEggSprite(color, roundedR);

  if (sprite) {
    const padding = 2;
    const size = (roundedR + padding) * 2;
    ctx.save();
    if (alpha < 1) {
      ctx.globalAlpha = alpha;
    }
    ctx.drawImage(
      sprite,
      cx - (roundedR + padding),
      cy - (roundedR + padding),
      size,
      size,
    );
    ctx.restore();
  } else {
    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;
    renderSpottedEgg(ctx, cx, cy, color, roundedR);
    ctx.restore();
  }
}

/** High-tension arcade ceiling countdown timer bar */
function drawDescentTimer(
  ctx: CanvasRenderingContext2D,
  timeLeft: number,
  maxTime: number,
  isCeilingWarning: boolean,
  time: number,
) {
  const barX = 24;
  const barY = 5;
  const barWidth = CANVAS_WIDTH - 48;
  const barHeight = 6;
  const pct = Math.max(0, Math.min(1, timeLeft / maxTime));

  ctx.save();

  // Background track
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
  ctx.beginPath();
  ctx.roundRect(barX, barY, barWidth, barHeight, 3);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Animated gradient fill
  if (pct > 0 && !isCeilingWarning) {
    const fillW = Math.max(4, barWidth * pct);
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barHeight, 3);

    if (pct > 0.45) {
      const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      grad.addColorStop(0, "#10b981");
      grad.addColorStop(1, "#06b6d4");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#06b6d4";
      ctx.shadowBlur = 4;
    } else if (pct > 0.2) {
      const grad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      grad.addColorStop(0, "#f59e0b");
      grad.addColorStop(1, "#ea580c");
      ctx.fillStyle = grad;
      ctx.shadowColor = "#f59e0b";
      ctx.shadowBlur = 6;
    } else {
      const pulse = Math.sin(time * 0.02) * 0.35 + 0.65;
      ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
    }
    ctx.fill();
  }

  // Timer label floating badge
  ctx.shadowBlur = 0;
  const isUrgent = isCeilingWarning || timeLeft <= 3.5;
  const badgeW = isCeilingWarning ? 180 : 120;
  const badgeH = 15;
  const badgeX = (CANVAS_WIDTH - badgeW) / 2;
  const badgeY = barY + barHeight + 2;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 7.5);
  ctx.fillStyle = isUrgent
    ? "rgba(15, 23, 42, 0.94)"
    : "rgba(15, 23, 42, 0.78)";
  ctx.fill();
  ctx.strokeStyle = isUrgent
    ? "rgba(239, 68, 68, 0.7)"
    : "rgba(56, 189, 248, 0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (isCeilingWarning) {
    const flash = Math.sin(time * 0.025) > 0;
    ctx.fillStyle = flash ? "#ef4444" : "#fca5a5";
    ctx.fillText("⚠️ CEILING SLIDING DOWN!", CANVAS_WIDTH / 2, badgeY + badgeH / 2);
  } else if (timeLeft <= 3.5) {
    const flash = Math.sin(time * 0.02) > 0;
    ctx.fillStyle = flash ? "#ef4444" : "#f59e0b";
    ctx.fillText(`⚠️ DROP IN ${timeLeft.toFixed(1)}s`, CANVAS_WIDTH / 2, badgeY + badgeH / 2);
  } else {
    ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
    ctx.fillText(`⏱️ DROP IN ${timeLeft.toFixed(1)}s`, CANVAS_WIDTH / 2, badgeY + badgeH / 2);
  }

  ctx.restore();
}

/** Danger boundary warning line */
function drawDangerLine(
  ctx: CanvasRenderingContext2D,
  hasDanger: boolean,
  time: number,
) {
  const dangerY = GRID_TOP_OFFSET + DANGER_ROW * ROW_HEIGHT + ROW_HEIGHT * 0.5;

  ctx.save();
  const pulse = Math.sin(time * 0.006) * 0.5 + 0.5;
  const alpha = hasDanger ? 0.35 + pulse * 0.45 : 0.2;

  ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
  ctx.lineWidth = hasDanger ? 2.5 : 1.5;
  ctx.setLineDash([8, 6]);

  ctx.beginPath();
  ctx.moveTo(0, dangerY);
  ctx.lineTo(CANVAS_WIDTH, dangerY);
  ctx.stroke();

  // Danger warning badge
  if (hasDanger) {
    ctx.fillStyle = `rgba(239, 68, 68, ${0.6 + pulse * 0.4})`;
    ctx.font = "bold 10px 'Inter', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("⚠️ DANGER ZONE", CANVAS_WIDTH - 12, dangerY - 6);
  }

  ctx.restore();
}

/** Shooter cannon & tray (predictive trajectory guide removed for hardcore arcade skill) */
function drawShooter(
  ctx: CanvasRenderingContext2D,
  angle: number,
  loadedColor: EggColor,
  nextColor: EggColor,
  recoil: number,
  foulsLeft: number,
  maxFouls: number,
  isDescending: boolean = false,
  isCeilingWarning: boolean = false,
) {
  ctx.save();

  // Base platform
  const baseY = CANVAS_HEIGHT - 20;
  const baseGrad = ctx.createLinearGradient(
    SHOOTER_X - 52,
    baseY - 16,
    SHOOTER_X + 52,
    baseY + 16,
  );
  baseGrad.addColorStop(0, "#1e293b");
  baseGrad.addColorStop(0.5, "#475569");
  baseGrad.addColorStop(1, "#1e293b");

  ctx.beginPath();
  ctx.moveTo(SHOOTER_X - 52, baseY);
  ctx.quadraticCurveTo(SHOOTER_X, baseY - 20, SHOOTER_X + 52, baseY);
  ctx.quadraticCurveTo(SHOOTER_X, baseY + 12, SHOOTER_X - 52, baseY);
  ctx.fillStyle = baseGrad;
  ctx.fill();
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cannon barrel
  const barrelLen = 38;
  const recoilX = -Math.cos(angle) * recoil;
  const recoilY = -Math.sin(angle) * recoil;

  ctx.save();
  ctx.translate(SHOOTER_X + recoilX, SHOOTER_Y + recoilY);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.roundRect(-6, -9, barrelLen, 18, 4);
  const barrelGrad = ctx.createLinearGradient(0, -9, 0, 9);
  barrelGrad.addColorStop(0, isDescending ? "#f97316" : "#38bdf8");
  barrelGrad.addColorStop(0.5, isDescending ? "#ea580c" : "#0284c7");
  barrelGrad.addColorStop(1, isDescending ? "#c2410c" : "#0369a1");
  ctx.fillStyle = barrelGrad;
  ctx.fill();
  ctx.strokeStyle = isDescending ? "#9a3412" : "#075985";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arrow tip
  ctx.beginPath();
  ctx.moveTo(barrelLen - 2, -13);
  ctx.lineTo(barrelLen + 14, 0);
  ctx.lineTo(barrelLen - 2, 13);
  ctx.closePath();
  ctx.fillStyle = isDescending ? "#fdba74" : "#7dd3fc";
  ctx.fill();
  ctx.strokeStyle = isDescending ? "#ea580c" : "#0284c7";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();

  // Loaded egg
  drawEgg(ctx, SHOOTER_X, SHOOTER_Y, loadedColor);

  // Next egg preview (right)
  const previewX = SHOOTER_X + 66;
  const previewY = SHOOTER_Y + 8;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NEXT", previewX, previewY - 18);
  drawEgg(ctx, previewX, previewY, nextColor, EGG_RADIUS * 0.72);

  // Fouls / Descent Warning Dots (left of shooter)
  const foulsX = SHOOTER_X - 66;
  const foulsY = SHOOTER_Y + 8;
  ctx.fillStyle = isCeilingWarning ? "#ef4444" : "rgba(255,255,255,0.45)";
  ctx.font = "bold 9px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(isCeilingWarning ? "⚠️ DROPPING!" : "FOULS", foulsX, foulsY - 18);

  const startX = foulsX - ((maxFouls - 1) * 12) / 2;
  for (let i = 0; i < maxFouls; i++) {
    const dotX = startX + i * 12;
    const dotY = foulsY;
    const active = i < foulsLeft;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isCeilingWarning
      ? "#ef4444"
      : active
      ? "#f59e0b"
      : "rgba(255,255,255,0.12)";
    ctx.fill();
    if (active || isCeilingWarning) {
      ctx.strokeStyle = isCeilingWarning ? "#991b1b" : "#b45309";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }
}

function drawFallingEggs(ctx: CanvasRenderingContext2D, eggs: FallingEgg[]) {
  for (const egg of eggs) {
    drawEgg(ctx, egg.x, egg.y, egg.color, EGG_RADIUS, egg.alpha);
  }
}

function drawScorePopups(ctx: CanvasRenderingContext2D, popups: ScorePopup[]) {
  for (const p of popups) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.font = "bold 15px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  isCeilingWarning: boolean = false,
  time: number = 0,
) {
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bg.addColorStop(0, "#080c14");
  bg.addColorStop(0.5, "#0d1525");
  bg.addColorStop(1, "#080c14");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Mesh grid
  ctx.strokeStyle = "rgba(100,116,139,0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += EGG_DIAMETER) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += ROW_HEIGHT) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Ceiling border
  ctx.save();
  const rumbleY = isCeilingWarning ? Math.sin(time * 0.05) * 1.5 : 0;
  const ceilingY = GRID_TOP_OFFSET - EGG_RADIUS - 2 + rumbleY;

  if (isCeilingWarning) {
    const pulse = Math.sin(time * 0.015) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.75 + pulse * 0.25})`;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
  } else {
    ctx.strokeStyle = "rgba(56,189,248,0.5)";
    ctx.lineWidth = 2;
  }

  ctx.beginPath();
  ctx.moveTo(0, ceilingY);
  ctx.lineTo(CANVAS_WIDTH, ceilingY);
  ctx.stroke();

  // If warning active, draw glowing mechanical danger chevrons along ceiling
  if (isCeilingWarning) {
    ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    for (let x = 20; x < CANVAS_WIDTH; x += 36) {
      ctx.fillText("▼", x, ceilingY - 3);
    }
  }
  ctx.restore();

  // Side walls
  for (const x of [0, CANVAS_WIDTH]) {
    const wallGrad = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
    wallGrad.addColorStop(0, "rgba(56,189,248,0)");
    wallGrad.addColorStop(0.5, "rgba(56,189,248,0.2)");
    wallGrad.addColorStop(1, "rgba(56,189,248,0)");
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x - 4, 0, 8, CANVAS_HEIGHT);
  }

  // Shooter separator
  const sepY = CANVAS_HEIGHT - SHOOTER_AREA_HEIGHT;
  ctx.strokeStyle = "rgba(56,189,248,0.2)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(0, sepY);
  ctx.lineTo(CANVAS_WIDTH, sepY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  slideOffsetY: number = 0,
  topRowParity: number = 0,
) {
  ctx.save();
  // Clip grid area below the ceiling border so eggs sliding down emerge cleanly
  ctx.beginPath();
  ctx.rect(0, GRID_TOP_OFFSET - EGG_RADIUS - 2, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.clip();

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell) {
        const { x, y } = getXYFromRowCol(r, c, topRowParity);
        drawEgg(ctx, x, y + slideOffsetY, cell.color);
      }
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hook: useEggEngine
// ---------------------------------------------------------------------------

export interface EggEngineState {
  grid: Grid;
  phase: GamePhase;
  loadedColor: EggColor;
  nextColor: EggColor;
  stats: EggEngineStats;
}

export interface UseEggEngineReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  state: EggEngineState;
  startGame: () => void;
  togglePause: () => void;
  toggleMute: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function useEggEngine(): UseEggEngineReturn {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);

  // Game state refs
  const gridRef = useRef<Grid>(createEmptyGrid());
  const topRowParityRef = useRef<number>(0);
  const phaseRef = useRef<GamePhase>("ready");
  const scoreRef = useRef(0);
  const shotsFiredRef = useRef(0);
  const eggsPoppedRef = useRef(0);
  const clustersDroppedRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const foulsLeftRef = useRef(MAX_FOULS);
  const isPausedRef = useRef(false);
  const isMutedRef = useRef(false);

  // Difficulty & Descent countdown timer refs
  const levelRef = useRef<number>(1);
  const descentTimeLeftRef = useRef<number>(DIFFICULTY_LEVELS[0].descentTime);
  const maxDescentTimeRef = useRef<number>(DIFFICULTY_LEVELS[0].descentTime);
  const lastFrameTimeRef = useRef<number>(0);

  // Ceiling warning suspense & smooth slide refs
  const isCeilingWarningRef = useRef<boolean>(false);
  const warningStartTimeRef = useRef<number>(0);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCeilingSlidingRef = useRef<boolean>(false);
  const slideStartTimeRef = useRef<number>(0);
  const slideDurationRef = useRef<number>(450); // 450ms smooth descent
  const gridSlideOffsetRef = useRef<number>(0);

  // Shooter & physics
  const loadedColorRef = useRef<EggColor>(randomEggColor());
  const nextColorRef = useRef<EggColor>(randomEggColor());
  const recoilRef = useRef<number>(0);
  const flyingRef = useRef<FlyingEgg | null>(null);

  // Effects & popups
  const particlesRef = useRef<Particle[]>([]);
  const fallingEggsRef = useRef<FallingEgg[]>([]);
  const scorePopupsRef = useRef<ScorePopup[]>([]);
  const angleRef = useRef<number>(-Math.PI / 2);

  // React state
  const [state, setState] = useState<EggEngineState>({
    grid: createEmptyGrid(),
    phase: "ready",
    loadedColor: loadedColorRef.current,
    nextColor: nextColorRef.current,
    stats: {
      score: 0,
      shotsFired: 0,
      eggsPopped: 0,
      clustersDropped: 0,
      combo: 0,
      maxCombo: 0,
      foulsLeft: DIFFICULTY_LEVELS[0].foulTolerance,
      maxFouls: DIFFICULTY_LEVELS[0].foulTolerance,
      isPaused: false,
      isMuted: false,
      level: 1,
      levelName: DIFFICULTY_LEVELS[0].name,
      descentTimeLeft: DIFFICULTY_LEVELS[0].descentTime,
      maxDescentTime: DIFFICULTY_LEVELS[0].descentTime,
    },
  });

  const syncState = useCallback(() => {
    const currentDiff = getDifficultyForScore(scoreRef.current);
    setState({
      grid: gridRef.current,
      phase: phaseRef.current,
      loadedColor: loadedColorRef.current,
      nextColor: nextColorRef.current,
      stats: {
        score: scoreRef.current,
        shotsFired: shotsFiredRef.current,
        eggsPopped: eggsPoppedRef.current,
        clustersDropped: clustersDroppedRef.current,
        combo: comboRef.current,
        maxCombo: maxComboRef.current,
        foulsLeft: foulsLeftRef.current,
        maxFouls: currentDiff.foulTolerance,
        isPaused: isPausedRef.current,
        isMuted: isMutedRef.current,
        level: levelRef.current,
        levelName: currentDiff.name,
        descentTimeLeft: Math.max(0, descentTimeLeftRef.current),
        maxDescentTime: maxDescentTimeRef.current,
      },
    });
  }, []);

  // Initialize sound mute preference
  useEffect(() => {
    isMutedRef.current = getSoundMuted();
  }, []);

  // --- Particle & Popup helpers ---
  const spawnWallSparks = useCallback((x: number, y: number) => {
    playBounceSound();
    for (let i = 0; i < 5; i++) {
      const a = (Math.random() - 0.5) * Math.PI;
      const spd = 1.2 + Math.random() * 2.5;
      particlesRef.current.push({
        x,
        y,
        vx: (x <= EGG_RADIUS ? 1 : -1) * Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: "#93c5fd",
        radius: 1.5 + Math.random() * 2,
        alpha: 0.9,
        life: 14,
        maxLife: 14,
      });
    }
  }, []);

  const spawnPopParticles = useCallback((row: number, col: number) => {
    const pos = getXYFromRowCol(row, col, topRowParityRef.current);
    const cell = gridRef.current[row]?.[col];
    const color = cell?.color ?? "#fff";
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.4;
      const speed = 2 + Math.random() * 3.5;
      particlesRef.current.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        radius: 2 + Math.random() * 3,
        alpha: 1,
        life: 36,
        maxLife: 36,
      });
    }
  }, []);

  const spawnScorePopup = useCallback(
    (text: string, x: number, y: number, color: string = "#facc15") => {
      scorePopupsRef.current.push({
        text,
        x,
        y,
        vy: -1.3,
        alpha: 1,
        color,
      });
    },
    [],
  );

  // --- Check Danger Zone & Game Over Conditions ---
  const hasDangerEggs = useCallback((): boolean => {
    for (let r = DANGER_ROW; r < GRID_ROWS; r++) {
      if (!gridRef.current[r]) continue;
      for (let c = 0; c < gridRef.current[r].length; c++) {
        if (gridRef.current[r][c]) return true;
      }
    }
    return false;
  }, []);

  const checkGameOver = useCallback((): boolean => {
    // If any egg reached or exceeded the DEADLINE_ROW
    for (let r = DEADLINE_ROW; r < GRID_ROWS; r++) {
      if (!gridRef.current[r]) continue;
      for (let c = 0; c < gridRef.current[r].length; c++) {
        if (gridRef.current[r][c]) return true;
      }
    }
    return false;
  }, []);

  const checkVictory = useCallback((): boolean => {
    for (let r = 0; r < gridRef.current.length; r++) {
      for (let c = 0; c < gridRef.current[r].length; c++) {
        if (gridRef.current[r][c] !== null) return false;
      }
    }
    return true;
  }, []);

  // --- Ceiling Slide Down Mechanic (Time up or Misses penalty with smooth transition) ---
  const triggerCeilingSlide = useCallback(() => {
    isCeilingWarningRef.current = false;
    playWarningSound();

    const oldGrid = gridRef.current;
    const oldParity = topRowParityRef.current;
    const newParity = oldParity === 0 ? 1 : 0;
    topRowParityRef.current = newParity;

    const newGrid = createEmptyGrid(newParity);

    // Shift previous rows down by 1.
    // Because parity alternated, oldGrid[r].length === newGrid[r+1].length!
    for (let r = 0; r < GRID_ROWS - 1; r++) {
      for (let c = 0; c < oldGrid[r].length; c++) {
        const cell = oldGrid[r][c];
        if (cell) {
          newGrid[r + 1][c] = {
            color: cell.color,
            row: r + 1,
            col: c,
          };
        }
      }
    }

    // Generate random top row for row 0 using current unlocked level colors
    const currentDiff = getDifficultyForScore(scoreRef.current);
    const topRowCols = newGrid[0].length;
    for (let c = 0; c < topRowCols; c++) {
      newGrid[0][c] = {
        color: randomEggColor(currentDiff.unlockedColors),
        row: 0,
        col: c,
      };
    }

    gridRef.current = newGrid;

    // Start smooth gliding animation: starts offset by -ROW_HEIGHT and glides to 0
    gridSlideOffsetRef.current = -ROW_HEIGHT;
    slideStartTimeRef.current = performance.now();
    isCeilingSlidingRef.current = true;
    spawnScorePopup(
      "⚠️ CEILING DROPPED!",
      CANVAS_WIDTH / 2,
      GRID_TOP_OFFSET + 24,
      "#f97316",
    );
  }, [spawnScorePopup]);

  // Unified suspense warning before ceiling drops (from countdown time or foul misses)
  const triggerDescentSuspense = useCallback(
    (reason: "time" | "fouls") => {
      if (
        phaseRef.current === "descending" ||
        phaseRef.current === "gameover" ||
        phaseRef.current === "victory" ||
        isCeilingWarningRef.current ||
        isCeilingSlidingRef.current
      ) {
        return;
      }

      phaseRef.current = "descending";
      isCeilingWarningRef.current = true;
      warningStartTimeRef.current = performance.now();
      playWarningSound();

      const msg =
        reason === "time"
          ? "⏱️ TIME'S UP! CEILING DROPPING..."
          : "⚠️ MISSED SHOTS! CEILING DROPPING...";
      spawnScorePopup(msg, CANVAS_WIDTH / 2, GRID_TOP_OFFSET + 32, "#ef4444");

      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => {
        triggerCeilingSlide();
      }, 1400); // 1.4s suspense delay as requested!
    },
    [triggerCeilingSlide, spawnScorePopup],
  );

  // --- Snapping & Algorithm Execution ---
  const snapEgg = useCallback(
    (egg: FlyingEgg) => {
      flyingRef.current = null;
      shotsFiredRef.current++;

      const targetSlot = snapToNearestSlot(
        gridRef.current,
        egg.x,
        egg.y,
        topRowParityRef.current,
      );
      if (!targetSlot) {
        playGameOverSound();
        phaseRef.current = "gameover";
        return;
      }

      // Attach egg
      gridRef.current[targetSlot.row][targetSlot.col] = {
        color: egg.color,
        row: targetSlot.row,
        col: targetSlot.col,
      };

      // 1. Match-3 BFS
      const matches = findConnectedMatches(
        gridRef.current,
        targetSlot.row,
        targetSlot.col,
        topRowParityRef.current,
      );

      let didPop = false;

      if (matches.length >= 3) {
        didPop = true;
        comboRef.current++;
        if (comboRef.current > maxComboRef.current) {
          maxComboRef.current = comboRef.current;
        }

        playPopSound(comboRef.current);

        let avgX = 0;
        let avgY = 0;

        for (const { row: mr, col: mc } of matches) {
          const pos = getXYFromRowCol(mr, mc, topRowParityRef.current);
          avgX += pos.x;
          avgY += pos.y;
          spawnPopParticles(mr, mc);
          gridRef.current[mr][mc] = null;
        }

        avgX /= matches.length;
        avgY /= matches.length;

        eggsPoppedRef.current += matches.length;
        const comboMult = comboRef.current;
        const matchPoints = matches.length * 10 * comboMult;
        scoreRef.current += matchPoints;

        // Reward time bonus on Match-3 pop!
        const timeBonus = 2.0 + (comboMult - 1) * 1.0;
        const currentDiff = getDifficultyForScore(scoreRef.current);
        const maxCap = currentDiff.descentTime * 1.5;
        descentTimeLeftRef.current = Math.min(
          maxCap,
          descentTimeLeftRef.current + timeBonus,
        );

        const popupText =
          comboMult > 1
            ? `+${matchPoints} (${comboMult}x COMBO!)`
            : `+${matchPoints}`;
        spawnScorePopup(popupText, avgX, avgY, "#facc15");
        spawnScorePopup(`+${timeBonus.toFixed(1)}s TIME!`, avgX, avgY - 24, "#4ade80");

        // Check dynamic Level Up
        const newDiff = getDifficultyForScore(scoreRef.current);
        if (newDiff.level > levelRef.current) {
          levelRef.current = newDiff.level;
          maxDescentTimeRef.current = newDiff.descentTime;
          // Generous level-up time refill
          descentTimeLeftRef.current = Math.min(
            newDiff.descentTime * 1.2,
            descentTimeLeftRef.current + 4.5,
          );
          spawnScorePopup(
            `⭐ LEVEL ${newDiff.level}: ${newDiff.name.toUpperCase()}!`,
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 - 25,
            "#38bdf8",
          );
        }

        // 2. Orphan Drops BFS
        const orphans = findFloatingOrphans(
          gridRef.current,
          topRowParityRef.current,
        );
        if (orphans.length > 0) {
          playDropSound();
          clustersDroppedRef.current += orphans.length;

          let orphanAvgX = 0;
          let orphanAvgY = 0;

          for (const { row: or, col: oc } of orphans) {
            const pos = getXYFromRowCol(or, oc, topRowParityRef.current);
            orphanAvgX += pos.x;
            orphanAvgY += pos.y;
            const cell = gridRef.current[or][oc];
            if (cell) {
              fallingEggsRef.current.push({
                x: pos.x,
                y: pos.y,
                vx: (Math.random() - 0.5) * 2.8,
                vy: -1.6 - Math.random() * 2.2,
                color: cell.color,
                alpha: 1,
              });
            }
            gridRef.current[or][oc] = null;
          }

          orphanAvgX /= orphans.length;
          orphanAvgY /= orphans.length;

          const dropPoints = orphans.length * 25 * comboMult;
          scoreRef.current += dropPoints;
          const orphanTimeBonus = Math.min(3.0, orphans.length * 0.5);
          descentTimeLeftRef.current = Math.min(
            maxCap,
            descentTimeLeftRef.current + orphanTimeBonus,
          );

          spawnScorePopup(
            `+${dropPoints} DROP BONUS!`,
            orphanAvgX,
            orphanAvgY,
            "#38bdf8",
          );
        }

        // Check Victory
        if (checkVictory()) {
          scoreRef.current += 1000;
          spawnScorePopup(
            "🎉 ALL EGGS CLEARED! +1000",
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2,
            "#4ade80",
          );
          phaseRef.current = "victory";
          return;
        }
      } else {
        // No match -> Foul/Miss penalty
        comboRef.current = 0;
        foulsLeftRef.current--;
      }

      // 3. Reload next egg (the fired egg has landed on the grid)
      loadedColorRef.current = nextColorRef.current;
      const active = getActiveColors(gridRef.current);
      const diffNow = getDifficultyForScore(scoreRef.current);
      nextColorRef.current = randomEggColor(
        active.length > 0 ? active : diffNow.unlockedColors,
      );

      // 4. Check Game Over
      if (checkGameOver()) {
        playGameOverSound();
        phaseRef.current = "gameover";
        return;
      }

      // 5. Check if foul penalty or time expiry triggers ceiling descent
      if (foulsLeftRef.current <= 0) {
        triggerDescentSuspense("fouls");
      } else if (descentTimeLeftRef.current <= 0) {
        triggerDescentSuspense("time");
      } else {
        phaseRef.current = "aiming";
      }
    },
    [
      spawnPopParticles,
      spawnScorePopup,
      triggerDescentSuspense,
      checkGameOver,
      checkVictory,
    ],
  );

  // --- Sub-stepping Physics ---
  const updateFlyingEgg = useCallback(() => {
    const egg = flyingRef.current;
    if (!egg) return;

    const SUB_STEPS = 8; // 8 sub-steps for ultra-smooth 24px/frame flight with zero tunneling
    const dt = 1 / SUB_STEPS;
    const collisionDistSq = (EGG_DIAMETER * 0.94) ** 2;

    for (let s = 0; s < SUB_STEPS; s++) {
      egg.x += egg.vx * dt;
      egg.y += egg.vy * dt;

      if (Math.random() < 0.35) {
        particlesRef.current.push({
          x: egg.x,
          y: egg.y,
          vx: (Math.random() - 0.5) * 1.2,
          vy: (Math.random() - 0.5) * 1.2,
          color: egg.color,
          radius: 2 + Math.random() * 2,
          alpha: 0.7,
          life: 14,
          maxLife: 14,
        });
      }

      // Wall bouncing
      if (egg.x - EGG_RADIUS <= 0) {
        egg.x = EGG_RADIUS;
        egg.vx = Math.abs(egg.vx);
        spawnWallSparks(egg.x, egg.y);
      } else if (egg.x + EGG_RADIUS >= CANVAS_WIDTH) {
        egg.x = CANVAS_WIDTH - EGG_RADIUS;
        egg.vx = -Math.abs(egg.vx);
        spawnWallSparks(egg.x, egg.y);
      }

      // Ceiling hit
      if (egg.y - EGG_RADIUS <= GRID_TOP_OFFSET - EGG_RADIUS) {
        egg.y = GRID_TOP_OFFSET;
        snapEgg(egg);
        return;
      }

      // Stationary egg collision
      const grid = gridRef.current;
      const topRowParity = topRowParityRef.current;
      let collided = false;

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          const cell = grid[r][c];
          if (!cell) continue;
          const pos = getXYFromRowCol(r, c, topRowParity);
          const dx = egg.x - pos.x;
          const dy = egg.y - pos.y;
          if (dx * dx + dy * dy <= collisionDistSq) {
            collided = true;
            break;
          }
        }
        if (collided) break;
      }

      if (collided) {
        snapEgg(egg);
        return;
      }
    }
  }, [snapEgg, spawnWallSparks]);

  const updateParticles = useCallback(() => {
    const ps = particlesRef.current;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.radius *= 0.96;
      if (p.life <= 0) {
        ps.splice(i, 1);
      }
    }
  }, []);

  const updateFallingEggs = useCallback(() => {
    const eggs = fallingEggsRef.current;
    for (let i = eggs.length - 1; i >= 0; i--) {
      const e = eggs[i];
      e.vy += 0.55;
      e.x += e.vx;
      e.y += e.vy;
      e.alpha -= 0.015;
      if (e.y > CANVAS_HEIGHT + 50 || e.alpha <= 0) {
        eggs.splice(i, 1);
      }
    }
  }, []);

  const updateScorePopups = useCallback(() => {
    const popups = scorePopupsRef.current;
    for (let i = popups.length - 1; i >= 0; i--) {
      const p = popups[i];
      p.y += p.vy;
      p.alpha -= 0.02;
      if (p.alpha <= 0) {
        popups.splice(i, 1);
      }
    }
  }, []);

  // --- Overlay Modals (Game Over & Victory) ---
  const drawEndOverlay = useCallback(
    (ctx: CanvasRenderingContext2D, isVictory: boolean) => {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = isVictory ? "#4ade80" : "#f87171";
      ctx.font = "bold 32px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        isVictory ? "🎉 VICTORY!" : "GAME OVER",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 45,
      );

      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 22px 'Inter', sans-serif";
      ctx.fillText(
        `Score: ${scoreRef.current}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 5,
      );

      const diff = getDifficultyForScore(scoreRef.current);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 14px 'Inter', sans-serif";
      ctx.fillText(
        `Level ${levelRef.current}: ${diff.name}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 25,
      );

      ctx.fillStyle = "#94a3b8";
      ctx.font = "13px 'Inter', sans-serif";
      ctx.fillText(
        `Popped: ${eggsPoppedRef.current}  •  Dropped: ${clustersDroppedRef.current}  •  Max Combo: ${maxComboRef.current}x`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 50,
      );

      ctx.fillStyle = "rgba(56,189,248,0.9)";
      ctx.font = "bold 15px 'Inter', sans-serif";
      ctx.fillText(
        "Click to Play Again",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 88,
      );

      ctx.restore();
    },
    [],
  );

  // --- RAF Main Loop ---
  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (!isPausedRef.current) {
        const now = performance.now();
        const dt =
          lastFrameTimeRef.current > 0
            ? Math.min(0.1, (now - lastFrameTimeRef.current) / 1000)
            : 0.016;
        lastFrameTimeRef.current = now;

        // Descent timer ticks down during active gameplay
        if (
          phaseRef.current === "aiming" ||
          phaseRef.current === "firing"
        ) {
          // If eggs are near danger line, countdown runs 1.25x faster for tension!
          const speedMult = hasDangerEggs() ? 1.25 : 1.0;
          descentTimeLeftRef.current = Math.max(
            0,
            descentTimeLeftRef.current - dt * speedMult,
          );

          if (
            phaseRef.current === "aiming" &&
            descentTimeLeftRef.current <= 0 &&
            !isCeilingWarningRef.current &&
            !isCeilingSlidingRef.current
          ) {
            triggerDescentSuspense("time");
          }
        }

        if (recoilRef.current > 0) {
          recoilRef.current = Math.max(0, recoilRef.current * 0.82 - 0.1);
        }

        updateFlyingEgg();
        updateParticles();
        updateFallingEggs();
        updateScorePopups();

        // Smooth ceiling descent interpolation
        if (isCeilingSlidingRef.current) {
          const elapsed = performance.now() - slideStartTimeRef.current;
          const dur = slideDurationRef.current; // 450ms
          const progress = Math.min(1, elapsed / dur);
          // Ease-out cubic for a silky smooth glide into position
          const ease = 1 - Math.pow(1 - progress, 3);
          gridSlideOffsetRef.current = -ROW_HEIGHT * (1 - ease);

          if (progress >= 1) {
            gridSlideOffsetRef.current = 0;
            isCeilingSlidingRef.current = false;

            const currentDiff = getDifficultyForScore(scoreRef.current);
            foulsLeftRef.current = currentDiff.foulTolerance;
            descentTimeLeftRef.current = currentDiff.descentTime;

            if (checkGameOver()) {
              playGameOverSound();
              phaseRef.current = "gameover";
            } else {
              // Resume aiming with currently loaded egg (do not discard or replace player's ball)
              phaseRef.current = "aiming";
            }
          }
        }
      } else {
        lastFrameTimeRef.current = performance.now();
      }

      // Draw game layers
      drawBackground(ctx, isCeilingWarningRef.current, time);
      drawGrid(
        ctx,
        gridRef.current,
        gridSlideOffsetRef.current,
        topRowParityRef.current,
      );
      drawDescentTimer(
        ctx,
        descentTimeLeftRef.current,
        maxDescentTimeRef.current,
        isCeilingWarningRef.current,
        time,
      );
      drawDangerLine(ctx, hasDangerEggs(), time);
      drawFallingEggs(ctx, fallingEggsRef.current);
      drawParticles(ctx, particlesRef.current);
      drawScorePopups(ctx, scorePopupsRef.current);

      const flying = flyingRef.current;
      if (flying) {
        drawEgg(ctx, flying.x, flying.y, flying.color);
      }

      if (phaseRef.current !== "gameover" && phaseRef.current !== "victory") {
        const currentDiff = getDifficultyForScore(scoreRef.current);
        drawShooter(
          ctx,
          angleRef.current,
          loadedColorRef.current,
          nextColorRef.current,
          recoilRef.current,
          foulsLeftRef.current,
          currentDiff.foulTolerance,
          phaseRef.current === "descending",
          isCeilingWarningRef.current,
        );

        if (isPausedRef.current) {
          ctx.save();
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 28px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("PAUSED", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "14px 'Inter', sans-serif";
          ctx.fillText("Press P or click Resume", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
          ctx.restore();
        }
      } else {
        drawEndOverlay(ctx, phaseRef.current === "victory");
      }

      syncState();
      rafRef.current = requestAnimationFrame(render);
    },
    [
      updateFlyingEgg,
      updateParticles,
      updateFallingEggs,
      updateScorePopups,
      hasDangerEggs,
      checkGameOver,
      drawEndOverlay,
      triggerDescentSuspense,
      syncState,
    ],
  );

  // --- Input handling ---
  const updateAimAngle = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    let angle = Math.atan2(my - SHOOTER_Y, mx - SHOOTER_X);
    if (angle > 0) {
      angle = mx < SHOOTER_X ? -(Math.PI - MIN_ANGLE) : -MIN_ANGLE;
    } else {
      angle = Math.max(-(Math.PI - MIN_ANGLE), Math.min(-MIN_ANGLE, angle));
    }
    angleRef.current = angle;
  }, []);

  const shootEgg = useCallback(() => {
    if (isPausedRef.current) return;

    if (phaseRef.current === "gameover" || phaseRef.current === "victory") {
      startGame();
      return;
    }

    if (phaseRef.current !== "aiming") return;

    playShootSound();
    const angle = angleRef.current;
    recoilRef.current = 8;

    flyingRef.current = {
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.cos(angle) * EGG_SPEED,
      vy: Math.sin(angle) * EGG_SPEED,
      color: loadedColorRef.current,
    };

    phaseRef.current = "firing";
  }, []);

  const startGame = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    isCeilingWarningRef.current = false;
    isCeilingSlidingRef.current = false;
    gridSlideOffsetRef.current = 0;
    topRowParityRef.current = 0;

    const initDiff = DIFFICULTY_LEVELS[0];
    levelRef.current = 1;
    maxDescentTimeRef.current = initDiff.descentTime;
    descentTimeLeftRef.current = initDiff.descentTime;
    lastFrameTimeRef.current = 0;
    foulsLeftRef.current = initDiff.foulTolerance;

    gridRef.current = populateGrid(INITIAL_ROWS, 0, initDiff.unlockedColors);
    scoreRef.current = 0;
    shotsFiredRef.current = 0;
    eggsPoppedRef.current = 0;
    clustersDroppedRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    flyingRef.current = null;
    particlesRef.current = [];
    fallingEggsRef.current = [];
    scorePopupsRef.current = [];
    recoilRef.current = 0;
    isPausedRef.current = false;

    const active = getActiveColors(gridRef.current);
    loadedColorRef.current = randomEggColor(active);
    nextColorRef.current = randomEggColor(active);

    phaseRef.current = "aiming";
    syncState();
  }, [syncState]);

  const togglePause = useCallback(() => {
    if (phaseRef.current === "gameover" || phaseRef.current === "victory") return;
    isPausedRef.current = !isPausedRef.current;
    syncState();
  }, [syncState]);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMutedRef.current;
    isMutedRef.current = nextMuted;
    setSoundMuted(nextMuted);
    syncState();
  }, [syncState]);

  // Pointer & keyboard event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerMove = (e: PointerEvent) => {
      updateAimAngle(e.clientX, e.clientY);
    };

    const onPointerDown = (e: PointerEvent) => {
      updateAimAngle(e.clientX, e.clientY);
      shootEgg();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "p" || e.key === "P") {
        togglePause();
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      } else if (e.key === " " && isPausedRef.current) {
        togglePause();
      }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [render, updateAimAngle, shootEgg, togglePause, toggleMute]);

  return {
    canvasRef,
    state,
    startGame,
    togglePause,
    toggleMute,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
  };
}

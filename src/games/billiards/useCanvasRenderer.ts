"use client";

import { useCallback, useRef } from "react";
import Matter from "matter-js";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  CUSHION_WIDTH,
  POCKET_RADIUS,
  BALL_RADIUS,
  BALL_CONFIGS,
  POCKET_POSITIONS,
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
  MAX_DRAG_DISTANCE,
  type BallConfig,
} from "./constants";
import type { AimState } from "./useAiming";

// ─── Cached lookup: label -> BallConfig ──────────────────────────────────────

const BALL_CONFIG_MAP = new Map<string, BallConfig>();
for (const cfg of BALL_CONFIGS) {
  BALL_CONFIG_MAP.set(cfg.label, cfg);
}

// ─── Table drawing ──────────────────────────────────────────────────────────

function drawTableSurface(ctx: CanvasRenderingContext2D) {
  // Outer wood frame
  ctx.fillStyle = "#5D3A1A";
  ctx.fillRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

  // Inner wood bevel
  const bevel = 4;
  ctx.fillStyle = "#7A4E2D";
  ctx.fillRect(bevel, bevel, TABLE_WIDTH - bevel * 2, TABLE_HEIGHT - bevel * 2);

  // Cushion rail (dark green)
  ctx.fillStyle = "#2d5a1e";
  ctx.fillRect(
    bevel * 2,
    bevel * 2,
    TABLE_WIDTH - bevel * 4,
    TABLE_HEIGHT - bevel * 4
  );

  // Felt / play surface (brighter green)
  ctx.fillStyle = "#1B7A3D";
  ctx.fillRect(PLAY_LEFT, PLAY_TOP, PLAY_RIGHT - PLAY_LEFT, PLAY_BOTTOM - PLAY_TOP);

  // Subtle felt texture via random dots (drawn once and cached in practice,
  // but since we redraw every frame we keep it subtle)
  ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
  // Simple stripe pattern to hint at cloth grain
  for (let y = PLAY_TOP; y < PLAY_BOTTOM; y += 6) {
    ctx.fillRect(PLAY_LEFT, y, PLAY_RIGHT - PLAY_LEFT, 1);
  }
}

// ─── Pocket drawing ─────────────────────────────────────────────────────────

function drawPockets(ctx: CanvasRenderingContext2D) {
  for (const pocket of POCKET_POSITIONS) {
    // Outer shadow ring
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS + 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();

    // Pocket hole
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#0a0a0a";
    ctx.fill();

    // Inner bevel highlight
    ctx.beginPath();
    ctx.arc(pocket.x, pocket.y, POCKET_RADIUS - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#111111";
    ctx.fill();
  }
}

// ─── Diamond sights on rails ────────────────────────────────────────────────

function drawRailDiamonds(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#C4A265"; // brass/gold colour
  const diamondSize = 4;
  const playW = PLAY_RIGHT - PLAY_LEFT;
  const playH = PLAY_BOTTOM - PLAY_TOP;

  // Top & bottom rails: 7 diamonds evenly spaced (excluding pockets)
  for (let i = 1; i <= 7; i++) {
    const x = PLAY_LEFT + (playW / 8) * i;
    // Top rail
    drawDiamond(ctx, x, PLAY_TOP - CUSHION_WIDTH / 2, diamondSize);
    // Bottom rail
    drawDiamond(ctx, x, PLAY_BOTTOM + CUSHION_WIDTH / 2, diamondSize);
  }

  // Left & right rails: 3 diamonds
  for (let i = 1; i <= 3; i++) {
    const y = PLAY_TOP + (playH / 4) * i;
    // Left rail
    drawDiamond(ctx, PLAY_LEFT - CUSHION_WIDTH / 2, y, diamondSize);
    // Right rail
    drawDiamond(ctx, PLAY_RIGHT + CUSHION_WIDTH / 2, y, diamondSize);
  }
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.6, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.6, cy);
  ctx.closePath();
  ctx.fill();
}

// ─── Head string line ───────────────────────────────────────────────────────

function drawHeadString(ctx: CanvasRenderingContext2D) {
  const headX = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.25;
  ctx.beginPath();
  ctx.setLineDash([4, 6]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.moveTo(headX, PLAY_TOP);
  ctx.lineTo(headX, PLAY_BOTTOM);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ─── Foot spot ──────────────────────────────────────────────────────────────

function drawFootSpot(ctx: CanvasRenderingContext2D) {
  const footX = PLAY_LEFT + (PLAY_RIGHT - PLAY_LEFT) * 0.73;
  const footY = TABLE_HEIGHT / 2;
  ctx.beginPath();
  ctx.arc(footX, footY, 3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
  ctx.fill();
}

// ─── Ball drawing ───────────────────────────────────────────────────────────

function drawBallAt(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  r = BALL_RADIUS
) {
  const cfg = BALL_CONFIG_MAP.get(label);
  if (!cfg) return;

  // Shadow
  ctx.beginPath();
  ctx.arc(x + 2, y + 2, r, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fill();

  if (cfg.type === "stripe" && cfg.stripeColor) {
    // Stripe ball: white base with colored stripe band
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // Colored stripe band (horizontal band in the middle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = cfg.stripeColor;
    const bandHeight = r * 1.1;
    ctx.fillRect(x - r, y - bandHeight / 2, r * 2, bandHeight);
    ctx.restore();
  } else {
    // Solid ball or cue ball: single color
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = cfg.color;
    ctx.fill();
  }

  // Number circle (not for cue ball)
  if (cfg.number > 0) {
    // White circle background for number
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();

    // Number text
    ctx.fillStyle = "#000000";
    ctx.font = `bold ${Math.round(r * 0.7)}px "Inter", "SF Pro", system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(cfg.number), x, y + 0.5);
  }

  // Specular highlight (shiny gloss)
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  grad.addColorStop(0, "rgba(255,255,255,0.45)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.08)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Outer edge
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawBall(ctx: CanvasRenderingContext2D, body: Matter.Body) {
  drawBallAt(ctx, body.label, body.position.x, body.position.y, BALL_RADIUS);
}

// ─── Aiming Overlay Drawing ─────────────────────────────────────────────────

function drawAimingOverlay(ctx: CanvasRenderingContext2D, aim: AimState) {
  if (!aim.isDragging || aim.dragDistance < 5) return;

  const { origin, aimDir, power, pointer } = aim;

  // ── 1. Dotted aim line from cue ball toward the target ──────────────
  const aimLineLength = 300;
  const endX = origin.x + aimDir.x * aimLineLength;
  const endY = origin.y + aimDir.y * aimLineLength;

  ctx.save();
  ctx.beginPath();
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // ── 2. Ghost ball (predicted first contact position) ────────────────
  const ghostDist = 60;
  const ghostX = origin.x + aimDir.x * ghostDist;
  const ghostY = origin.y + aimDir.y * ghostDist;
  ctx.beginPath();
  ctx.arc(ghostX, ghostY, BALL_RADIUS, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── 3. Cue stick ───────────────────────────────────────────────────
  // The stick extends from behind the cue ball, pulling back as power increases
  const stickLength = 180;
  const stickPullback = power * 60; // pull back up to 60px
  const stickGap = BALL_RADIUS + 4 + stickPullback; // gap between ball and stick tip

  // Stick starts behind the cue ball (opposite to aim direction)
  const stickStartX = origin.x - aimDir.x * stickGap;
  const stickStartY = origin.y - aimDir.y * stickGap;
  const stickEndX = origin.x - aimDir.x * (stickGap + stickLength);
  const stickEndY = origin.y - aimDir.y * (stickGap + stickLength);

  // Stick shadow
  ctx.beginPath();
  ctx.moveTo(stickStartX + 1.5, stickStartY + 1.5);
  ctx.lineTo(stickEndX + 1.5, stickEndY + 1.5);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.stroke();

  // Stick body (tapered: tip is thinner)
  const gradient = ctx.createLinearGradient(stickStartX, stickStartY, stickEndX, stickEndY);
  gradient.addColorStop(0, "#D4A855"); // tip: lighter maple
  gradient.addColorStop(0.15, "#C49442"); // ferrule transition
  gradient.addColorStop(0.2, "#8B6914"); // main shaft
  gradient.addColorStop(1, "#5D3A1A"); // butt: darker wood

  // Tip section (thinner)
  ctx.beginPath();
  ctx.moveTo(stickStartX, stickStartY);
  const midX = stickStartX + (stickEndX - stickStartX) * 0.15;
  const midY = stickStartY + (stickEndY - stickStartY) * 0.15;
  ctx.lineTo(midX, midY);
  ctx.strokeStyle = "#F5E6C8"; // white ferrule
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.stroke();

  // Main shaft
  ctx.beginPath();
  ctx.moveTo(midX, midY);
  ctx.lineTo(stickEndX, stickEndY);
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();

  // Stick highlight (gloss)
  ctx.beginPath();
  ctx.moveTo(stickStartX + aimDir.y * 1, stickStartY - aimDir.x * 1);
  ctx.lineTo(stickEndX + aimDir.y * 1, stickEndY - aimDir.x * 1);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── 4. Cue ball highlight ring ─────────────────────────────────────
  ctx.beginPath();
  ctx.arc(origin.x, origin.y, BALL_RADIUS + 3, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + power * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
}

// ─── Sinking Balls Animation ────────────────────────────────────────────────

interface SinkingBall {
  label: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  startTime: number;
  duration: number;
}

// ─── Ball In Hand Overlay ───────────────────────────────────────────────────

export interface BallInHandRenderState {
  active: boolean;
  isValid: boolean;
  isDragging: boolean;
}

function drawBallInHandOverlay(
  ctx: CanvasRenderingContext2D,
  cueBall: Matter.Body,
  isValid: boolean,
  isDragging: boolean
) {
  const { x, y } = cueBall.position;
  ctx.save();

  const color = isValid ? "#10b981" : "#ef4444";
  const glowColor = isValid ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)";

  // Outer dashed halo
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS + 9, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 4]);
  ctx.stroke();

  // Subtle filled glow inside halo
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS + 9, 0, Math.PI * 2);
  ctx.fillStyle = glowColor;
  ctx.fill();

  // 4 Directional Arrows (North, South, East, West)
  const arrOffset = BALL_RADIUS + 15;
  const arrLen = 5;
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";

  // North arrow
  ctx.beginPath();
  ctx.moveTo(x, y - arrOffset);
  ctx.lineTo(x, y - arrOffset - arrLen);
  ctx.lineTo(x - 2.5, y - arrOffset - arrLen + 2.5);
  ctx.moveTo(x, y - arrOffset - arrLen);
  ctx.lineTo(x + 2.5, y - arrOffset - arrLen + 2.5);
  ctx.stroke();

  // South arrow
  ctx.beginPath();
  ctx.moveTo(x, y + arrOffset);
  ctx.lineTo(x, y + arrOffset + arrLen);
  ctx.lineTo(x - 2.5, y + arrOffset + arrLen - 2.5);
  ctx.moveTo(x, y + arrOffset + arrLen);
  ctx.lineTo(x + 2.5, y + arrOffset + arrLen - 2.5);
  ctx.stroke();

  // West arrow
  ctx.beginPath();
  ctx.moveTo(x - arrOffset, y);
  ctx.lineTo(x - arrOffset - arrLen, y);
  ctx.lineTo(x - arrOffset - arrLen + 2.5, y - 2.5);
  ctx.moveTo(x - arrOffset - arrLen, y);
  ctx.lineTo(x - arrOffset - arrLen + 2.5, y + 2.5);
  ctx.stroke();

  // East arrow
  ctx.beginPath();
  ctx.moveTo(x + arrOffset, y);
  ctx.lineTo(x + arrOffset + arrLen, y);
  ctx.lineTo(x + arrOffset + arrLen - 2.5, y - 2.5);
  ctx.moveTo(x + arrOffset + arrLen, y);
  ctx.lineTo(x + arrOffset + arrLen - 2.5, y + 2.5);
  ctx.stroke();

  // Floating label badge
  const labelText = isDragging
    ? isValid ? "✓ Release to place" : "✕ Overlapping ball!"
    : isValid ? "🖐️ Drag to reposition" : "⚠️ Move to empty felt";

  ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  const metrics = ctx.measureText(labelText);
  const pillW = metrics.width + 16;
  const pillH = 20;
  const pillY = y - BALL_RADIUS - 30;

  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.beginPath();
  ctx.roundRect(x - pillW / 2, pillY, pillW, pillH, 6);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.fillText(labelText, x, pillY + 14);

  ctx.restore();
}

// ─── The Hook ───────────────────────────────────────────────────────────────

export function useCanvasRenderer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRenderRef = useRef<number>(0);
  const sinkingBallsRef = useRef<SinkingBall[]>([]);

  const addSinkingBall = useCallback(
    (
      label: string,
      startPos: { x: number; y: number },
      targetPocketPos: { x: number; y: number }
    ) => {
      sinkingBallsRef.current.push({
        label,
        startX: startPos.x,
        startY: startPos.y,
        targetX: targetPocketPos.x,
        targetY: targetPocketPos.y,
        startTime: performance.now(),
        duration: 250, // 250ms smooth drop into hole
      });
    },
    []
  );

  const clearSinkingBalls = useCallback(() => {
    sinkingBallsRef.current = [];
  }, []);

  /**
   * Draw a single complete frame: table + cushions + pockets + balls + aiming overlay + ball-in-hand overlay.
   * Called each requestAnimationFrame tick from the game component.
   */
  const drawFrame = useCallback((
    balls: Matter.Body[],
    aimState?: AimState,
    ballInHandState?: BallInHandRenderState
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, TABLE_WIDTH, TABLE_HEIGHT);

    // 1. Table surface
    drawTableSurface(ctx);

    // 2. Head string & foot spot
    drawHeadString(ctx);
    drawFootSpot(ctx);

    // 3. Pockets (drawn under the cushion visual)
    drawPockets(ctx);

    // 3.5 Sinking balls animation (dropping into holes, shrinking & fading)
    const now = performance.now();
    sinkingBallsRef.current = sinkingBallsRef.current.filter((s) => {
      const elapsed = now - s.startTime;
      const progress = Math.min(1, elapsed / s.duration);
      if (progress >= 1) return false; // finished, drop from list

      const ease = progress * (2 - progress); // ease-out curve
      const curX = s.startX + (s.targetX - s.startX) * ease;
      const curY = s.startY + (s.targetY - s.startY) * ease;
      const scale = Math.max(0.05, 1 - progress * 0.7);
      const alpha = Math.max(0, 1 - progress * 0.9);

      ctx.save();
      ctx.globalAlpha = alpha;
      drawBallAt(ctx, s.label, curX, curY, BALL_RADIUS * scale);
      ctx.restore();
      return true;
    });

    // 4. Rail diamond sights
    drawRailDiamonds(ctx);

    // 5. Balls (draw active balls still in the world)
    for (const ball of balls) {
      if (ball.label.startsWith("ball-")) {
        drawBall(ctx, ball);
      }
    }

    // 6. Ball In Hand Overlay (if active)
    if (ballInHandState?.active) {
      const cueBall = balls.find((b) => b.label === BALL_CONFIGS[0].label);
      if (cueBall) {
        drawBallInHandOverlay(
          ctx,
          cueBall,
          ballInHandState.isValid,
          ballInHandState.isDragging
        );
      }
    }

    // 7. Aiming overlay (drawn on top of everything)
    if (aimState && !ballInHandState?.active) {
      drawAimingOverlay(ctx, aimState);
    }
  }, []);

  /**
   * Start a render loop that calls drawFrame each animation frame.
   * The physics updates happen in a separate fixed-timestep loop (usePhysicsEngine).
   * This render loop simply reads current body positions and draws them.
   */
  const startRenderLoop = useCallback(
    (
      getBalls: () => Matter.Body[],
      getAimState?: () => AimState | undefined,
      getBallInHandState?: () => BallInHandRenderState | undefined
    ) => {
      const loop = () => {
        drawFrame(getBalls(), getAimState?.(), getBallInHandState?.());
        rafRenderRef.current = requestAnimationFrame(loop);
      };
      rafRenderRef.current = requestAnimationFrame(loop);
    },
    [drawFrame]
  );

  const stopRenderLoop = useCallback(() => {
    if (rafRenderRef.current) {
      cancelAnimationFrame(rafRenderRef.current);
      rafRenderRef.current = 0;
    }
  }, []);

  return {
    canvasRef,
    drawFrame,
    startRenderLoop,
    stopRenderLoop,
    addSinkingBall,
    clearSinkingBalls,
  };
}


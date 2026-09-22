import type { Point, SnakeEngineConfig } from "./types";

export interface RenderState {
  snake: Point[];
  food: Point;
  config: SnakeEngineConfig;
  isDark?: boolean;
}

/**
 * renderSnakeCanvas — Extreme Performance Canvas Renderer with Light & Dark Theme Support.
 *
 * Implements the "Fake Neon" dual-rectangle technique without expensive shadow APIs:
 * - STRICTLY FORBIDDEN: No `ctx.shadowBlur` or `ctx.shadowColor`.
 * - For each entity (Food, Body, Head), two rectangles are drawn:
 *   1. Glow rectangle: slightly larger than the tile with low opacity.
 *   2. Core rectangle: smaller, centered, with high-contrast color (alpha 1.0).
 * - Canvas clear & redraw runs ONLY when state changes (on movement tick).
 */
export function renderSnakeCanvas(
  ctx: CanvasRenderingContext2D,
  state: RenderState
): void {
  const { snake, food, config } = state;
  const { gridSize, tileSize } = config;
  const width = gridSize * tileSize;
  const height = gridSize * tileSize;

  // Determine current theme mode
  const isDark =
    state.isDark ??
    (typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  // 1. Clear background
  // Light mode: Clean soft slate (#f8fafc) matching site background
  // Dark mode: Deep modern dark slate (#0b1120)
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = isDark ? "#0b1120" : "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Grid Lines (single stroke path for peak performance)
  ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.35)" : "rgba(203, 213, 225, 0.65)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= gridSize; i++) {
    const pos = i * tileSize + 0.5;
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, height);
    ctx.moveTo(0, pos);
    ctx.lineTo(width, pos);
  }
  ctx.stroke();

  // 3. Draw Food
  if (food) {
    const fx = food.x * tileSize;
    const fy = food.y * tileSize;

    // 1st Rectangle: The Glow
    ctx.globalAlpha = isDark ? 0.35 : 0.22;
    ctx.fillStyle = isDark ? "#f43f5e" : "#fb7185";
    ctx.fillRect(fx - 2, fy - 2, tileSize + 4, tileSize + 4);

    // 2nd Rectangle: The Core
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = isDark ? "#fb7185" : "#e11d48";
    ctx.fillRect(fx + 3, fy + 3, tileSize - 6, tileSize - 6);

    // Center filament
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(fx + 6, fy + 6, tileSize - 12, tileSize - 12);
  }

  // 4. Draw Snake Body
  for (let i = snake.length - 1; i >= 1; i--) {
    const segment = snake[i];
    const bx = segment.x * tileSize;
    const by = segment.y * tileSize;

    const isAlt = i % 2 === 0;
    const glowColor = isDark
      ? isAlt
        ? "#818cf8"
        : "#a855f7"
      : isAlt
      ? "#93c5fd"
      : "#c4b5fd";
    const coreColor = isDark
      ? isAlt
        ? "#6366f1"
        : "#8b5cf6"
      : isAlt
      ? "#3b82f6"
      : "#7c3aed";
    const innerAccent = isDark ? "#c084fc" : "#ffffff";

    // 1st Rectangle: Glow
    ctx.globalAlpha = isDark ? 0.26 : 0.18;
    ctx.fillStyle = glowColor;
    ctx.fillRect(bx - 2, by - 2, tileSize + 4, tileSize + 4);

    // 2nd Rectangle: Core
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = coreColor;
    ctx.fillRect(bx + 2, by + 2, tileSize - 4, tileSize - 4);

    // Inner bright accent
    ctx.fillStyle = innerAccent;
    ctx.fillRect(bx + 5, by + 5, tileSize - 10, tileSize - 10);
  }

  // 5. Draw Snake Head
  if (snake.length > 0) {
    const head = snake[0];
    const hx = head.x * tileSize;
    const hy = head.y * tileSize;

    // 1st Rectangle: Glow
    ctx.globalAlpha = isDark ? 0.35 : 0.22;
    ctx.fillStyle = isDark ? "#06b6d4" : "#38bdf8";
    ctx.fillRect(hx - 3, hy - 3, tileSize + 6, tileSize + 6);

    // 2nd Rectangle: Core
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = isDark ? "#22d3ee" : "#0284c7";
    ctx.fillRect(hx + 2, hy + 2, tileSize - 4, tileSize - 4);

    // Inner highlight
    ctx.fillStyle = isDark ? "#e0f2fe" : "#ffffff";
    ctx.fillRect(hx + 5, hy + 5, tileSize - 10, tileSize - 10);
  }

  // Reset alpha
  ctx.globalAlpha = 1.0;
}

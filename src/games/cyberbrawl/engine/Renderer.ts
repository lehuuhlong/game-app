/**
 * Cyber Brawl — Canvas Renderer
 *
 * Pure rendering pipeline. Reads the CombatSnapshot (read-only) and
 * paints every frame to a 2D canvas context. Zero game logic lives here.
 *
 * Features:
 *   - Cyberpunk-themed arena (neon grid floor, gradient sky, scanlines)
 *   - Fighter body rendering with stance-based shapes and attack poses
 *   - Hit-flash visual feedback (white flash on damage)
 *   - Round announcements (ROUND X — FIGHT!, KO, MATCH OVER)
 *   - Toggleable Debug Mode (Tab key or external call):
 *       Blue  = Pushbox
 *       Green = Hurtbox
 *       Red   = Hitbox
 *
 * The renderer is refresh-rate independent — it simply paints whatever
 * the current snapshot says. The simulation runs on a fixed timestep
 * independently.
 */

import type { CombatSnapshot } from './CombatSystem';
import type { AABB, ArenaConfig, FighterRuntimeState } from './types';
import { FighterState, RoundPhase } from './types';

// ─── Color Palette (Cyberpunk) ───────────────────────────────────────────────

const COLORS = {
  // Arena
  skyTop: '#0a0a1a',
  skyBottom: '#1a0a2e',
  floorLine: '#00f0ff',
  floorGrid: 'rgba(0, 240, 255, 0.08)',
  floorGlow: 'rgba(0, 240, 255, 0.15)',
  scanline: 'rgba(0, 0, 0, 0.04)',

  // Fighters
  p1Body: '#ff3366',
  p1Accent: '#ff6699',
  p1Glow: 'rgba(255, 51, 102, 0.3)',
  p2Body: '#33ccff',
  p2Accent: '#66ddff',
  p2Glow: 'rgba(51, 204, 255, 0.3)',

  // Hit flash
  hitFlash: 'rgba(255, 255, 255, 0.8)',

  // Debug boxes
  debugPushbox: 'rgba(0, 120, 255, 0.7)',
  debugHurtbox: 'rgba(0, 255, 80, 0.7)',
  debugHitbox: 'rgba(255, 40, 40, 0.85)',

  // UI text
  textPrimary: '#ffffff',
  textGlow: '#00f0ff',
  textKO: '#ff3366',
  textFight: '#ffcc00',
} as const;

// ─── Renderer Class ──────────────────────────────────────────────────────────

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly arena: ArenaConfig;
  private debugMode: boolean = false;

  /** Frame counter for animation effects (scanline scrolling, etc.) */
  private frameCount: number = 0;

  /** Per-fighter hit flash timer (frames remaining). */
  private hitFlashTimers: [number, number] = [0, 0];

  constructor(canvas: HTMLCanvasElement, arena: ArenaConfig) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');

    this.ctx = ctx;
    this.arena = arena;

    // Set canvas resolution
    canvas.width = arena.width;
    canvas.height = arena.height;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  /** Toggle debug overlay on/off. */
  public toggleDebug(): void {
    this.debugMode = !this.debugMode;
  }

  /** Set debug mode explicitly. */
  public setDebug(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /** Get current debug mode state. */
  public isDebugEnabled(): boolean {
    return this.debugMode;
  }

  /** Trigger a hit flash for a specific player (called on HIT_LANDED event). */
  public triggerHitFlash(playerIndex: 0 | 1): void {
    this.hitFlashTimers[playerIndex] = 6; // 6 frames of flash
  }

  /**
   * Main render call. Paints the entire frame from a snapshot.
   * Called once per requestAnimationFrame — NOT once per simulation tick.
   */
  public render(snapshot: CombatSnapshot): void {
    const { ctx, arena } = this;
    this.frameCount++;

    // Tick down hit flash timers
    if (this.hitFlashTimers[0] > 0) this.hitFlashTimers[0]--;
    if (this.hitFlashTimers[1] > 0) this.hitFlashTimers[1]--;

    // ── Clear ──
    ctx.clearRect(0, 0, arena.width, arena.height);

    // ── Background ──
    this.drawBackground();

    // ── Floor ──
    this.drawFloor();

    // ── Fighters ──
    this.drawFighter(snapshot.fighters[0], 0);
    this.drawFighter(snapshot.fighters[1], 1);

    // ── Debug overlay ──
    if (this.debugMode) {
      this.drawDebugOverlay(snapshot);
    }

    // ── Phase overlays (announcements) ──
    this.drawPhaseOverlay(snapshot);

    // ── Scanlines (subtle CRT effect) ──
    this.drawScanlines();

    // ── Debug mode indicator ──
    if (this.debugMode) {
      this.drawDebugIndicator();
    }
  }

  // ─── Background ──────────────────────────────────────────────────────────

  private drawBackground(): void {
    const { ctx, arena } = this;

    // Vertical gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
    gradient.addColorStop(0, COLORS.skyTop);
    gradient.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, arena.width, arena.height);

    // Distant city skyline silhouette
    this.drawSkyline();
  }

  private drawSkyline(): void {
    const { ctx, arena } = this;
    const baseY = arena.floorY - 10;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
    ctx.beginPath();
    ctx.moveTo(0, baseY);

    // Procedural buildings
    const buildings = [
      { x: 30, w: 50, h: 120 },
      { x: 90, w: 35, h: 80 },
      { x: 140, w: 60, h: 160 },
      { x: 220, w: 40, h: 100 },
      { x: 280, w: 70, h: 200 },
      { x: 370, w: 45, h: 130 },
      { x: 430, w: 55, h: 90 },
      { x: 500, w: 80, h: 220 },
      { x: 600, w: 50, h: 150 },
      { x: 670, w: 65, h: 170 },
      { x: 750, w: 40, h: 110 },
      { x: 810, w: 70, h: 190 },
      { x: 900, w: 55, h: 140 },
      { x: 970, w: 54, h: 100 },
    ];

    buildings.forEach(({ x, w, h }) => {
      ctx.lineTo(x, baseY);
      ctx.lineTo(x, baseY - h);
      ctx.lineTo(x + w, baseY - h);
      ctx.lineTo(x + w, baseY);
    });

    ctx.lineTo(arena.width, baseY);
    ctx.closePath();
    ctx.fill();

    // Neon window dots on buildings
    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    buildings.forEach(({ x, w, h }) => {
      const cols = Math.floor(w / 12);
      const rows = Math.floor(h / 16);
      for (let r = 1; r < rows; r++) {
        for (let c = 1; c < cols; c++) {
          // Pseudo-random: only light ~40% of windows
          if (((x * 7 + r * 13 + c * 31 + this.frameCount * 0) % 10) < 4) {
            ctx.fillRect(x + c * 12, baseY - h + r * 16, 4, 6);
          }
        }
      }
    });
  }

  // ─── Floor ───────────────────────────────────────────────────────────────

  private drawFloor(): void {
    const { ctx, arena } = this;

    // Floor surface gradient
    const floorGradient = ctx.createLinearGradient(0, arena.floorY, 0, arena.height);
    floorGradient.addColorStop(0, 'rgba(0, 240, 255, 0.12)');
    floorGradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, arena.floorY, arena.width, arena.height - arena.floorY);

    // Glowing floor line
    ctx.shadowColor = COLORS.floorLine;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = COLORS.floorLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, arena.floorY);
    ctx.lineTo(arena.width, arena.floorY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Perspective grid lines on the floor
    ctx.strokeStyle = COLORS.floorGrid;
    ctx.lineWidth = 1;
    const gridSpacing = 40;
    for (let x = 0; x < arena.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, arena.floorY);
      ctx.lineTo(x, arena.height);
      ctx.stroke();
    }
    for (let y = arena.floorY; y < arena.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(arena.width, y);
      ctx.stroke();
    }
  }

  // ─── Fighter Rendering ──────────────────────────────────────────────────

  private drawFighter(fighter: FighterRuntimeState, index: number): void {
    const { ctx } = this;
    const { position, facing, state, config } = fighter;
    const isP1 = index === 0;
    const bodyColor = isP1 ? COLORS.p1Body : COLORS.p2Body;
    const accentColor = isP1 ? COLORS.p1Accent : COLORS.p2Accent;
    const glowColor = isP1 ? COLORS.p1Glow : COLORS.p2Glow;
    const isFlashing = this.hitFlashTimers[index] > 0;

    ctx.save();
    ctx.translate(position.x, position.y);

    // Flip for facing direction
    const scaleX = facing === 'right' ? 1 : -1;
    ctx.scale(scaleX, 1);

    // Glow effect under fighter
    if (fighter.isGrounded) {
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body rendering based on state
    const renderColor = isFlashing ? COLORS.hitFlash : bodyColor;
    const renderAccent = isFlashing ? COLORS.hitFlash : accentColor;

    switch (state) {
      case FighterState.CROUCH:
        this.drawFighterCrouching(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
      case FighterState.ATTACK_PUNCH:
        this.drawFighterPunching(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
      case FighterState.ATTACK_KICK:
        this.drawFighterKicking(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
      case FighterState.HIT_STUN:
      case FighterState.BLOCK_STUN:
        this.drawFighterStunned(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
      case FighterState.DEAD:
        this.drawFighterDead(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
      case FighterState.JUMPING:
      case FighterState.FALLING:
        this.drawFighterAirborne(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
      default:
        this.drawFighterStanding(renderColor, renderAccent, config.renderWidth, config.renderHeight);
        break;
    }

    // Player label
    ctx.scale(scaleX, 1); // Un-flip for text
    ctx.fillStyle = bodyColor;
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isP1 ? 'P1' : 'P2', 0, -config.renderHeight - 8);

    ctx.restore();
  }

  // ─── Fighter Pose Drawings ───────────────────────────────────────────────
  // All poses draw relative to (0, 0) = feet center, facing RIGHT.
  // The parent transform handles position + facing flip.

  private drawFighterStanding(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;

    // Legs
    ctx.fillStyle = accent;
    ctx.fillRect(-halfW * 0.4, -h * 0.35, w * 0.25, h * 0.35);   // Left leg
    ctx.fillRect(halfW * 0.15, -h * 0.35, w * 0.25, h * 0.35);    // Right leg

    // Torso
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.5, -h * 0.72, w * 0.6, h * 0.4);

    // Head
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -h * 0.82, w * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Visor (eye slit)
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(-w * 0.15, -h * 0.84, w * 0.3, h * 0.035);

    // Arms
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.7, -h * 0.68, w * 0.15, h * 0.28);    // Left arm
    ctx.fillRect(halfW * 0.35, -h * 0.68, w * 0.15, h * 0.28);    // Right arm
  }

  private drawFighterCrouching(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const crouchH = h * 0.6;

    // Legs (bent)
    ctx.fillStyle = accent;
    ctx.fillRect(-halfW * 0.5, -crouchH * 0.3, w * 0.3, crouchH * 0.3);
    ctx.fillRect(halfW * 0.1, -crouchH * 0.3, w * 0.3, crouchH * 0.3);

    // Torso (lower)
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.5, -crouchH * 0.7, w * 0.65, crouchH * 0.42);

    // Head
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(w * 0.05, -crouchH * 0.8, w * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(-w * 0.1, -crouchH * 0.82, w * 0.28, crouchH * 0.04);
  }

  private drawFighterPunching(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;

    // Legs
    ctx.fillStyle = accent;
    ctx.fillRect(-halfW * 0.4, -h * 0.35, w * 0.25, h * 0.35);
    ctx.fillRect(halfW * 0.15, -h * 0.35, w * 0.25, h * 0.35);

    // Torso (slightly rotated forward)
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.4, -h * 0.72, w * 0.55, h * 0.4);

    // Head
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(w * 0.05, -h * 0.82, w * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-w * 0.1, -h * 0.84, w * 0.3, h * 0.035);

    // Extended punch arm
    ctx.fillStyle = color;
    ctx.fillRect(halfW * 0.2, -h * 0.65, w * 0.8, h * 0.08);  // Extended arm

    // Fist
    ctx.fillStyle = accent;
    ctx.fillRect(halfW * 0.2 + w * 0.75, -h * 0.68, w * 0.15, h * 0.14);

    // Back arm
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.6, -h * 0.68, w * 0.15, h * 0.2);
  }

  private drawFighterKicking(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;

    // Standing leg
    ctx.fillStyle = accent;
    ctx.fillRect(-halfW * 0.3, -h * 0.35, w * 0.25, h * 0.35);

    // Torso (leaning back slightly)
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.55, -h * 0.72, w * 0.6, h * 0.4);

    // Head
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(-w * 0.05, -h * 0.82, w * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-w * 0.2, -h * 0.84, w * 0.3, h * 0.035);

    // Extended kick leg
    ctx.fillStyle = accent;
    ctx.fillRect(halfW * 0.1, -h * 0.35, w * 0.9, h * 0.1);  // Extended leg

    // Boot
    ctx.fillStyle = color;
    ctx.fillRect(halfW * 0.1 + w * 0.85, -h * 0.38, w * 0.12, h * 0.16);

    // Arms (guard position)
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.7, -h * 0.68, w * 0.15, h * 0.22);
    ctx.fillRect(-halfW * 0.1, -h * 0.7, w * 0.15, h * 0.2);
  }

  private drawFighterStunned(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    // Slight lean backward
    const lean = Math.sin(this.frameCount * 0.3) * 2;

    ctx.save();
    ctx.translate(lean, 0);

    // Legs
    ctx.fillStyle = accent;
    ctx.fillRect(-halfW * 0.5, -h * 0.35, w * 0.25, h * 0.35);
    ctx.fillRect(halfW * 0.1, -h * 0.35, w * 0.25, h * 0.35);

    // Torso
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.5, -h * 0.72, w * 0.6, h * 0.4);

    // Head (tilted)
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(lean * 0.5, -h * 0.82, w * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Dazed eyes (X X)
    ctx.fillStyle = '#ffcc00';
    ctx.font = `bold ${Math.round(w * 0.18)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('X X', lean * 0.5, -h * 0.78);

    // Arms (dangling)
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.75, -h * 0.6, w * 0.12, h * 0.32);
    ctx.fillRect(halfW * 0.4, -h * 0.6, w * 0.12, h * 0.32);

    ctx.restore();
  }

  private drawFighterDead(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;

    // Fallen on the ground
    ctx.save();
    ctx.globalAlpha = 0.6;

    // Body (horizontal)
    ctx.fillStyle = color;
    ctx.fillRect(-w * 0.7, -h * 0.15, w * 1.4, h * 0.12);

    // Head
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(-w * 0.6, -h * 0.12, w * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Dead eyes
    ctx.fillStyle = '#666666';
    ctx.font = `bold ${Math.round(w * 0.14)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('X', -w * 0.6, -h * 0.08);

    ctx.restore();
  }

  private drawFighterAirborne(color: string, accent: string, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;

    // Legs (tucked)
    ctx.fillStyle = accent;
    ctx.fillRect(-halfW * 0.4, -h * 0.35, w * 0.22, h * 0.3);
    ctx.fillRect(halfW * 0.12, -h * 0.38, w * 0.22, h * 0.3);

    // Torso
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.5, -h * 0.72, w * 0.6, h * 0.38);

    // Head
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -h * 0.82, w * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#00ffcc';
    ctx.fillRect(-w * 0.15, -h * 0.84, w * 0.3, h * 0.035);

    // Arms (spread)
    ctx.fillStyle = color;
    ctx.fillRect(-halfW * 0.8, -h * 0.65, w * 0.18, h * 0.12);
    ctx.fillRect(halfW * 0.4, -h * 0.6, w * 0.18, h * 0.12);
  }

  // ─── Debug Overlay ───────────────────────────────────────────────────────

  private drawDebugOverlay(snapshot: CombatSnapshot): void {
    snapshot.fighters.forEach((fighter) => {
      // Pushbox — Blue
      this.drawDebugBox(fighter.worldPushbox, COLORS.debugPushbox, 'PUSH');

      // Hurtbox — Green
      this.drawDebugBox(fighter.worldHurtbox, COLORS.debugHurtbox, 'HURT');

      // Hitbox — Red (only when active)
      if (fighter.worldHitbox) {
        this.drawDebugBox(fighter.worldHitbox, COLORS.debugHitbox, 'HIT');
      }

      // Anchor point marker
      this.drawAnchorPoint(fighter);

      // State label
      this.drawStateLabel(fighter);
    });

    // Debug legend
    this.drawDebugLegend();
  }

  private drawDebugBox(box: AABB, color: string, label: string): void {
    const { ctx } = this;

    // Semi-transparent fill
    ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.08)');
    ctx.fillRect(box.x, box.y, box.width, box.height);

    // Outline
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.setLineDash([]);

    // Label
    ctx.fillStyle = color;
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, box.x + 2, box.y + 10);
  }

  private drawAnchorPoint(fighter: FighterRuntimeState): void {
    const { ctx } = this;
    const { x, y } = fighter.position;

    // Crosshair at anchor
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + 6, y);
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x, y + 6);
    ctx.stroke();

    // Position text
    ctx.fillStyle = '#ffff00';
    ctx.font = '9px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`(${Math.round(x)}, ${Math.round(y)})`, x, y + 16);
  }

  private drawStateLabel(fighter: FighterRuntimeState): void {
    const { ctx } = this;
    const { position, state, health, facing } = fighter;

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';

    const lines = [
      state,
      `HP:${health} F:${facing}`,
    ];

    if (fighter.currentAttack) {
      const atk = fighter.currentAttack;
      const phase = this.getAttackPhaseName(atk.currentTick, atk.config.frameData);
      lines.push(`ATK:${atk.config.name} ${phase} t:${atk.currentTick}/${atk.totalTicks}`);
    }

    lines.forEach((line, i) => {
      ctx.fillText(line, position.x, position.y - fighter.config.renderHeight - 22 - (lines.length - 1 - i) * 12);
    });
  }

  private getAttackPhaseName(tick: number, fd: { startup: number; active: number }): string {
    if (tick < fd.startup) return 'STARTUP';
    if (tick < fd.startup + fd.active) return 'ACTIVE';
    return 'RECOVERY';
  }

  private drawDebugLegend(): void {
    const { ctx, arena } = this;
    const x = 10;
    const y = arena.height - 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y, 160, 52);

    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'left';

    ctx.fillStyle = COLORS.debugPushbox;
    ctx.fillText('■ Pushbox (collision)', x + 8, y + 14);

    ctx.fillStyle = COLORS.debugHurtbox;
    ctx.fillText('■ Hurtbox (vulnerable)', x + 8, y + 28);

    ctx.fillStyle = COLORS.debugHitbox;
    ctx.fillText('■ Hitbox  (attack)', x + 8, y + 42);
  }

  private drawDebugIndicator(): void {
    const { ctx, arena } = this;

    ctx.fillStyle = 'rgba(255, 50, 50, 0.85)';
    ctx.fillRect(arena.width - 90, 8, 82, 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DEBUG ON', arena.width - 49, 22);
  }

  // ─── Phase Overlays ──────────────────────────────────────────────────────

  private drawPhaseOverlay(snapshot: CombatSnapshot): void {
    switch (snapshot.phase) {
      case RoundPhase.INTRO:
        this.drawIntroOverlay(snapshot);
        break;
      case RoundPhase.KO:
        this.drawKOOverlay(snapshot);
        break;
      case RoundPhase.MATCH_OVER:
        this.drawMatchOverOverlay(snapshot);
        break;
      // FIGHTING: no overlay
    }
  }

  private drawIntroOverlay(snapshot: CombatSnapshot): void {
    const { ctx, arena } = this;
    const centerX = arena.width / 2;
    const centerY = arena.height / 2;

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, arena.width, arena.height);

    // "ROUND X"
    ctx.save();
    ctx.shadowColor = COLORS.textGlow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`ROUND ${snapshot.roundState.roundNumber}`, centerX, centerY - 30);

    // "FIGHT!"
    ctx.shadowColor = '#ffcc00';
    ctx.fillStyle = COLORS.textFight;
    ctx.font = 'bold 64px "Courier New", monospace';
    ctx.fillText('FIGHT!', centerX, centerY + 40);
    ctx.restore();
  }

  private drawKOOverlay(snapshot: CombatSnapshot): void {
    const { ctx, arena } = this;
    const centerX = arena.width / 2;
    const centerY = arena.height / 2;

    // Dim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, arena.width, arena.height);

    // "K.O."
    ctx.save();
    ctx.shadowColor = COLORS.textKO;
    ctx.shadowBlur = 30;
    ctx.fillStyle = COLORS.textKO;
    ctx.font = 'bold 80px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K.O.', centerX, centerY - 20);

    // Winner announcement
    if (snapshot.roundState.roundWinner !== null) {
      ctx.shadowBlur = 10;
      ctx.fillStyle = COLORS.textPrimary;
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.fillText(
        `PLAYER ${snapshot.roundState.roundWinner + 1} WINS`,
        centerX,
        centerY + 35,
      );

      // Score
      ctx.font = '22px "Courier New", monospace';
      ctx.fillStyle = COLORS.textGlow;
      ctx.fillText(
        `${snapshot.roundState.wins[0]} — ${snapshot.roundState.wins[1]}`,
        centerX,
        centerY + 68,
      );
    }
    ctx.restore();
  }

  private drawMatchOverOverlay(snapshot: CombatSnapshot): void {
    const { ctx, arena } = this;
    const centerX = arena.width / 2;
    const centerY = arena.height / 2;

    // Heavy dim
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, arena.width, arena.height);

    ctx.save();

    // "MATCH OVER"
    ctx.shadowColor = COLORS.textGlow;
    ctx.shadowBlur = 25;
    ctx.fillStyle = COLORS.textGlow;
    ctx.font = 'bold 52px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MATCH OVER', centerX, centerY - 40);

    // Winner
    const winner = snapshot.roundState.wins[0] >= snapshot.roundState.roundsToWin ? 1 : 2;
    const winnerColor = winner === 1 ? COLORS.p1Body : COLORS.p2Body;
    ctx.shadowColor = winnerColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = winnerColor;
    ctx.font = 'bold 36px "Courier New", monospace';
    ctx.fillText(`PLAYER ${winner} WINS!`, centerX, centerY + 20);

    // Final score
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.textPrimary;
    ctx.font = '24px "Courier New", monospace';
    ctx.fillText(
      `${snapshot.roundState.wins[0]} — ${snapshot.roundState.wins[1]}`,
      centerX,
      centerY + 60,
    );

    ctx.restore();
  }

  // ─── Post-Processing ─────────────────────────────────────────────────────

  private drawScanlines(): void {
    const { ctx, arena } = this;
    ctx.fillStyle = COLORS.scanline;
    for (let y = 0; y < arena.height; y += 3) {
      ctx.fillRect(0, y, arena.width, 1);
    }
  }
}

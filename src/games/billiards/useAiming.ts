"use client";

import { useCallback, useRef } from "react";
import Matter from "matter-js";
import {
  BALL_RADIUS,
  MAX_FORCE,
  MIN_DRAG_DISTANCE,
  MAX_DRAG_DISTANCE,
  TABLE_WIDTH,
  TABLE_HEIGHT,
} from "./constants";

const { Body } = Matter;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AimState {
  /** Whether the player is currently dragging to aim */
  isDragging: boolean;
  /** Physics-space start point (cue ball position when drag started) */
  origin: { x: number; y: number };
  /** Physics-space current pointer position */
  pointer: { x: number; y: number };
  /** Direction vector FROM cue ball TOWARD the target (normalized) */
  aimDir: { x: number; y: number };
  /** Drag distance in pixels (clamped) */
  dragDistance: number;
  /** Power ratio 0..1 */
  power: number;
}

const EMPTY_AIM: AimState = {
  isDragging: false,
  origin: { x: 0, y: 0 },
  pointer: { x: 0, y: 0 },
  aimDir: { x: 1, y: 0 },
  dragDistance: 0,
  power: 0,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert a PointerEvent on a scaled canvas to physics-space coordinates */
function canvasToPhysics(
  e: PointerEvent | { clientX: number; clientY: number },
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = TABLE_WIDTH / rect.width;
  const scaleY = TABLE_HEIGHT / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

/** Distance between two points */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ─── The Hook ───────────────────────────────────────────────────────────────

export function useAiming(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  cueBallRef: React.RefObject<Matter.Body | null>,
  canAim: () => boolean,
  onShot: () => void,
  onAimChange?: (power: number, isDragging: boolean) => void
) {
  const aimRef = useRef<AimState>({ ...EMPTY_AIM });
  const activePointerIdRef = useRef<number | null>(null);

  // ── Get current aim state (for the renderer to read) ────────────────────

  const getAimState = useCallback((): AimState => aimRef.current, []);

  // ── Pointer Down ────────────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!canAim()) return;
      const canvas = canvasRef.current;
      const cueBall = cueBallRef.current;
      if (!canvas || !cueBall) return;

      const pos = canvasToPhysics(e, canvas);
      const cueBallPos = cueBall.position;

      // Must click within a generous radius of the cue ball to start aiming
      const clickRadius = BALL_RADIUS * 3.5;
      if (dist(pos, cueBallPos) > clickRadius) return;

      // Capture this pointer
      activePointerIdRef.current = e.pointerId;
      canvas.setPointerCapture(e.pointerId);

      aimRef.current = {
        isDragging: true,
        origin: { x: cueBallPos.x, y: cueBallPos.y },
        pointer: pos,
        aimDir: { x: 1, y: 0 },
        dragDistance: 0,
        power: 0,
      };
      onAimChange?.(0, true);
    },
    [canAim, canvasRef, cueBallRef, onAimChange]
  );

  // ── Pointer Move ────────────────────────────────────────────────────────

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!aimRef.current.isDragging) return;
      if (e.pointerId !== activePointerIdRef.current) return;

      const canvas = canvasRef.current;
      const cueBall = cueBallRef.current;
      if (!canvas || !cueBall) return;

      const pos = canvasToPhysics(e, canvas);
      const origin = { x: cueBall.position.x, y: cueBall.position.y };

      // Vector from cue ball to pointer (drag direction)
      const dx = pos.x - origin.x;
      const dy = pos.y - origin.y;
      const dragDist = Math.sqrt(dx * dx + dy * dy);

      if (dragDist < 1) return; // avoid division by zero

      // Aim direction is OPPOSITE to drag (pull back to shoot forward)
      const aimDirX = -dx / dragDist;
      const aimDirY = -dy / dragDist;

      const clampedDrag = Math.min(dragDist, MAX_DRAG_DISTANCE);
      const power = Math.max(0, (clampedDrag - MIN_DRAG_DISTANCE) / (MAX_DRAG_DISTANCE - MIN_DRAG_DISTANCE));
      const clampedPower = Math.min(1, Math.max(0, power));

      aimRef.current = {
        isDragging: true,
        origin,
        pointer: pos,
        aimDir: { x: aimDirX, y: aimDirY },
        dragDistance: clampedDrag,
        power: clampedPower,
      };
      onAimChange?.(clampedPower, true);
    },
    [canvasRef, cueBallRef, onAimChange]
  );

  // ── Pointer Up — SHOOT! ─────────────────────────────────────────────────

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!aimRef.current.isDragging) return;
      if (e.pointerId !== activePointerIdRef.current) return;

      const canvas = canvasRef.current;
      const cueBall = cueBallRef.current;
      if (!canvas || !cueBall) return;

      canvas.releasePointerCapture(e.pointerId);
      activePointerIdRef.current = null;

      const aim = aimRef.current;

      // Only shoot if the drag exceeded the minimum distance
      if (aim.dragDistance >= MIN_DRAG_DISTANCE && aim.power > 0.01) {
        const forceMagnitude = aim.power * MAX_FORCE;
        Body.applyForce(cueBall, cueBall.position, {
          x: aim.aimDir.x * forceMagnitude,
          y: aim.aimDir.y * forceMagnitude,
        });
        onShot();
      }

      // Reset aim state
      aimRef.current = { ...EMPTY_AIM };
      onAimChange?.(0, false);
    },
    [canvasRef, cueBallRef, onShot, onAimChange]
  );

  // ── Pointer Cancel (e.g. touch cancelled) ───────────────────────────────

  const handlePointerCancel = useCallback(
    (e: PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current) return;
      activePointerIdRef.current = null;
      aimRef.current = { ...EMPTY_AIM };
      onAimChange?.(0, false);
    },
    [onAimChange]
  );

  // ── Attach / detach event listeners ─────────────────────────────────────

  const attachListeners = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);
  }, [canvasRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  const detachListeners = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerCancel);
  }, [canvasRef, handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel]);

  return {
    getAimState,
    attachListeners,
    detachListeners,
  };
}

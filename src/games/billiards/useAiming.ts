"use client";

import { useCallback, useEffect, useRef } from "react";
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

export interface ShotPayload {
  aimDir: { x: number; y: number };
  power: number;
}

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
  onShot: (payload: ShotPayload) => void,
  onAimChange?: (power: number, isDragging: boolean, aimDir?: { x: number; y: number }) => void
) {
  const aimRef = useRef<AimState>({ ...EMPTY_AIM });
  const remoteAimRef = useRef<AimState | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const currentAimDirRef = useRef<{ x: number; y: number }>({ x: 1, y: 0 });

  // ── Get current aim state (for the renderer to read) ────────────────────

  const getAimState = useCallback((): AimState => {
    if (aimRef.current.isDragging) return aimRef.current;
    if (remoteAimRef.current) return remoteAimRef.current;
    return aimRef.current;
  }, []);

  // ── Set remote aim state (when opponent aims) ───────────────────────────

  const setRemoteAim = useCallback(
    (data: { aimDir: { x: number; y: number }; power: number; isDragging: boolean } | null) => {
      if (!data || !data.isDragging || data.power <= 0.001) {
        remoteAimRef.current = null;
        onAimChange?.(0, false);
        return;
      }
      const cueBall = cueBallRef.current;
      if (!cueBall) return;
      const origin = { x: cueBall.position.x, y: cueBall.position.y };
      const dragDist = MIN_DRAG_DISTANCE + data.power * (MAX_DRAG_DISTANCE - MIN_DRAG_DISTANCE);
      const pointer = {
        x: origin.x - data.aimDir.x * dragDist,
        y: origin.y - data.aimDir.y * dragDist,
      };
      remoteAimRef.current = {
        isDragging: true,
        origin,
        pointer,
        aimDir: data.aimDir,
        dragDistance: dragDist,
        power: data.power,
      };
      onAimChange?.(data.power, true, data.aimDir);
    },
    [cueBallRef, onAimChange]
  );

  // ── Direct gauge power control (from left CueStickPowerGauge) ───────────

  const setGaugePower = useCallback(
    (power: number, isDragging: boolean) => {
      const cueBall = cueBallRef.current;
      if (!cueBall) return;
      const origin = { x: cueBall.position.x, y: cueBall.position.y };

      if (!isDragging || power <= 0.005) {
        aimRef.current = { ...EMPTY_AIM, aimDir: currentAimDirRef.current };
        onAimChange?.(0, false, currentAimDirRef.current);
        return;
      }

      const clampedPower = Math.min(1, Math.max(0, power));
      const dragDist = MIN_DRAG_DISTANCE + clampedPower * (MAX_DRAG_DISTANCE - MIN_DRAG_DISTANCE);
      const pointer = {
        x: origin.x - currentAimDirRef.current.x * dragDist,
        y: origin.y - currentAimDirRef.current.y * dragDist,
      };

      aimRef.current = {
        isDragging: true,
        origin,
        pointer,
        aimDir: currentAimDirRef.current,
        dragDistance: dragDist,
        power: clampedPower,
      };
      onAimChange?.(clampedPower, true, currentAimDirRef.current);
    },
    [cueBallRef, onAimChange]
  );

  // ── Direct gauge shot trigger (when releasing CueStickPowerGauge) ───────

  const triggerGaugeShot = useCallback(
    (power: number) => {
      const cueBall = cueBallRef.current;
      if (!cueBall || power <= 0.01) {
        aimRef.current = { ...EMPTY_AIM, aimDir: currentAimDirRef.current };
        onAimChange?.(0, false);
        return;
      }

      const clampedPower = Math.min(1, Math.max(0, power));
      const forceMagnitude = clampedPower * MAX_FORCE;
      Body.applyForce(cueBall, cueBall.position, {
        x: currentAimDirRef.current.x * forceMagnitude,
        y: currentAimDirRef.current.y * forceMagnitude,
      });

      const shotPayload: ShotPayload = {
        aimDir: currentAimDirRef.current,
        power: clampedPower,
      };

      aimRef.current = { ...EMPTY_AIM, aimDir: currentAimDirRef.current };
      onAimChange?.(0, false);
      onShot(shotPayload);
    },
    [cueBallRef, onShot, onAimChange]
  );

  // ── Pointer Down on Canvas ──────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!canAim()) return;
      const canvas = canvasRef.current;
      const cueBall = cueBallRef.current;
      if (!canvas || !cueBall) return;

      const pos = canvasToPhysics(e, canvas);
      const cueBallPos = cueBall.position;
      const d = dist(pos, cueBallPos);

      // If clicked far away on felt: set aim direction towards the clicked position
      if (d > BALL_RADIUS * 4) {
        const dx = pos.x - cueBallPos.x;
        const dy = pos.y - cueBallPos.y;
        if (d > 1) {
          currentAimDirRef.current = { x: dx / d, y: dy / d };
        }
      }

      // Capture this pointer
      activePointerIdRef.current = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}

      aimRef.current = {
        isDragging: true,
        origin: { x: cueBallPos.x, y: cueBallPos.y },
        pointer: pos,
        aimDir: currentAimDirRef.current,
        dragDistance: 0,
        power: 0,
      };
      onAimChange?.(0, true, currentAimDirRef.current);
    },
    [canAim, canvasRef, cueBallRef, onAimChange]
  );

  // ── Pointer Move on Canvas ──────────────────────────────────────────────

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
      currentAimDirRef.current = { x: aimDirX, y: aimDirY };

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
      onAimChange?.(clampedPower, true, { x: aimDirX, y: aimDirY });
    },
    [canvasRef, cueBallRef, onAimChange]
  );

  // ── Pointer Up on Canvas — SHOOT! ───────────────────────────────────────

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!aimRef.current.isDragging) return;
      if (e.pointerId !== activePointerIdRef.current) return;

      const canvas = canvasRef.current;
      const cueBall = cueBallRef.current;
      if (!canvas || !cueBall) return;

      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {}
      activePointerIdRef.current = null;

      const aim = aimRef.current;

      // Only shoot if the drag exceeded the minimum distance
      if (aim.dragDistance >= MIN_DRAG_DISTANCE && aim.power > 0.01) {
        const forceMagnitude = aim.power * MAX_FORCE;
        Body.applyForce(cueBall, cueBall.position, {
          x: aim.aimDir.x * forceMagnitude,
          y: aim.aimDir.y * forceMagnitude,
        });
        onShot({ aimDir: aim.aimDir, power: aim.power });
      }

      // Reset aim state
      aimRef.current = { ...EMPTY_AIM, aimDir: currentAimDirRef.current };
      onAimChange?.(0, false);
    },
    [canvasRef, cueBallRef, onShot, onAimChange]
  );

  // ── Pointer Cancel (e.g. touch cancelled) ───────────────────────────────

  const handlePointerCancel = useCallback(
    (e: PointerEvent) => {
      if (e.pointerId !== activePointerIdRef.current) return;
      activePointerIdRef.current = null;
      aimRef.current = { ...EMPTY_AIM, aimDir: currentAimDirRef.current };
      onAimChange?.(0, false);
    },
    [onAimChange]
  );

  // ── Attach / detach event listeners ─────────────────────────────────────

  const attachListeners = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerCancel);

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

  // Automatically attach listeners when canvas is mounted or handlers update
  useEffect(() => {
    attachListeners();
    return () => {
      detachListeners();
    };
  }, [attachListeners, detachListeners]);

  return {
    getAimState,
    setRemoteAim,
    setGaugePower,
    triggerGaugeShot,
    attachListeners,
    detachListeners,
  };
}

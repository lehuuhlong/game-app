"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import {
  TABLE_WIDTH,
  TABLE_HEIGHT,
  BALL_RADIUS,
  PLAY_LEFT,
  PLAY_TOP,
  PLAY_RIGHT,
  PLAY_BOTTOM,
  POCKET_POSITIONS,
  POCKET_RADIUS,
} from "./constants";

const { Body } = Matter;

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

interface UseBallInHandOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cueBallRef: React.MutableRefObject<Matter.Body | null>;
  ballsRef: React.MutableRefObject<Matter.Body[]>;
  active: boolean; // rulesState.ballInHand
  enabled?: boolean; // false if not current player in online mode
  onConfirm: (pos?: { x: number; y: number }) => void;
  onMove?: (pos: { x: number; y: number }) => void;
  respotCueBall?: () => Matter.Body | undefined;
}

export function useBallInHand({
  canvasRef,
  cueBallRef,
  ballsRef,
  active,
  enabled = true,
  onConfirm,
  onMove,
  respotCueBall,
}: UseBallInHandOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const isDraggingRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);

  /** Check if a candidate position (x, y) is legal for placing the cue ball */
  const checkValidity = useCallback(
    (x: number, y: number): boolean => {
      const cueBall = cueBallRef.current;
      const minX = PLAY_LEFT + BALL_RADIUS + 2;
      const maxX = PLAY_RIGHT - BALL_RADIUS - 2;
      const minY = PLAY_TOP + BALL_RADIUS + 2;
      const maxY = PLAY_BOTTOM - BALL_RADIUS - 2;

      // 1. Inside playing felt
      if (x < minX || x > maxX || y < minY || y > maxY) return false;

      // 2. Not inside or too close to any pocket
      for (const p of POCKET_POSITIONS) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (dx * dx + dy * dy < (POCKET_RADIUS + BALL_RADIUS + 4) ** 2) {
          return false;
        }
      }

      // 3. Not overlapping any object ball
      for (const b of ballsRef.current) {
        if (cueBall && b.id === cueBall.id) continue;
        const dx = x - b.position.x;
        const dy = y - b.position.y;
        if (dx * dx + dy * dy < (BALL_RADIUS * 2 + 3) ** 2) {
          return false;
        }
      }

      return true;
    },
    [ballsRef, cueBallRef]
  );

  // Position cue ball with clamping and update validity
  const moveCueBallTo = useCallback(
    (targetX: number, targetY: number) => {
      let cueBall = cueBallRef.current;
      if (!cueBall || !ballsRef.current.some((b) => b.id === cueBall!.id)) {
        if (respotCueBall) {
          const respawned = respotCueBall();
          if (respawned) cueBall = respawned;
        }
      }
      if (!cueBall) return;

      // 1. Initial boundary clamping
      let clampedX = Math.min(
        PLAY_RIGHT - BALL_RADIUS - 2,
        Math.max(PLAY_LEFT + BALL_RADIUS + 2, targetX)
      );
      let clampedY = Math.min(
        PLAY_BOTTOM - BALL_RADIUS - 2,
        Math.max(PLAY_TOP + BALL_RADIUS + 2, targetY)
      );

      // 2. Prevent cue ball from ever entering pocket openings/sensors:
      // If dragged near a pocket, push it smoothly away from pocket center
      for (const p of POCKET_POSITIONS) {
        const dx = clampedX - p.x;
        const dy = clampedY - p.y;
        const dist = Math.hypot(dx, dy);
        const minDist = POCKET_RADIUS + BALL_RADIUS + 5;
        if (dist < minDist && dist > 0.001) {
          clampedX = p.x + (dx / dist) * minDist;
          clampedY = p.y + (dy / dist) * minDist;
        }
      }

      // Re-clamp inside boundaries after pocket repulsion
      clampedX = Math.min(
        PLAY_RIGHT - BALL_RADIUS - 2,
        Math.max(PLAY_LEFT + BALL_RADIUS + 2, clampedX)
      );
      clampedY = Math.min(
        PLAY_BOTTOM - BALL_RADIUS - 2,
        Math.max(PLAY_TOP + BALL_RADIUS + 2, clampedY)
      );

      const valid = checkValidity(clampedX, clampedY);
      setIsValid(valid);

      Body.setPosition(cueBall, { x: clampedX, y: clampedY });
      Body.setVelocity(cueBall, { x: 0, y: 0 });
      Body.setAngularVelocity(cueBall, 0);
      onMove?.({ x: clampedX, y: clampedY });
    },
    [checkValidity, cueBallRef, ballsRef, respotCueBall, onMove]
  );

  // Check initial position validity when active becomes true, or recover missing ball
  useEffect(() => {
    if (active) {
      let cue = cueBallRef.current;
      const isBallPresent = cue && ballsRef.current.some((b) => b.id === cue!.id);
      if (!isBallPresent && respotCueBall) {
        const respawned = respotCueBall();
        if (respawned) cue = respawned;
      }
      if (cue) {
        const valid = checkValidity(cue.position.x, cue.position.y);
        setIsValid(valid);
      }
    }
  }, [active, checkValidity, cueBallRef, ballsRef, respotCueBall]);

  // Pointer event handlers
  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (!active || !enabled) return;
      const canvas = canvasRef.current;
      let cueBall = cueBallRef.current;
      if (!canvas) return;

      if (!cueBall || !ballsRef.current.some((b) => b.id === cueBall!.id)) {
        if (respotCueBall) {
          const respawned = respotCueBall();
          if (respawned) cueBall = respawned;
        }
      }
      if (!cueBall) return;

      const pos = canvasToPhysics(e, canvas);

      activePointerIdRef.current = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore capture errors on unsupported devices
      }
      isDraggingRef.current = true;
      setIsDragging(true);

      // Instantly position cue ball at pointer coordinates
      moveCueBallTo(pos.x, pos.y);
    },
    [active, enabled, canvasRef, cueBallRef, moveCueBallTo]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!active || !enabled || !isDraggingRef.current) return;
      if (e.pointerId !== activePointerIdRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pos = canvasToPhysics(e, canvas);
      moveCueBallTo(pos.x, pos.y);
    },
    [active, enabled, canvasRef, moveCueBallTo]
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (!active || !isDraggingRef.current) return;
      if (e.pointerId !== activePointerIdRef.current) return;
      const canvas = canvasRef.current;
      if (canvas) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      }
      activePointerIdRef.current = null;
      isDraggingRef.current = false;
      setIsDragging(false);
    },
    [active, canvasRef]
  );

  // Attach / detach listeners when active changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [active, canvasRef, handlePointerDown, handlePointerMove, handlePointerUp]);

  const confirmPlacement = useCallback(() => {
    if (isValid) {
      const cue = cueBallRef.current;
      onConfirm(cue ? { x: cue.position.x, y: cue.position.y } : undefined);
    }
  }, [isValid, onConfirm, cueBallRef]);

  return {
    isDragging,
    isValid,
    confirmPlacement,
  };
}

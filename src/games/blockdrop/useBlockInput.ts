"use client";

import { useEffect, useRef } from 'react';

export interface BlockInputHandlers {
  moveLeft: () => boolean;
  moveRight: () => boolean;
  rotatePiece: () => boolean;
  softDrop: () => boolean;
  hardDrop: () => number;
  togglePause: () => void;
  resetGame: () => void;
  isGameOver: boolean;
  isPaused: boolean;
  enabled?: boolean;
}

/**
 * Handles keyboard input for Retro Block Drop.
 * Features:
 * - Single-press protection for Hard Drop (Space) & Rotate (Up) to avoid accidental repeats.
 * - Responsive throttling for Horizontal Moves (Left/Right) and Soft Drop (Down).
 * - Full preventDefault on game keys to prevent browser viewport scrolling.
 * - Non-stale closure via ref pattern.
 */
export function useBlockInput({
  moveLeft,
  moveRight,
  rotatePiece,
  softDrop,
  hardDrop,
  togglePause,
  resetGame,
  isGameOver,
  isPaused,
  enabled = true,
}: BlockInputHandlers) {
  const handlersRef = useRef<BlockInputHandlers>({
    moveLeft,
    moveRight,
    rotatePiece,
    softDrop,
    hardDrop,
    togglePause,
    resetGame,
    isGameOver,
    isPaused,
    enabled,
  });

  useEffect(() => {
    handlersRef.current = {
      moveLeft,
      moveRight,
      rotatePiece,
      softDrop,
      hardDrop,
      togglePause,
      resetGame,
      isGameOver,
      isPaused,
      enabled,
    };
  });

  const lastHorizontalMoveRef = useRef<number>(0);
  const lastSoftDropRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const HORIZONTAL_THROTTLE_MS = 45; // Smooth sliding when held
    const SOFT_DROP_THROTTLE_MS = 40;  // Smooth drop rate

    const handleKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      if (!h.enabled) return;

      // Global game toggles
      if (e.code === 'KeyP' || e.key === 'Escape') {
        if (!e.repeat) {
          e.preventDefault();
          h.togglePause();
        }
        return;
      }

      if (e.code === 'KeyR') {
        if (!e.repeat) {
          e.preventDefault();
          h.resetGame();
        }
        return;
      }

      // If game is over or paused, ignore gameplay movement inputs
      if (h.isGameOver || h.isPaused) return;

      const now = performance.now();

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA': {
          e.preventDefault();
          if (now - lastHorizontalMoveRef.current >= HORIZONTAL_THROTTLE_MS) {
            h.moveLeft();
            lastHorizontalMoveRef.current = now;
          }
          break;
        }

        case 'ArrowRight':
        case 'KeyD': {
          e.preventDefault();
          if (now - lastHorizontalMoveRef.current >= HORIZONTAL_THROTTLE_MS) {
            h.moveRight();
            lastHorizontalMoveRef.current = now;
          }
          break;
        }

        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX': {
          e.preventDefault();
          // Strictly single tap per rotation
          if (!e.repeat) {
            h.rotatePiece();
          }
          break;
        }

        case 'ArrowDown':
        case 'KeyS': {
          e.preventDefault();
          if (now - lastSoftDropRef.current >= SOFT_DROP_THROTTLE_MS) {
            h.softDrop();
            lastSoftDropRef.current = now;
          }
          break;
        }

        case 'Space': {
          e.preventDefault();
          // Hard drop must be non-repeating to avoid dumping future pieces
          if (!e.repeat) {
            h.hardDrop();
          }
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);
}

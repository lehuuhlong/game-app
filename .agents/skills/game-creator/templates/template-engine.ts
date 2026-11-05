/**
 * 60 FPS RequestAnimationFrame Game Engine Hook Template.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 500;

export interface EngineState {
  status: 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
  score: number;
  highScore: number;
  level: number;
}

export function useGameEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [gameState, setGameState] = useState<EngineState>({
    status: 'IDLE',
    score: 0,
    highScore: 0,
    level: 1,
  });

  // Load saved high score from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('game-template-highscore');
      if (saved) {
        setGameState((prev) => ({ ...prev, highScore: parseInt(saved, 10) || 0 }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const startGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: 'PLAYING',
      score: 0,
      level: 1,
    }));
  }, []);

  const pauseGame = useCallback(() => {
    setGameState((prev) => ({
      ...prev,
      status: prev.status === 'PLAYING' ? 'PAUSED' : prev.status === 'PAUSED' ? 'PLAYING' : prev.status,
    }));
  }, []);

  const gameOver = useCallback(() => {
    setGameState((prev) => {
      const isNewHigh = prev.score > prev.highScore;
      if (isNewHigh) {
        try {
          localStorage.setItem('game-template-highscore', prev.score.toString());
        } catch {
          /* ignore */
        }
      }
      return {
        ...prev,
        status: 'GAME_OVER',
        highScore: Math.max(prev.score, prev.highScore),
      };
    });
  }, []);

  // Main 60 FPS loop
  useEffect(() => {
    if (gameState.status !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const loop = (timestamp: number) => {
      if (!isRunning) return;
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      // 1. Update Game Physics & State
      // ... update entities using dt

      // 2. Render
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      // ... draw entities

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [gameState.status]);

  return {
    canvasRef,
    gameState,
    startGame,
    pauseGame,
    gameOver,
    setGameState,
  };
}

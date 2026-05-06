import { useState, useEffect, useCallback, useRef } from 'react';

export type GameState = 'menu' | 'playing' | 'finished';

export interface Target {
  id: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export function useAimTrainer() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [target, setTarget] = useState<Target | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const spawnTarget = useCallback(() => {
    // Generate random coordinates between 5% and 95% to keep it within bounds
    const x = 5 + Math.random() * 90;
    const y = 5 + Math.random() * 90;
    setTarget({ id: Date.now(), x, y });
  }, []);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setMisses(0);
    setTimeLeft(60);
    spawnTarget();
  }, [spawnTarget]);

  const endGame = useCallback(() => {
    setGameState('finished');
    setTarget(null);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, endGame]);

  const handleTargetClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // prevent miss click
    if (gameState !== 'playing') return;
    setScore((prev) => prev + 1);
    spawnTarget();
  }, [gameState, spawnTarget]);

  const handleMissClick = useCallback(() => {
    if (gameState !== 'playing') return;
    setMisses((prev) => prev + 1);
  }, [gameState]);

  return {
    gameState,
    score,
    misses,
    timeLeft,
    target,
    startGame,
    handleTargetClick,
    handleMissClick,
    setGameState
  };
}

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

  const scoreSavedRef = useRef(false);

  const startGame = useCallback(() => {
    scoreSavedRef.current = false;
    setGameState('playing');
    setScore(0);
    setMisses(0);
    setTimeLeft(60);
    spawnTarget();
  }, [spawnTarget]);

  const scoreRef = useRef(score);
  scoreRef.current = score;
  const missesRef = useRef(misses);
  missesRef.current = misses;

  const saveScore = useCallback((finalScore: number, finalMisses: number) => {
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    try {
      const stored = localStorage.getItem("game-portal-user");
      if (!stored) return;
      const u = JSON.parse(stored);
      if (!u?.id) return;

      const totalShots = finalScore + finalMisses;
      const accuracy = totalShots > 0 ? Math.round((finalScore / totalShots) * 100) : 0;

      // Update user score
      fetch(`/api/users/${u.id}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "aimtrainer", score: finalScore, accuracy }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.aimTrainerBestScore !== undefined) {
            u.aimTrainerBestScore = d.aimTrainerBestScore;
            u.aimTrainerBestAccuracy = d.aimTrainerBestAccuracy;
            localStorage.setItem("game-portal-user", JSON.stringify(u));
          }
        })
        .catch(() => {});

      // Record match session
      fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType: "aimtrainer",
          players: [{ username: u.username, score: finalScore, result: "win" }],
          duration: 60,
          gameData: { accuracy, misses: finalMisses },
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }, []);

  const endGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setGameState('finished');
    setTarget(null);
    saveScore(scoreRef.current, missesRef.current);
  }, [saveScore]);

  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing' && timeLeft === 0) {
      endGame();
    }
  }, [gameState, timeLeft, endGame]);

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

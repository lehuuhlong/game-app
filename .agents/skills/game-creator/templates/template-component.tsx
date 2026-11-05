'use client';

/**
 * Game Component Template.
 * NOTE: All in-game UI copy, HUD labels, instructions, and modal dialogues MUST be strictly in English.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth';
import { useGameSession } from '@/hooks/useGameSession';
import { useGameEngine, CANVAS_WIDTH, CANVAS_HEIGHT } from './useGameEngine';
import * as Sounds from './sounds';

export function GameTemplate() {
  const { user } = useAuth();
  const { startSession, ensureSessionToken, getElapsedDuration } = useGameSession('template_game');
  const { canvasRef, gameState, startGame, pauseGame } = useGameEngine();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isMuted, setIsMuted] = useState(Sounds.getMuted());
  const scoreSavedRef = useRef(false);

  // Dynamic canvas scaling to fit mobile screens
  useEffect(() => {
    function handleResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setScale(Math.min(1, (w - 24) / CANVAS_WIDTH));
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save score on Game Over
  useEffect(() => {
    if (gameState.status !== 'GAME_OVER') {
      scoreSavedRef.current = false;
      return;
    }
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    (async () => {
      try {
        const sessionToken = await ensureSessionToken(user?.id, user?.username);
        const elapsed = getElapsedDuration();

        await fetch('/api/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameType: 'template_game',
            sessionToken,
            players: [
              {
                userId: user?.id,
                username: user?.username || 'Guest',
                score: gameState.score,
                result: gameState.score >= 100 ? 'win' : 'loss',
              },
            ],
            duration: elapsed,
          }),
        });

        if (user?.id) {
          await fetch(`/api/users/${user.id}/score`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              game: 'template_game',
              score: gameState.score,
              sessionToken,
            }),
          });
        }
      } catch (err) {
        console.error('Failed to submit score:', err);
      }
    })();
  }, [gameState.status, gameState.score, user, ensureSessionToken, getElapsedDuration]);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    Sounds.setMuted(next);
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* ── HUD Header ────────────────────────────────────────── */}
      <div className="w-full max-w-[420px] mb-4 flex items-center justify-between px-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Game Title
          </h1>
          <p className="text-xs text-foreground-secondary">Reflex & Arcade</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle sound"
            className="p-2 rounded-xl border border-border bg-surface text-foreground-secondary hover:text-foreground hover:border-border-hover transition-colors"
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          {/* Score Counter */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3 py-1.5 min-w-[70px] shadow-xs">
            <span className="text-[10px] uppercase font-bold text-foreground-muted">Score</span>
            <span className="text-base font-extrabold text-foreground tabular-nums">{gameState.score}</span>
          </div>

          {/* High Score */}
          <div className="flex flex-col items-center rounded-xl border border-border bg-surface px-3 py-1.5 min-w-[70px] shadow-xs">
            <span className="text-[10px] uppercase font-bold text-foreground-muted">Best</span>
            <span className="text-base font-extrabold text-accent tabular-nums">{gameState.highScore}</span>
          </div>
        </div>
      </div>

      {/* ── Viewport Container ─────────────────────────────────── */}
      <div ref={containerRef} className="w-full flex justify-center items-center relative">
        <div
          className="relative rounded-2xl border border-border bg-surface overflow-hidden shadow-xl"
          style={{ width: CANVAS_WIDTH * scale, height: CANVAS_HEIGHT * scale }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block w-full h-full cursor-pointer"
          />

          {/* Overlay: Start Screen */}
          {gameState.status === 'IDLE' && (
            <div className="absolute inset-0 bg-surface/85 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
              <h2 className="text-2xl font-extrabold text-foreground mb-2">Ready to Play?</h2>
              <p className="text-xs text-foreground-secondary mb-6 max-w-[240px]">
                Tap anywhere or press Space to jump and begin.
              </p>
              <button
                onClick={startGame}
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm tracking-wide shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Play Now
              </button>
            </div>
          )}

          {/* Overlay: Game Over Screen */}
          {gameState.status === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10">
              <span className="text-4xl mb-2">💥</span>
              <h2 className="text-2xl font-extrabold text-foreground mb-1">Game Over</h2>
              <p className="text-sm text-foreground-secondary mb-4">
                Score: <span className="font-bold text-foreground">{gameState.score}</span>
              </p>
              <button
                onClick={startGame}
                className="px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-bold text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Try Again (Space)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

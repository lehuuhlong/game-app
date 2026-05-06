'use client';

import { useAimTrainer } from './useAimTrainer';
import { motion, AnimatePresence } from 'framer-motion';

export function GameAimTrainer() {
  const {
    gameState,
    score,
    misses,
    timeLeft,
    target,
    startGame,
    handleTargetClick,
    handleMissClick,
    setGameState
  } = useAimTrainer();

  const totalShots = score + misses;
  const accuracy = totalShots > 0 ? Math.round((score / totalShots) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-6 max-w-5xl mx-auto w-full px-4 h-[calc(100vh-8rem)] min-h-[500px]">
      {/* Header */}
      <div className="w-full flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Aim <span className="text-gradient">Trainer</span>
          </h1>
          <p className="text-foreground-secondary text-sm">Improve your mouse precision and speed</p>
        </div>
        
        {gameState === 'playing' && (
          <div className="flex items-center gap-4 sm:gap-8 text-lg font-bold">
            <div className="flex flex-col items-center">
              <span className="text-foreground-muted text-[10px] sm:text-xs uppercase tracking-wider">Score</span>
              <span className="text-sky-400 tabular-nums">{score}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-foreground-muted text-[10px] sm:text-xs uppercase tracking-wider">Acc</span>
              <span className="text-emerald-400 tabular-nums">{accuracy}%</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-foreground-muted text-[10px] sm:text-xs uppercase tracking-wider">Time</span>
              <span className="text-rose-400 tabular-nums">{timeLeft}s</span>
            </div>
          </div>
        )}
      </div>

      {/* Play Area */}
      <div 
        className="w-full flex-1 bg-surface border border-border shadow-sm rounded-2xl relative overflow-hidden cursor-crosshair select-none"
        onMouseDown={handleMissClick}
      >
        <AnimatePresence mode="wait">
          {gameState === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10"
            >
              <button
                onClick={startGame}
                className="px-8 py-4 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xl shadow-lg hover:shadow-sky-500/25 hover:scale-105 active:scale-95 transition-all focus:outline-none"
              >
                Start Training
              </button>
            </motion.div>
          )}

          {gameState === 'finished' && (
            <motion.div 
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md z-10"
            >
              <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-surface border border-border shadow-2xl max-w-sm w-full mx-4">
                <span className="text-5xl">🎯</span>
                <h2 className="text-2xl font-bold text-foreground">Time's Up!</h2>
                
                <div className="grid grid-cols-2 gap-4 w-full my-4">
                  <div className="flex flex-col items-center p-4 bg-background-secondary rounded-xl">
                    <span className="text-sm text-foreground-muted">Score</span>
                    <span className="text-3xl font-black text-sky-400">{score}</span>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-background-secondary rounded-xl">
                    <span className="text-sm text-foreground-muted">Accuracy</span>
                    <span className="text-3xl font-black text-emerald-400">{accuracy}%</span>
                  </div>
                </div>

                <div className="flex w-full gap-3">
                  <button
                    onClick={() => setGameState('menu')}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-surface-hover transition-colors font-semibold"
                  >
                    Main Menu
                  </button>
                  <button
                    onClick={startGame}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg hover:shadow-sky-500/25 font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Target */}
        <AnimatePresence>
          {gameState === 'playing' && target && (
            <motion.button
              key={target.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              onMouseDown={handleTargetClick}
              className="absolute w-10 h-10 sm:w-12 sm:h-12 -ml-5 -mt-5 sm:-ml-6 sm:-mt-6 rounded-full bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.6)] border-2 border-white focus:outline-none z-0 hover:brightness-110 active:brightness-90"
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
            >
              <div className="absolute inset-2 rounded-full border border-white/50" />
              <div className="absolute inset-4 rounded-full bg-white/30" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

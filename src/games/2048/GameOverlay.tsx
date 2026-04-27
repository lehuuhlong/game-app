"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GameOverlayProps {
  status: "playing" | "won" | "lost";
  score: number;
  onRestart: () => void;
  onContinue: () => void;
}

export function GameOverlay({
  status,
  score,
  onRestart,
  onContinue,
}: GameOverlayProps) {
  if (status === "playing") return null;

  return (
    <AnimatePresence>
      <motion.div
        key={status}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 z-20 flex items-center justify-center rounded-xl"
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 rounded-xl ${
            status === "won"
              ? "bg-amber-400/60 dark:bg-amber-600/40"
              : "bg-black/50 dark:bg-black/60"
          } backdrop-blur-sm`}
        />

        {/* Content */}
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="relative z-10 flex flex-col items-center gap-4 px-8 py-6 rounded-2xl bg-surface/90 dark:bg-surface/90 backdrop-blur-md shadow-2xl border border-border"
        >
          {status === "won" ? (
            <>
              <div className="text-4xl">🎉</div>
              <h2 className="text-2xl font-extrabold text-foreground">
                You Win!
              </h2>
              <p className="text-sm text-foreground-secondary text-center">
                You reached 2048 with a score of{" "}
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {score.toLocaleString()}
                </span>
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={onContinue}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
                >
                  Keep Going
                </button>
                <button
                  onClick={onRestart}
                  className="px-5 py-2.5 rounded-lg border border-border text-foreground font-semibold text-sm hover:bg-surface-hover transition-all hover:-translate-y-0.5"
                >
                  New Game
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-4xl">😔</div>
              <h2 className="text-2xl font-extrabold text-foreground">
                Game Over
              </h2>
              <p className="text-sm text-foreground-secondary text-center">
                Final score:{" "}
                <span className="font-bold text-foreground">
                  {score.toLocaleString()}
                </span>
              </p>
              <button
                onClick={onRestart}
                className="mt-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 transition-all hover:-translate-y-0.5"
              >
                Try Again
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWordle } from "./useWordle";
import { WordleTile } from "./WordleTile";
import { WordleKeyboard } from "./WordleKeyboard";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";

export function GameWordle() {
  const {
    guesses,
    currentRow,
    gameStatus,
    solution,
    keyboardStatus,
    toast,
    handleKeyPress,
    restart,
  } = useWordle();

  const { user } = useAuth();
  const scoreSavedRef = useRef(false);
  const [showLogin, setShowLogin] = useState(false);

  const gameOver = gameStatus === "won" || gameStatus === "lost";

  // ── Login prompt on game end (if not logged in) ─────────────────
  useEffect(() => {
    if (gameOver && !user) {
      const t = setTimeout(() => setShowLogin(true), 1200);
      return () => clearTimeout(t);
    }
  }, [gameOver, user]);

  // ── Save score on WIN ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    if (gameStatus !== "won") return;
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;

    fetch(`/api/users/${user.id}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game: "wordle", won: true }),
    })
      .then((r) => r.json())
      .then((d) => {
        try {
          const stored = localStorage.getItem("game-portal-user");
          if (stored) {
            const u = JSON.parse(stored);
            if (d.wordleWins !== undefined) u.wordleWins = d.wordleWins;
            localStorage.setItem("game-portal-user", JSON.stringify(u));
          }
        } catch { /* ignore */ }
      })
      .catch((err) => console.error("Failed to save wordle score:", err));
  }, [gameStatus, user]);

  const handleRestart = useCallback(() => {
    scoreSavedRef.current = false;
    setShowLogin(false);
    restart();
  }, [restart]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* ── Title ─────────────────────────────────────────────── */}
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Wor<span className="text-gradient">dle</span>
        </h1>
        <p className="text-foreground-secondary text-sm mt-1">
          Guess the 5-letter word in 6 tries
        </p>
      </div>

      {/* ── Toast Notification ────────────────────────────────── */}
      <div className="flex items-center justify-center">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute px-4 py-1.5 rounded-lg bg-foreground text-background text-sm font-semibold shadow-lg"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Letter Grid (6 rows × 5 columns) ─────────────────── */}
      <div className="flex flex-col gap-1.5">
        {guesses.map((row, rowIndex) => {
          const isEvaluated = rowIndex < currentRow;
          const isActive = rowIndex === currentRow;

          return (
            <motion.div
              key={rowIndex}
              className="flex gap-1.5"
              animate={undefined}
            >
              {row.map((tile, colIndex) => (
                <WordleTile
                  key={`${rowIndex}-${colIndex}`}
                  tile={tile}
                  index={colIndex}
                  isEvaluated={isEvaluated}
                  isActive={isActive}
                />
              ))}
            </motion.div>
          );
        })}
      </div>

      {/* ── Game Over Message ─────────────────────────────────── */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1, duration: 0.3 }}
            className="flex flex-col items-center gap-3 p-4 rounded-xl bg-surface border border-border shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {gameStatus === "won" ? "🎉" : "😔"}
              </span>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {gameStatus === "won" ? "Congratulations!" : "Better luck next time!"}
                </h3>
                <p className="text-sm text-foreground-secondary">
                  {gameStatus === "won"
                    ? `You got it in ${currentRow} ${currentRow === 1 ? "guess" : "guesses"}!`
                    : (
                      <>
                        The word was{" "}
                        <span className="font-bold text-foreground">{solution}</span>
                      </>
                    )}
                </p>
                {gameStatus === "won" && user && (
                  <p className="text-xs text-emerald-500 mt-1">✓ Win saved to leaderboard</p>
                )}
              </div>
            </div>
            <button
              onClick={handleRestart}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-6 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              New Word
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── On-Screen Keyboard ────────────────────────────────── */}
      <div className="w-full">
        <WordleKeyboard
          keyboardStatus={keyboardStatus}
          onKeyPress={handleKeyPress}
        />
      </div>

      {/* ── Login Modal ────────────────────────────────────────── */}
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
          subtitle="Log in to save your Wordle wins to the leaderboard!"
        />
      )}

      {/* ── Help Text ─────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 text-xs text-foreground-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span>Correct</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span>Wrong spot</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-slate-500" />
          <span>Not in word</span>
        </div>
      </div>
    </div>
  );
}

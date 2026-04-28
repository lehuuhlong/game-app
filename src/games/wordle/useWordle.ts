"use client";

/**
 * useWordle — custom hook encapsulating all Wordle game mechanics.
 *
 * Features:
 * - 6 attempts to guess a 5-letter word
 * - Color feedback: correct (green), present (yellow), absent (gray)
 * - Handles duplicate-letter edge cases correctly
 * - On-screen keyboard status tracking
 * - Physical keyboard input support (keydown events)
 * - Toast notifications for invalid words / win / loss
 * - New game restart
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  WordleState,
  GuessRow,
  LetterTile,
  LetterStatus,
  KeyboardStatus,
  GameStatus,
} from "./types";
import { MAX_GUESSES, WORD_LENGTH } from "./types";
import { VALID_GUESSES, getRandomSolution } from "./dictionary";

// ── Helpers ───────────────────────────────────────────────────────

/** Create an empty 6×5 grid */
function createEmptyGuesses(): GuessRow[] {
  return Array.from({ length: MAX_GUESSES }, () =>
    Array.from({ length: WORD_LENGTH }, (): LetterTile => ({
      letter: "",
      status: "empty",
    }))
  );
}

/**
 * Evaluate a guess against the solution.
 *
 * This correctly handles duplicate letters:
 * 1. First pass: mark exact matches (green / "correct")
 * 2. Second pass: for unmatched letters, check if they exist
 *    in remaining (unmatched) positions of the solution (yellow / "present")
 * 3. Everything else is "absent" (gray)
 */
function evaluateGuess(guess: string, solution: string): LetterTile[] {
  const result: LetterTile[] = guess.split("").map((letter) => ({
    letter,
    status: "absent" as LetterStatus,
  }));

  // Track which solution letters have been "consumed"
  const solutionChars = solution.split("");
  const consumed = new Array(WORD_LENGTH).fill(false);

  // Pass 1: Exact matches (correct / green)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === solutionChars[i]) {
      result[i].status = "correct";
      consumed[i] = true;
    }
  }

  // Pass 2: Present but wrong position (yellow)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i].status === "correct") continue;

    for (let j = 0; j < WORD_LENGTH; j++) {
      if (!consumed[j] && guess[i] === solutionChars[j]) {
        result[i].status = "present";
        consumed[j] = true;
        break;
      }
    }
  }

  return result;
}

/**
 * Update the keyboard status map after a guess.
 * Priority: correct > present > absent
 * (Once a key is green, it stays green even if a later guess marks it yellow)
 */
function updateKeyboardStatus(
  current: KeyboardStatus,
  evaluatedRow: LetterTile[]
): KeyboardStatus {
  const updated = { ...current };
  const priority: Record<LetterStatus, number> = {
    correct: 3,
    present: 2,
    absent: 1,
    empty: 0,
  };

  for (const tile of evaluatedRow) {
    const existing = updated[tile.letter];
    const existingPriority = existing ? priority[existing] : 0;
    const newPriority = priority[tile.status];
    if (newPriority > existingPriority) {
      updated[tile.letter] = tile.status;
    }
  }

  return updated;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useWordle() {
  const [state, setState] = useState<WordleState>(() => ({
    guesses: createEmptyGuesses(),
    currentRow: 0,
    currentGuess: "",
    gameStatus: "playing",
    solution: getRandomSolution(),
    keyboardStatus: {},
    toast: null,
  }));

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Show Toast ──────────────────────────────────────────────────

  const showToast = useCallback((message: string, duration = 2000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setState((prev) => ({ ...prev, toast: message }));
    toastTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, toast: null }));
    }, duration);
  }, []);

  // Cleanup toast timer
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // ── Type a letter ───────────────────────────────────────────────

  const addLetter = useCallback((letter: string) => {
    setState((prev) => {
      if (prev.gameStatus !== "playing") return prev;
      if (prev.currentGuess.length >= WORD_LENGTH) return prev;

      const newGuess = prev.currentGuess + letter.toUpperCase();
      const newGuesses = prev.guesses.map((row) => [...row]);

      // Update the current row's display
      for (let i = 0; i < WORD_LENGTH; i++) {
        newGuesses[prev.currentRow][i] = {
          letter: newGuess[i] || "",
          status: "empty",
        };
      }

      return {
        ...prev,
        guesses: newGuesses,
        currentGuess: newGuess,
      };
    });
  }, []);

  // ── Delete last letter ──────────────────────────────────────────

  const deleteLetter = useCallback(() => {
    setState((prev) => {
      if (prev.gameStatus !== "playing") return prev;
      if (prev.currentGuess.length === 0) return prev;

      const newGuess = prev.currentGuess.slice(0, -1);
      const newGuesses = prev.guesses.map((row) => [...row]);

      // Update the current row's display
      for (let i = 0; i < WORD_LENGTH; i++) {
        newGuesses[prev.currentRow][i] = {
          letter: newGuess[i] || "",
          status: "empty",
        };
      }

      return {
        ...prev,
        guesses: newGuesses,
        currentGuess: newGuess,
      };
    });
  }, []);

  // ── Submit guess ────────────────────────────────────────────────

  const submitGuess = useCallback(() => {
    setState((prev) => {
      if (prev.gameStatus !== "playing") return prev;

      // Must be full-length
      if (prev.currentGuess.length !== WORD_LENGTH) {
        return prev; // Toast shown separately
      }

      // Validate word is in dictionary
      if (!VALID_GUESSES.has(prev.currentGuess)) {
        return prev; // Toast shown separately
      }

      // Evaluate the guess
      const evaluated = evaluateGuess(prev.currentGuess, prev.solution);
      const newGuesses = prev.guesses.map((row) => [...row]);
      newGuesses[prev.currentRow] = evaluated;

      // Update keyboard
      const newKeyboard = updateKeyboardStatus(prev.keyboardStatus, evaluated);

      // Check win
      const isWin = evaluated.every((t) => t.status === "correct");
      const nextRow = prev.currentRow + 1;

      let newStatus: GameStatus = "playing";
      if (isWin) {
        newStatus = "won";
      } else if (nextRow >= MAX_GUESSES) {
        newStatus = "lost";
      }

      return {
        ...prev,
        guesses: newGuesses,
        currentRow: nextRow,
        currentGuess: "",
        gameStatus: newStatus,
        keyboardStatus: newKeyboard,
      };
    });
  }, []);

  // Wrapper that handles toast messages for invalid submissions
  const handleSubmit = useCallback(() => {
    // Read current state to decide toast before submitting
    const { currentGuess, gameStatus } = state;
    if (gameStatus !== "playing") return;

    if (currentGuess.length < WORD_LENGTH) {
      showToast("Not enough letters");
      return;
    }
    if (!VALID_GUESSES.has(currentGuess)) {
      showToast("Word not in list");
      return;
    }

    submitGuess();
  }, [state, submitGuess, showToast]);

  // ── Keyboard handler ────────────────────────────────────────────

  const handleKeyPress = useCallback(
    (key: string) => {
      if (state.gameStatus !== "playing") return;

      if (key === "ENTER" || key === "Enter") {
        handleSubmit();
      } else if (key === "BACKSPACE" || key === "Backspace" || key === "DELETE" || key === "Delete") {
        deleteLetter();
      } else if (/^[A-Za-z]$/.test(key)) {
        addLetter(key);
      }
    },
    [state.gameStatus, handleSubmit, deleteLetter, addLetter]
  );

  // Physical keyboard events
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleKeyPress]);

  // ── Restart ─────────────────────────────────────────────────────

  const restart = useCallback(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setState({
      guesses: createEmptyGuesses(),
      currentRow: 0,
      currentGuess: "",
      gameStatus: "playing",
      solution: getRandomSolution(),
      keyboardStatus: {},
      toast: null,
    });
  }, []);

  return {
    ...state,
    addLetter,
    deleteLetter,
    handleSubmit,
    handleKeyPress,
    restart,
  };
}

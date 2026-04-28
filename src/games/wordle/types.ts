/**
 * Wordle type definitions.
 */

/** Feedback color for each letter in a guess */
export type LetterStatus = "correct" | "present" | "absent" | "empty";

/** A single letter tile in the guess grid */
export interface LetterTile {
  letter: string;
  status: LetterStatus;
}

/** One complete row (5 letters) */
export type GuessRow = LetterTile[];

/** Keyboard key status — tracks the "best" status known for each letter */
export type KeyboardStatus = Record<string, LetterStatus>;

export type GameStatus = "playing" | "won" | "lost";

export interface WordleState {
  /** 6 rows × 5 columns grid of guesses */
  guesses: GuessRow[];
  /** The current row being typed into (0-5) */
  currentRow: number;
  /** Letters typed into the current row so far */
  currentGuess: string;
  /** Overall game state */
  gameStatus: GameStatus;
  /** The secret target word */
  solution: string;
  /** Per-key feedback for the on-screen keyboard */
  keyboardStatus: KeyboardStatus;
  /** Toast message to show (e.g. "Not in word list") */
  toast: string | null;
}

export const MAX_GUESSES = 6;
export const WORD_LENGTH = 5;

"use client";

/**
 * useLine98 — Game State Hook for Classic Line 98 (Color Lines)
 *
 * Manages:
 * - 9×9 board state (immutable updates)
 * - Ball selection & movement (with BFS path validation)
 * - Preview balls (tiny ghost balls showing next spawn positions — International rule)
 * - Score tracking with combo/length bonuses
 * - Spawn logic: preview balls grow into full balls; displaced previews are skipped
 * - Game over detection (board full after spawn)
 * - Path animation coordinates for UI rendering
 * - Matched cells for removal animation
 * - Turn-by-turn state machine
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BallColor,
  BALL_COLORS,
  Cell,
  Coord,
  BOARD_SIZE,
  SPAWN_COUNT,
} from "./types";
import {
  createEmptyBoard,
  cloneBoard,
  findPath,
  detectMatches,
  getEmptyCells,
  shuffle,
  parseCoordKey,
} from "./utils";

// ─── Game Phase ──────────────────────────────────────────────────────

export type GamePhase =
  | "idle"            // Waiting for player input
  | "selected"        // A ball is selected, waiting for destination
  | "animating"       // Ball is sliding along a path (UI should animate)
  | "removing"        // Matched balls are being removed (UI should animate)
  | "spawning"        // New balls are appearing (UI should animate)
  | "game-over";      // Board is full, game ended

// ─── Preview Ball (ghost/tiny ball on the grid) ──────────────────────

export interface PreviewBall {
  row: number;
  col: number;
  color: BallColor;
}

// ─── Score Event (for floating "+X" animation) ──────────────────────

export interface ScoreEvent {
  id: number;
  score: number;
  isCombo: boolean;
  /** The cell where the score popup should appear. */
  position: Coord;
  timestamp: number;
}

// ─── Hook Return Type ────────────────────────────────────────────────

export interface Line98State {
  /** The 9×9 board. */
  board: Cell[][];
  /** Current game phase. */
  phase: GamePhase;
  /** Currently selected cell (if any). */
  selectedCell: Coord | null;
  /** Current score. */
  score: number;
  /** High score (persisted in localStorage). */
  highScore: number;
  /** Preview of the next 3 ball colors to be spawned (for the info panel). */
  nextColors: BallColor[];
  /**
   * Preview balls on the grid — tiny ghost balls showing where the next
   * 3 balls will appear. International Line 98 rule.
   */
  previewBalls: PreviewBall[];
  /** Path being animated (ball sliding from A to B). */
  animatingPath: Coord[] | null;
  /** Cells currently being removed (matched). */
  removingCells: Set<string> | null;
  /** Cells where new balls just spawned (for entrance animation). */
  spawningCells: Coord[] | null;
  /** Recent score events for floating score popups. */
  scoreEvents: ScoreEvent[];
  /** Total number of moves made. */
  moveCount: number;
  /** Whether the game is over. */
  isGameOver: boolean;

  // ── Actions ──
  /** Handle a cell click (select ball or move to empty cell). */
  handleCellClick: (row: number, col: number) => void;
  /** Reset the game to a fresh state. */
  resetGame: () => void;
  /** Called by UI after path animation completes. */
  onAnimationComplete: () => void;
  /** Called by UI after removal animation completes. */
  onRemovalComplete: () => void;
  /** Called by UI after spawn animation completes. */
  onSpawnComplete: () => void;
  /** Dismiss a score event popup. */
  dismissScoreEvent: (id: number) => void;
  /** Get full move action log for anti-cheat verification */
  getActionLog: () => Array<{ t: number; from: { r: number; c: number }; to: { r: number; c: number } }>;
}

// ─── Constants ───────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = "line98-high-score";
const INITIAL_SPAWN_COUNT = 5; // First turn spawns 5 balls

// ─── Helpers ─────────────────────────────────────────────────────────

/** Pick a random ball color. */
function randomColor(): BallColor {
  return BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
}

/** Generate the next 3 preview colors. */
function generateNextColors(): BallColor[] {
  return Array.from({ length: SPAWN_COUNT }, () => randomColor());
}

/**
 * Pick random empty cells for preview ball positions.
 * Returns an array of PreviewBall (position + color).
 */
function generatePreviewBalls(
  board: Cell[][],
  colors: BallColor[]
): PreviewBall[] {
  const emptyCells = getEmptyCells(board);
  shuffle(emptyCells);
  const count = Math.min(colors.length, emptyCells.length);
  const previews: PreviewBall[] = [];
  for (let i = 0; i < count; i++) {
    previews.push({
      row: emptyCells[i].row,
      col: emptyCells[i].col,
      color: colors[i],
    });
  }
  return previews;
}

/**
 * Spawn the preview balls onto the board.
 * If a preview cell is now occupied (the player moved a ball there),
 * that preview ball relocates to another available empty cell on the board
 * (such as the cell the player just vacated).
 *
 * @returns The positions where balls were actually placed.
 */
function spawnPreviewBalls(
  board: Cell[][],
  previews: PreviewBall[]
): Coord[] {
  const placed: Coord[] = [];
  const displaced: BallColor[] = [];

  // Phase 1: Spawn previews whose cells are still empty
  for (const p of previews) {
    if (board[p.row][p.col] === null) {
      board[p.row][p.col] = p.color;
      placed.push({ row: p.row, col: p.col });
    } else {
      // Cell was occupied by player move — relocate this preview ball
      displaced.push(p.color);
    }
  }

  // Phase 2: Relocate displaced balls to remaining empty cells
  if (displaced.length > 0) {
    const emptyCells = getEmptyCells(board);
    shuffle(emptyCells);
    const count = Math.min(displaced.length, emptyCells.length);
    for (let i = 0; i < count; i++) {
      const { row, col } = emptyCells[i];
      board[row][col] = displaced[i];
      placed.push({ row, col });
    }
  }

  return placed;
}

/**
 * Legacy random spawn (used for initial 5 balls only).
 */
function spawnBallsRandom(
  board: Cell[][],
  colors: BallColor[]
): Coord[] {
  const emptyCells = getEmptyCells(board);
  shuffle(emptyCells);
  const count = Math.min(colors.length, emptyCells.length);
  const placed: Coord[] = [];
  for (let i = 0; i < count; i++) {
    const { row, col } = emptyCells[i];
    board[row][col] = colors[i];
    placed.push({ row, col });
  }
  return placed;
}

/**
 * After spawning, check every newly spawned cell for accidental line
 * matches. Remove matched balls and award score.
 */
function checkSpawnMatches(
  board: Cell[][],
  spawnedCells: Coord[]
): { matched: Set<string>; score: number } {
  const allMatched = new Set<string>();
  let totalScore = 0;

  for (const cell of spawnedCells) {
    if (board[cell.row][cell.col] === null) continue;
    const result = detectMatches(board, cell.row, cell.col);
    if (result.matched.size > 0) {
      Array.from(result.matched).forEach((key) => allMatched.add(key));
      totalScore += result.score;
    }
  }

  // Remove matched balls
  Array.from(allMatched).forEach((key) => {
    const { row, col } = parseCoordKey(key);
    board[row][col] = null;
  });

  return { matched: allMatched, score: totalScore };
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useLine98(): Line98State {
  // ── Core State ─────────────────────────────────────────────────────
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard());
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [selectedCell, setSelectedCell] = useState<Coord | null>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [nextColors, setNextColors] = useState<BallColor[]>(() =>
    generateNextColors()
  );
  const [previewBalls, setPreviewBalls] = useState<PreviewBall[]>([]);
  const [moveCount, setMoveCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  // ── Animation State ────────────────────────────────────────────────
  const [animatingPath, setAnimatingPath] = useState<Coord[] | null>(null);
  const [removingCells, setRemovingCells] = useState<Set<string> | null>(null);
  const [spawningCells, setSpawningCells] = useState<Coord[] | null>(null);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);

  // ── Refs for pending operations (survive across re-renders) ────────
  const pendingMoveRef = useRef<{
    from: Coord;
    to: Coord;
    path: Coord[];
  } | null>(null);

  const scoreEventIdRef = useRef(0);
  const actionLogRef = useRef<
    Array<{ t: number; from: { r: number; c: number }; to: { r: number; c: number } }>
  >([]);

  // ── Load high score from localStorage ──────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) setHighScore(parseInt(stored, 10) || 0);
    } catch {
      // localStorage unavailable (SSR or private mode)
    }
  }, []);

  // ── Persist high score ─────────────────────────────────────────────
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(score));
      } catch {
        // ignore
      }
    }
  }, [score, highScore]);

  // ── Create a score event (for floating "+X" popup) ─────────────────
  const emitScoreEvent = useCallback(
    (points: number, isCombo: boolean, position: Coord) => {
      const id = ++scoreEventIdRef.current;
      const event: ScoreEvent = {
        id,
        score: points,
        isCombo,
        position,
        timestamp: Date.now(),
      };
      setScoreEvents((prev) => [...prev, event]);
    },
    []
  );

  // ── Dismiss a score event ──────────────────────────────────────────
  const dismissScoreEvent = useCallback((id: number) => {
    setScoreEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // ── Initialize Game (spawn first 5 balls + place 3 previews) ───────
  const initGame = useCallback(() => {
    actionLogRef.current = [];
    const newBoard = createEmptyBoard();
    const initialColors = Array.from({ length: INITIAL_SPAWN_COUNT }, () =>
      randomColor()
    );
    spawnBallsRandom(newBoard, initialColors);

    // Generate next-3 colors and their preview positions
    const preview = generateNextColors();
    const previews = generatePreviewBalls(newBoard, preview);

    setBoard(newBoard);
    setPhase("idle");
    setSelectedCell(null);
    setScore(0);
    setNextColors(preview);
    setPreviewBalls(previews);
    setMoveCount(0);
    setIsGameOver(false);
    setAnimatingPath(null);
    setRemovingCells(null);
    setSpawningCells(null);
    setScoreEvents([]);
    pendingMoveRef.current = null;
  }, []);

  // ── Auto-init on first mount ───────────────────────────────────────
  useEffect(() => {
    initGame();
  }, [initGame]);

  // ── Reset Game ─────────────────────────────────────────────────────
  const resetGame = useCallback(() => {
    initGame();
  }, [initGame]);

  // ── Handle Cell Click ──────────────────────────────────────────────
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      // Block input during animations or game over
      if (
        phase === "animating" ||
        phase === "removing" ||
        phase === "spawning" ||
        phase === "game-over"
      ) {
        return;
      }

      const cellValue = board[row][col];

      // ── Clicking on a ball ──
      if (cellValue !== null) {
        // Select (or re-select) a ball
        setSelectedCell({ row, col });
        setPhase("selected");
        return;
      }

      // ── Clicking on an empty cell ──
      if (phase !== "selected" || selectedCell === null) {
        // No ball selected — ignore empty cell clicks
        return;
      }

      // Attempt to find a BFS path from selected ball to clicked cell
      const path = findPath(board, selectedCell, { row, col });

      if (path === null) {
        // No valid path — do nothing (keep selection)
        return;
      }

      // Valid path found! Start the move animation.
      pendingMoveRef.current = {
        from: selectedCell,
        to: { row, col },
        path,
      };
      setAnimatingPath(path);
      setPhase("animating");
      setSelectedCell(null);
    },
    [board, phase, selectedCell]
  );

  // ── Animation Complete: Execute the Move ───────────────────────────
  const onAnimationComplete = useCallback(() => {
    const pending = pendingMoveRef.current;
    if (!pending) {
      setPhase("idle");
      return;
    }

    const { from, to } = pending;
    pendingMoveRef.current = null;
    setAnimatingPath(null);

    // Execute the move on a cloned board
    const newBoard = cloneBoard(board);
    const color = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    newBoard[to.row][to.col] = color;

    // Record action log entry with timestamp for anti-cheat verification
    actionLogRef.current.push({
      t: Date.now(),
      from: { r: from.row, c: from.col },
      to: { r: to.row, c: to.col },
    });

    // Check for matches at the destination
    const matchResult = detectMatches(newBoard, to.row, to.col);

    if (matchResult.matched.size > 0) {
      // Matches found! Trigger removal animation.
      // Do NOT spawn preview balls this turn.
      setBoard(newBoard);
      setRemovingCells(matchResult.matched);
      setPhase("removing");
      setMoveCount((c) => c + 1);

      // Emit score event
      emitScoreEvent(
        matchResult.score,
        matchResult.lineCount >= 2,
        to
      );
      setScore((s) => s + matchResult.score);
    } else {
      // No matches — spawn the preview balls at their pre-determined positions.
      // If the player moved into a preview cell, that preview is displaced (skipped).
      const placed = spawnPreviewBalls(newBoard, previewBalls);

      // Check if spawned balls accidentally formed lines
      const spawnMatch = checkSpawnMatches(newBoard, placed);
      if (spawnMatch.score > 0) {
        emitScoreEvent(spawnMatch.score, false, placed[0]);
        setScore((s) => s + spawnMatch.score);
      }

      // Check for game over (no empty cells left at all)
      const emptyCells = getEmptyCells(newBoard);
      if (emptyCells.length === 0) {
        setBoard(newBoard);
        setPreviewBalls([]);
        setPhase("game-over");
        setIsGameOver(true);
        setMoveCount((c) => c + 1);
        return;
      }

      // Generate new preview colors and their positions on the updated board
      const newColors = generateNextColors();
      const newPreviews = generatePreviewBalls(newBoard, newColors);

      setBoard(newBoard);
      setNextColors(newColors);
      setPreviewBalls(newPreviews);
      // Filter out cells that were removed by spawn-match
      const survivingSpawns = placed.filter(
        (c) => newBoard[c.row][c.col] !== null
      );

      if (survivingSpawns.length > 0) {
        setSpawningCells(survivingSpawns);
        setPhase("spawning");
      } else {
        setPhase("idle");
      }
    }
  }, [board, previewBalls, emitScoreEvent]);

  // ── Removal Complete: Clear matched cells ──────────────────────────
  const onRemovalComplete = useCallback(() => {
    if (!removingCells) {
      setPhase("idle");
      return;
    }

    // Remove the matched balls from the board
    const newBoard = cloneBoard(board);
    Array.from(removingCells).forEach((key) => {
      const { row, col } = parseCoordKey(key);
      newBoard[row][col] = null;
    });

    setBoard(newBoard);
    setRemovingCells(null);

    // After a successful match, do NOT spawn new balls this turn.
    setPhase("idle");
  }, [board, removingCells]);

  // ── Spawn Complete ─────────────────────────────────────────────────
  const onSpawnComplete = useCallback(() => {
    setSpawningCells(null);
    setPhase("idle");
  }, []);

  return {
    board,
    phase,
    selectedCell,
    score,
    highScore,
    nextColors,
    previewBalls,
    animatingPath,
    removingCells,
    spawningCells,
    scoreEvents,
    moveCount,
    isGameOver,
    handleCellClick,
    resetGame,
    onAnimationComplete,
    onRemovalComplete,
    onSpawnComplete,
    dismissScoreEvent,
    getActionLog: useCallback(() => actionLogRef.current, []),
  };
}

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CellState,
  GameMode,
  MoveAction,
  Puzzle,
  ToolMode,
  GameStatus,
  UseNonogramEngineReturn,
} from './types';
import { generateClues, PUZZLES } from './puzzles';
import * as Sounds from './sounds';

/**
 * Evaluates whether a row's filled cells match the puzzle solution.
 * Nonogram rules: all cells that should be filled must have state 1,
 * and no cells that should be empty can have state 1 (0 or 2 are both not filled).
 */
function isRowSatisfied(grid: CellState[][], r: number, puzzle: Puzzle): boolean {
  for (let c = 0; c < puzzle.width; c++) {
    const shouldBeFilled = puzzle.solution[r][c] === 1;
    const isFilled = grid[r][c] === 1;
    if (shouldBeFilled !== isFilled) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluates whether a column's filled cells match the puzzle solution.
 */
function isColSatisfied(grid: CellState[][], c: number, puzzle: Puzzle): boolean {
  for (let r = 0; r < puzzle.height; r++) {
    const shouldBeFilled = puzzle.solution[r][c] === 1;
    const isFilled = grid[r][c] === 1;
    if (shouldBeFilled !== isFilled) {
      return false;
    }
  }
  return true;
}

/**
 * Pre-evaluates row and column completions for a grid.
 * Used during puzzle load/init to immediately mark zero-clue lines ([0]) (F2).
 */
function getInitialCompletedLines(puzzle: Puzzle, initialGrid: CellState[][]): {
  rows: Set<number>;
  cols: Set<number>;
} {
  const rows = new Set<number>();
  const cols = new Set<number>();
  for (let r = 0; r < puzzle.height; r++) {
    if (isRowSatisfied(initialGrid, r, puzzle)) {
      rows.add(r);
    }
  }
  for (let c = 0; c < puzzle.width; c++) {
    if (isColSatisfied(initialGrid, c, puzzle)) {
      cols.add(c);
    }
  }
  return { rows, cols };
}

export function useNonogramEngine(initialPuzzleId?: string): UseNonogramEngineReturn {
  // Find initial puzzle or default to easy_heart
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle>(() => {
    return (
      PUZZLES.find((p) => p.id === initialPuzzleId) ||
      PUZZLES.find((p) => p.difficulty === 'EASY') ||
      PUZZLES[0]
    );
  });

  const [clues, setClues] = useState(() => generateClues(currentPuzzle.solution));

  // Player's grid state: 0 (empty), 1 (filled), 2 (X)
  const [grid, setGrid] = useState<CellState[][]>(() =>
    Array.from({ length: currentPuzzle.height }, () =>
      Array.from({ length: currentPuzzle.width }, () => 0 as CellState)
    )
  );

  // Synchronous grid ref to prevent race conditions during rapid dragging (F3)
  const gridRef = useRef<CellState[][]>(grid);
  useEffect(() => {
    gridRef.current = grid;
  }, [grid]);

  const [toolMode, setToolMode] = useState<ToolMode>('FILL');
  const [gameMode, setGameMode] = useState<GameMode>('CLASSIC');
  const [status, setStatus] = useState<GameStatus>('READY');

  const [mistakes, setMistakes] = useState(0);
  const mistakesRef = useRef(0);
  useEffect(() => {
    mistakesRef.current = mistakes;
  }, [mistakes]);

  const [hintsUsed, setHintsUsed] = useState(0);
  const hintsUsedRef = useRef(0);
  useEffect(() => {
    hintsUsedRef.current = hintsUsed;
  }, [hintsUsed]);

  const [timer, setTimer] = useState(0);
  const timerRef = useRef(0);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  // Pre-evaluate zero-clue lines ([0]) on initial hook state mount (F2)
  const [completedRows, setCompletedRows] = useState<Set<number>>(() => {
    return getInitialCompletedLines(currentPuzzle, grid).rows;
  });
  const [completedCols, setCompletedCols] = useState<Set<number>>(() => {
    return getInitialCompletedLines(currentPuzzle, grid).cols;
  });

  const completedRowsRef = useRef<Set<number>>(completedRows);
  const completedColsRef = useRef<Set<number>>(completedCols);

  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);

  // Dragging interaction state (F3)
  const isPointerDownRef = useRef(false);
  const activeDragToolRef = useRef<ToolMode | null>(null);
  const dragTargetValueRef = useRef<CellState | null>(null);
  const visitedCellsRef = useRef<Set<string>>(new Set());
  const currentDragBatchRef = useRef<MoveAction[]>([]);

  // Undo / Redo history state (F5)
  const undoStackRef = useRef<MoveAction[][]>([]);
  const redoStackRef = useRef<MoveAction[][]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const canUndo = undoCount > 0 && status !== 'WON' && status !== 'LOST';
  const canRedo = redoCount > 0 && status !== 'WON' && status !== 'LOST';

  // Timer interval effect
  useEffect(() => {
    if (status !== 'PLAYING') return;

    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  // Load new puzzle
  const selectPuzzle = useCallback((puzzle: Puzzle) => {
    setCurrentPuzzle(puzzle);
    setClues(generateClues(puzzle.solution));
    const emptyGrid = Array.from({ length: puzzle.height }, () =>
      Array.from({ length: puzzle.width }, () => 0 as CellState)
    );
    gridRef.current = emptyGrid;
    setGrid(emptyGrid);

    setStatus('READY');
    setMistakes(0);
    mistakesRef.current = 0;
    setHintsUsed(0);
    hintsUsedRef.current = 0;
    setTimer(0);
    timerRef.current = 0;
    setScore(0);
    setStars(0);

    // Pre-evaluate zero-clue lines ([0]) on puzzle load (F2)
    const initialCompleted = getInitialCompletedLines(puzzle, emptyGrid);
    completedRowsRef.current = new Set(initialCompleted.rows);
    completedColsRef.current = new Set(initialCompleted.cols);
    setCompletedRows(initialCompleted.rows);
    setCompletedCols(initialCompleted.cols);

    // Reset undo/redo stacks (F5)
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoCount(0);
    setRedoCount(0);

    // Reset drag state (F3)
    isPointerDownRef.current = false;
    activeDragToolRef.current = null;
    dragTargetValueRef.current = null;
    visitedCellsRef.current.clear();
    currentDragBatchRef.current = [];
  }, []);


  // Bidirectional line completion evaluator (F1)
  const evaluateLines = useCallback(
    (
      currentGrid: CellState[][],
      rowsToCheck: Iterable<number>,
      colsToCheck: Iterable<number>,
      puzzle: Puzzle,
      playSoundOnNewCompletion = true
    ) => {
      const nextRows = new Set(completedRowsRef.current);
      const nextCols = new Set(completedColsRef.current);
      let newlyCompleted = false;

      for (const r of rowsToCheck) {
        const satisfied = isRowSatisfied(currentGrid, r, puzzle);
        if (satisfied) {
          if (!nextRows.has(r)) {
            nextRows.add(r);
            newlyCompleted = true;
          }
        } else {
          nextRows.delete(r);
        }
      }

      for (const c of colsToCheck) {
        const satisfied = isColSatisfied(currentGrid, c, puzzle);
        if (satisfied) {
          if (!nextCols.has(c)) {
            nextCols.add(c);
            newlyCompleted = true;
          }
        } else {
          nextCols.delete(c);
        }
      }

      const rowsChanged =
        nextRows.size !== completedRowsRef.current.size ||
        [...nextRows].some((r) => !completedRowsRef.current.has(r));
      const colsChanged =
        nextCols.size !== completedColsRef.current.size ||
        [...nextCols].some((c) => !completedColsRef.current.has(c));

      if (rowsChanged) {
        completedRowsRef.current = new Set(nextRows);
        setCompletedRows(new Set(nextRows));
      }
      if (colsChanged) {
        completedColsRef.current = new Set(nextCols);
        setCompletedCols(new Set(nextCols));
      }

      if (playSoundOnNewCompletion && newlyCompleted) {
        Sounds.playLineCompleteSound();
      }
    },
    []
  );

  // Check if a line (row or column) matches its solution exactly for filled cells (F1)
  const checkLineCompletion = useCallback(
    (currentGrid: CellState[][], rIndex: number, cIndex: number, puzzle: Puzzle) => {
      evaluateLines(currentGrid, [rIndex], [cIndex], puzzle, true);
    },
    [evaluateLines]
  );

  // Check overall board victory
  const checkVictory = useCallback(
    (
      currentGrid: CellState[][],
      puzzle: Puzzle,
      currentTimer: number,
      currentMistakes: number,
      hints: number
    ) => {
      for (let r = 0; r < puzzle.height; r++) {
        for (let c = 0; c < puzzle.width; c++) {
          const isFilled = currentGrid[r][c] === 1;
          const shouldBeFilled = puzzle.solution[r][c] === 1;
          if (isFilled !== shouldBeFilled) {
            return false;
          }
        }
      }

      // Puzzle Solved! Compute score and stars
      const basePoints =
        puzzle.difficulty === 'EASY' ? 100 : puzzle.difficulty === 'MEDIUM' ? 300 : 600;
      const targetTime =
        puzzle.difficulty === 'EASY' ? 90 : puzzle.difficulty === 'MEDIUM' ? 240 : 480;
      const timeBonus = Math.max(0, Math.floor((targetTime - currentTimer) * 1.5));
      const mistakeBonus = currentMistakes === 0 ? 150 : currentMistakes === 1 ? 50 : 0;
      const hintBonus = hints === 0 ? 100 : 0;

      const totalScore = basePoints + timeBonus + mistakeBonus + hintBonus;

      let awardedStars = 1;
      if (currentMistakes === 0 && currentTimer <= targetTime) {
        awardedStars = 3;
      } else if (currentMistakes <= 1 && currentTimer <= targetTime * 1.3) {
        awardedStars = 2;
      }

      setScore(totalScore);
      setStars(awardedStars);
      setStatus('WON');
      Sounds.playVictorySound();
      return true;
    },
    []
  );

  // Apply uniform target value to a cell with Classic mode safety guards (F3, F4)
  const applyTargetToCell = useCallback(
    (r: number, c: number, targetVal: CellState, tool: ToolMode) => {
      if (status === 'WON' || status === 'LOST') return;
      if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;

      const currentVal = gridRef.current[r][c];
      const shouldBeFilled = currentPuzzle.solution[r][c] === 1;

      // Solved-cell safety in Classic mode (F4):
      // If a cell is already correctly solved (currentVal === 1 and touching with CROSS,
      // or currentVal === 2 and touching with FILL), do NOT penalize with a mistake.
      if (gameMode === 'CLASSIC') {
        if (currentVal === 1 && tool === 'CROSS') {
          return;
        }
        if (currentVal === 2 && tool === 'FILL') {
          return;
        }
      }

      let newVal = targetVal;
      let isMistake = false;

      if (targetVal === 0) {
        // Erase mode: only erase matching cell type for active tool
        if (tool === 'FILL' && currentVal === 1) {
          newVal = 0;
        } else if (tool === 'CROSS' && currentVal === 2) {
          newVal = 0;
        } else {
          return;
        }
      } else if (targetVal === 1) {
        // Painting FILL
        if (currentVal === 1) return; // Already filled, ignore

        if (gameMode === 'CLASSIC' && !shouldBeFilled) {
          isMistake = true;
          newVal = 2; // Auto mark as X when mistake
        } else {
          newVal = 1;
        }
      } else if (targetVal === 2) {
        // Painting CROSS
        if (currentVal === 2) return; // Already crossed, ignore

        if (gameMode === 'CLASSIC' && shouldBeFilled) {
          isMistake = true;
          newVal = 1; // Auto fill correct cell on mistake
        } else {
          newVal = 2;
        }
      }

      if (newVal === currentVal && !isMistake) return;

      // Synchronously update gridRef to prevent race conditions during rapid dragging (F3)
      const nextGrid = gridRef.current.map((row) => [...row]);
      nextGrid[r][c] = newVal;
      gridRef.current = nextGrid;
      setGrid(nextGrid);

      // Record move for current drag batch
      currentDragBatchRef.current.push({
        row: r,
        col: c,
        prevValue: currentVal,
        newValue: newVal,
      });

      // Start timer on first move if ready
      if (status === 'READY') {
        setStatus('PLAYING');
      }

      // Handle sound & mistakes
      if (isMistake) {
        Sounds.playMistakeSound();
        // Cancel dragging immediately on Classic mistake (F3: prevents multi-heart death)
        isPointerDownRef.current = false;
        dragTargetValueRef.current = null;
        activeDragToolRef.current = null;

        const nextMistakes = mistakesRef.current + 1;
        mistakesRef.current = nextMistakes;
        setMistakes(nextMistakes);

        if (gameMode === 'CLASSIC' && nextMistakes >= 3) {
          setStatus('LOST');
          return;
        }
      } else {
        if (newVal === 1) {
          Sounds.playFillSound(1);
        } else if (newVal === 2) {
          Sounds.playCrossSound();
        }
      }

      // Line and victory check
      checkLineCompletion(nextGrid, r, c, currentPuzzle);
      checkVictory(
        nextGrid,
        currentPuzzle,
        timerRef.current,
        mistakesRef.current,
        hintsUsedRef.current
      );
    },
    [status, currentPuzzle, gameMode, checkLineCompletion, checkVictory]
  );

  // Pointer interactions for mouse and touch dragging (F3)
  const handlePointerDown = useCallback(
    (r: number, c: number, isSecondaryClick = false) => {
      if (status === 'WON' || status === 'LOST') return;
      if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;

      isPointerDownRef.current = true;
      currentDragBatchRef.current = [];
      visitedCellsRef.current = new Set();
      visitedCellsRef.current.add(`${r},${c}`);

      const activeTool: ToolMode = isSecondaryClick
        ? toolMode === 'FILL'
          ? 'CROSS'
          : 'FILL'
        : toolMode;

      activeDragToolRef.current = activeTool;

      const currentVal = gridRef.current[r][c];

      // Determine uniform drag intent based on initial cell value & active tool
      let targetVal: CellState | null = null;
      if (activeTool === 'FILL') {
        if (currentVal === 1) {
          targetVal = 0; // erase 1 -> 0
        } else if (currentVal === 2 && gameMode === 'CLASSIC') {
          // Solved-cell safety (F4)
          targetVal = null;
        } else {
          targetVal = 1; // paint 1
        }
      } else {
        // CROSS
        if (currentVal === 2) {
          targetVal = 0; // erase 2 -> 0
        } else if (currentVal === 1 && gameMode === 'CLASSIC') {
          // Solved-cell safety (F4)
          targetVal = null;
        } else {
          targetVal = 2; // paint 2
        }
      }

      dragTargetValueRef.current = targetVal;

      if (targetVal !== null) {
        applyTargetToCell(r, c, targetVal, activeTool);
      }
    },
    [status, currentPuzzle, toolMode, gameMode, applyTargetToCell]
  );

  const handlePointerEnter = useCallback(
    (r: number, c: number) => {
      if (!isPointerDownRef.current) return;
      if (r < 0 || r >= currentPuzzle.height || c < 0 || c >= currentPuzzle.width) return;
      if (visitedCellsRef.current.has(`${r},${c}`)) return;
      if (dragTargetValueRef.current === null || activeDragToolRef.current === null) return;

      visitedCellsRef.current.add(`${r},${c}`);
      applyTargetToCell(r, c, dragTargetValueRef.current, activeDragToolRef.current);
    },
    [currentPuzzle, applyTargetToCell]
  );

  const handlePointerUp = useCallback(() => {
    isPointerDownRef.current = false;
    dragTargetValueRef.current = null;
    activeDragToolRef.current = null;
    visitedCellsRef.current.clear();

    if (currentDragBatchRef.current.length > 0) {
      undoStackRef.current.push([...currentDragBatchRef.current]);
      currentDragBatchRef.current = [];
      redoStackRef.current = []; // Any new player action clears redo stack (F5)
      setUndoCount(undoStackRef.current.length);
      setRedoCount(0);
    }
  }, []);

  // Use a hint
  const useHint = useCallback(() => {
    if (status !== 'PLAYING' && status !== 'READY') return;

    // Find all unfilled cells that should be filled
    const candidateCells: [number, number][] = [];
    for (let r = 0; r < currentPuzzle.height; r++) {
      for (let c = 0; c < currentPuzzle.width; c++) {
        if (currentPuzzle.solution[r][c] === 1 && gridRef.current[r][c] !== 1) {
          candidateCells.push([r, c]);
        }
      }
    }

    if (candidateCells.length === 0) return;

    const [targetR, targetC] =
      candidateCells[Math.floor(Math.random() * candidateCells.length)];

    const prevValue = gridRef.current[targetR][targetC];
    const nextGrid = gridRef.current.map((row) => [...row]);
    nextGrid[targetR][targetC] = 1;
    gridRef.current = nextGrid;
    setGrid(nextGrid);

    undoStackRef.current.push([
      {
        row: targetR,
        col: targetC,
        prevValue,
        newValue: 1,
      },
    ]);
    redoStackRef.current = []; // Any new player action clears redo stack (F5)
    setUndoCount(undoStackRef.current.length);
    setRedoCount(0);

    const nextHints = hintsUsedRef.current + 1;
    hintsUsedRef.current = nextHints;
    setHintsUsed(nextHints);

    if (status === 'READY') setStatus('PLAYING');

    Sounds.playHintSound();
    checkLineCompletion(nextGrid, targetR, targetC, currentPuzzle);
    checkVictory(
      nextGrid,
      currentPuzzle,
      timerRef.current,
      mistakesRef.current,
      nextHints
    );
  }, [status, currentPuzzle, checkLineCompletion, checkVictory]);

  // Undo last action (F5)
  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0 || status === 'WON' || status === 'LOST') return;
    const lastBatch = undoStackRef.current.pop();
    if (!lastBatch || lastBatch.length === 0) return;

    // Push into redo stack
    redoStackRef.current.push(lastBatch);
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);

    const nextGrid = gridRef.current.map((row) => [...row]);
    const affectedRows = new Set<number>();
    const affectedCols = new Set<number>();

    for (const move of lastBatch) {
      nextGrid[move.row][move.col] = move.prevValue;
      affectedRows.add(move.row);
      affectedCols.add(move.col);
    }

    gridRef.current = nextGrid;
    setGrid(nextGrid);

    // Recalculate line completion for all affected rows & columns (F5)
    evaluateLines(nextGrid, affectedRows, affectedCols, currentPuzzle, false);

    Sounds.playUndoSound();
  }, [status, currentPuzzle, evaluateLines]);

  // Redo last undone action (F5)
  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0 || status === 'WON' || status === 'LOST') return;
    const nextBatch = redoStackRef.current.pop();
    if (!nextBatch || nextBatch.length === 0) return;

    // Push back into undo stack
    undoStackRef.current.push(nextBatch);
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);

    const nextGrid = gridRef.current.map((row) => [...row]);
    const affectedRows = new Set<number>();
    const affectedCols = new Set<number>();

    for (const move of nextBatch) {
      nextGrid[move.row][move.col] = move.newValue;
      affectedRows.add(move.row);
      affectedCols.add(move.col);
    }

    gridRef.current = nextGrid;
    setGrid(nextGrid);

    // Recalculate line completion for all affected rows & columns (F5)
    evaluateLines(nextGrid, affectedRows, affectedCols, currentPuzzle, true);

    Sounds.playFillSound(1);

    // Check victory in case redo completes the puzzle
    checkVictory(
      nextGrid,
      currentPuzzle,
      timerRef.current,
      mistakesRef.current,
      hintsUsedRef.current
    );
  }, [status, currentPuzzle, evaluateLines, checkVictory]);

  // Restart current puzzle
  const restart = useCallback(() => {
    selectPuzzle(currentPuzzle);
  }, [selectPuzzle, currentPuzzle]);

  return {
    currentPuzzle,
    clues,
    grid,
    toolMode,
    setToolMode,
    gameMode,
    setGameMode,
    status,
    mistakes,
    hintsUsed,
    timer,
    score,
    stars,
    completedRows,
    completedCols,
    canUndo,
    canRedo,
    selectPuzzle,
    handlePointerDown,
    handlePointerEnter,
    handlePointerUp,
    useHint,
    undo,
    redo,
    restart,
  };
}

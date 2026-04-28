'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSudoku } from './useSudoku';
import { SudokuBoard } from './SudokuBoard';
import { Numpad } from './Numpad';
import { Difficulty } from './utils';

export function GameSudoku() {
  const {
    difficulty,
    initialBoard,
    currentBoard,
    selectedCell,
    conflicts,
    isWon,
    startNewGame,
    setSelectedCell,
    setCellValue,
    eraseCell,
    handleNumpadInput,
  } = useSudoku();

  // Keyboard support for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;
      if (isWon) return;

      const key = e.key;
      if (/^[1-9]$/.test(key)) {
        setCellValue(selectedCell.row, selectedCell.col, parseInt(key, 10));
      } else if (key === 'Backspace' || key === 'Delete') {
        eraseCell(selectedCell.row, selectedCell.col);
      } else if (key === 'ArrowUp') {
        setSelectedCell({ row: Math.max(0, selectedCell.row - 1), col: selectedCell.col });
      } else if (key === 'ArrowDown') {
        setSelectedCell({ row: Math.min(8, selectedCell.row + 1), col: selectedCell.col });
      } else if (key === 'ArrowLeft') {
        setSelectedCell({ row: selectedCell.row, col: Math.max(0, selectedCell.col - 1) });
      } else if (key === 'ArrowRight') {
        setSelectedCell({ row: selectedCell.row, col: Math.min(8, selectedCell.col + 1) });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, setCellValue, eraseCell, setSelectedCell, isWon]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!isWon) {
        setSelectedCell({ row, col });
      }
    },
    [setSelectedCell, isWon],
  );

  return (
    <div className="flex flex-col items-center gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">Sudoku</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">Fill the grid so every row, column, and 3x3 box contains 1-9.</p>
        </div>

        {/* <div className="flex items-center gap-2">
          <select
            value={difficulty}
            onChange={(e) => startNewGame(e.target.value as Difficulty)}
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button
            onClick={() => startNewGame()}
            className="h-10 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-4 text-sm font-bold text-white shadow-md hover:from-sky-600 hover:to-blue-700 transition-all hover:-translate-y-0.5"
          >
            New Game
          </button>
        </div> */}
      </div>

      {/* <div className="w-full flex items-center justify-between sm:hidden">
        <p className="text-xs text-foreground-muted">Tap a cell, then use the numpad below.</p>
      </div> */}

      {/* Main Game Area */}
      {/* <div className="w-full relative flex flex-col items-center">
        <SudokuBoard
          initialBoard={initialBoard}
          currentBoard={currentBoard}
          selectedCell={selectedCell}
          conflicts={conflicts}
          onCellClick={handleCellClick}
        />

        <AnimatePresence>
          {isWon && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-sm bg-background/80 backdrop-blur-sm"
            >
              <h2 className="text-4xl font-black text-green-500 drop-shadow-md mb-2">Solved!</h2>
              <p className="text-foreground font-semibold mb-6">Incredible logic skills!</p>
              <button
                onClick={() => startNewGame()}
                className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-3 text-lg font-bold text-white shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div> */}

      {/* <Numpad onInput={handleNumpadInput} onErase={() => selectedCell && eraseCell(selectedCell.row, selectedCell.col)} /> */}

      <div className="text-4xl font-black text-foreground">Coming soon...</div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Difficulty, 
  generateSolvedBoard, 
  generatePuzzle, 
  getConflicts, 
  cloneBoard, 
  BOARD_SIZE, 
  EMPTY_CELL 
} from "./utils";

export interface SelectedCell {
  row: number;
  col: number;
}

export function useSudoku() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [solvedBoard, setSolvedBoard] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [currentBoard, setCurrentBoard] = useState<number[][]>([]);
  
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [conflicts, setConflicts] = useState<{ row: number; col: number }[]>([]);
  const [isWon, setIsWon] = useState(false);

  const startNewGame = useCallback((newDifficulty?: Difficulty) => {
    const diff = newDifficulty || difficulty;
    setDifficulty(diff);
    
    // Generate new boards
    const solved = generateSolvedBoard();
    const puzzle = generatePuzzle(solved, diff);
    
    setSolvedBoard(solved);
    setInitialBoard(cloneBoard(puzzle));
    setCurrentBoard(cloneBoard(puzzle));
    
    setSelectedCell(null);
    setConflicts([]);
    setIsWon(false);
  }, [difficulty]);

  // Initialize first game on mount
  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if the board is completely filled
  const isBoardFull = useCallback((board: number[][]) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === EMPTY_CELL) return false;
      }
    }
    return true;
  }, []);

  const setCellValue = useCallback((row: number, col: number, value: number) => {
    if (isWon) return;
    
    // Cannot edit the given puzzle cells
    if (initialBoard[row][col] !== EMPTY_CELL) return;

    setCurrentBoard(prev => {
      const newBoard = cloneBoard(prev);
      newBoard[row][col] = value;
      
      // Update conflicts array
      const newConflicts = getConflicts(newBoard);
      setConflicts(newConflicts);
      
      // If there are no conflicts and the board is full, the user wins!
      // This ensures any valid solution is accepted, not just the one we generated.
      if (newConflicts.length === 0 && isBoardFull(newBoard)) {
        setIsWon(true);
      } else {
        setIsWon(false);
      }
      
      return newBoard;
    });
  }, [initialBoard, isWon, isBoardFull]);

  const eraseCell = useCallback((row: number, col: number) => {
    setCellValue(row, col, EMPTY_CELL);
  }, [setCellValue]);

  const handleNumpadInput = useCallback((value: number) => {
    if (selectedCell) {
      setCellValue(selectedCell.row, selectedCell.col, value);
    }
  }, [selectedCell, setCellValue]);

  return {
    difficulty,
    initialBoard,
    currentBoard,
    solvedBoard,
    selectedCell,
    conflicts,
    isWon,
    startNewGame,
    setSelectedCell,
    setCellValue,
    eraseCell,
    handleNumpadInput
  };
}

"use client";

import { useCaroLogic } from "./useCaroLogic";
import { CaroBoard } from "./CaroBoard";
import { GameInfoPanel } from "./GameInfoPanel";

export function GameCaro() {
  const {
    board,
    currentPlayer,
    moves,
    winner,
    winningCells,
    gameStatus,
    config,
    handleMove,
    restart,
    undoLastMove,
  } = useCaroLogic();

  const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="w-full text-center sm:text-left">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Caro <span className="text-gradient">(Gomoku)</span>
        </h1>
        <p className="text-sm text-foreground-secondary mt-0.5">
          Get 5 in a row to win — local 2-player mode
        </p>
      </div>

      {/* Game Layout: Board + Panel */}
      <div className="w-full flex flex-col lg:flex-row items-start gap-6">
        {/* Board */}
        <div className="flex-1 flex justify-center">
          <CaroBoard
            board={board}
            gridSize={config.gridSize}
            winningCells={winningCells}
            lastMove={lastMove}
            onCellClick={handleMove}
            disabled={gameStatus === "finished"}
          />
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-64 shrink-0">
          <GameInfoPanel
            currentPlayer={currentPlayer}
            winner={winner}
            moveCount={moves.length}
            gameStatus={gameStatus}
            onRestart={restart}
            onUndo={undoLastMove}
            canUndo={moves.length > 0 && gameStatus === "playing"}
          />
        </div>
      </div>
    </div>
  );
}

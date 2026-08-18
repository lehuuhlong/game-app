"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import type { ChessColor } from "@/types/socket";

interface ChessBoardProps {
  fen: string;
  orientation: "white" | "black";
  isMyTurn: boolean;
  myColor: ChessColor | null;
  lastMove: { from: string; to: string } | null;
  onPieceDrop: (sourceSquare: string, targetSquare: string, piece?: string) => boolean;
  getPossibleMoves: (square: string) => string[];
  disabled?: boolean;
}

export function ChessBoard({
  fen,
  orientation,
  isMyTurn,
  myColor,
  lastMove,
  onPieceDrop,
  getPossibleMoves,
  disabled = false,
}: ChessBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);

  // Reset selection when FEN changes or turn changes
  useEffect(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
  }, [fen, isMyTurn]);

  // Find king square in check (if king is in check)
  const inCheckKingSquare = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (!chess.isCheck()) return null;
      const turn = chess.turn();
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === "k" && piece.color === turn) {
            return piece.square;
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }, [fen]);

  // Build custom square styles (selected, possible moves, last move, check)
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // 1. Last move highlights (amber/yellow tint)
    if (lastMove) {
      styles[lastMove.from] = {
        backgroundColor: "rgba(245, 158, 11, 0.35)",
      };
      styles[lastMove.to] = {
        backgroundColor: "rgba(245, 158, 11, 0.45)",
      };
    }

    // 2. In check highlight (red radial glow on king)
    if (inCheckKingSquare) {
      styles[inCheckKingSquare] = {
        background:
          "radial-gradient(ellipse at center, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.35) 60%, transparent 80%)",
      };
    }

    // 3. Selected square highlight (gold border & glow)
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: "rgba(234, 179, 8, 0.45)",
        boxShadow: "inset 0 0 0 3px rgba(250, 204, 21, 0.95)",
      };
    }

    // 4. Possible destination moves (subtle indicator dots)
    for (const moveSquare of possibleMoves) {
      styles[moveSquare] = {
        background: styles[moveSquare]?.backgroundColor
          ? `${styles[moveSquare].backgroundColor}`
          : "radial-gradient(circle, rgba(16, 185, 129, 0.65) 24%, transparent 26%)",
        borderRadius: "50%",
        cursor: "pointer",
      };
    }

    return styles;
  }, [lastMove, inCheckKingSquare, selectedSquare, possibleMoves]);

  // Handle square click for click-to-move
  const handleSquareClick = useCallback(
    (square: string, pieceData: any) => {
      if (disabled || !isMyTurn) {
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // If user clicked one of the possible move destinations, execute move!
      if (selectedSquare && possibleMoves.includes(square)) {
        const success = onPieceDrop(selectedSquare, square);
        setSelectedSquare(null);
        setPossibleMoves([]);
        return;
      }

      // If user clicked a piece of their own color, select it
      try {
        const chess = new Chess(fen);
        const piece = chess.get(square as Square);
        if (piece && piece.color === myColor) {
          setSelectedSquare(square);
          const moves = getPossibleMoves(square);
          setPossibleMoves(moves);
          return;
        }
      } catch {
        // ignore
      }

      // Clicked empty or opponent piece without prior selection -> clear
      setSelectedSquare(null);
      setPossibleMoves([]);
    },
    [disabled, isMyTurn, selectedSquare, possibleMoves, onPieceDrop, fen, myColor, getPossibleMoves]
  );

  return (
    <div className="w-full max-w-[540px] mx-auto select-none rounded-2xl p-2 sm:p-3 bg-surface border border-border shadow-xl transition-colors">
      <div className="w-full aspect-square relative rounded-xl overflow-hidden">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: !disabled && isMyTurn,
            canDragPiece: ({ piece }) => {
              if (disabled || !isMyTurn) return false;
              if (!piece?.pieceType) return false;
              const pieceColor = piece.pieceType.startsWith("w") ? "w" : "b";
              return pieceColor === myColor;
            },
            onPieceDrop: ({ sourceSquare, targetSquare, piece }) => {
              if (!targetSquare || disabled) return false;
              setSelectedSquare(null);
              setPossibleMoves([]);
              return onPieceDrop(sourceSquare, targetSquare, piece?.pieceType);
            },
            onSquareClick: ({ square, piece }) => {
              handleSquareClick(square, piece);
            },
            boardStyle: {
              borderRadius: "10px",
              overflow: "hidden",
            },
            darkSquareStyle: { backgroundColor: "#779952" },
            lightSquareStyle: { backgroundColor: "#edeed1" },
            squareStyles: customSquareStyles,
            showNotation: true,
            animationDurationInMs: 200,
          }}
        />
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { Socket } from "socket.io-client";
import { Chess, Square } from "chess.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  ChessGameState,
  ChessColor,
  ChessMoveRecord,
  Player,
} from "@/types/socket";
import { useGameSocket } from "@/hooks/useGameSocket";
import type { Screen, CapturedPieces } from "./types";
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  playDefeatSound,
} from "./soundEffects";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CHESS_TOTAL_TIME = 15 * 60; // 900 seconds (15 minutes)

export function deriveCapturedPieces(fen: string): CapturedPieces {
  const initial = { p: 8, r: 2, n: 2, b: 2, q: 1 };
  const currentWhite: Record<string, number> = { p: 0, r: 0, n: 0, b: 0, q: 0 };
  const currentBlack: Record<string, number> = { p: 0, r: 0, n: 0, b: 0, q: 0 };

  const [placement] = fen.split(" ");
  for (const char of placement) {
    if (char >= "a" && char <= "z") {
      currentBlack[char] = (currentBlack[char] || 0) + 1;
    } else if (char >= "A" && char <= "Z") {
      const lower = char.toLowerCase();
      currentWhite[lower] = (currentWhite[lower] || 0) + 1;
    }
  }

  const capturedByWhite: string[] = [];
  for (const [piece, count] of Object.entries(initial)) {
    const missing = count - (currentBlack[piece] || 0);
    for (let i = 0; i < missing; i++) {
      capturedByWhite.push(piece);
    }
  }

  const capturedByBlack: string[] = [];
  for (const [piece, count] of Object.entries(initial)) {
    const missing = count - (currentWhite[piece] || 0);
    for (let i = 0; i < missing; i++) {
      capturedByBlack.push(piece.toUpperCase());
    }
  }

  return { capturedByWhite, capturedByBlack };
}

export function useChess(username: string) {
  const myColorRef = useRef<ChessColor | null>(null);
  const fenRef = useRef<string>(DEFAULT_FEN);
  const chessRef = useRef<Chess>(new Chess());
  const gameStateRef = useRef<ChessGameState | null>(null);

  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const [fen, setFen] = useState<string>(DEFAULT_FEN);
  const [myColor, setMyColor] = useState<ChessColor | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winner, setWinner] = useState<ChessColor | "draw" | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);

  // 15-minute game clocks for White and Black
  const [whiteTime, setWhiteTime] = useState<number>(CHESS_TOTAL_TIME);
  const [blackTime, setBlackTime] = useState<number>(CHESS_TOTAL_TIME);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerActive(false);
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      const gs = gameStateRef.current;
      if (!gs || gs.winner) return;

      if (gs.currentTurn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            stopTimer();
            if (roomIdRef.current && myColorRef.current === "w") {
              socketRef.current?.emit("chess_timeout", {
                roomId: roomIdRef.current,
                losingColor: "w",
              });
            }
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            stopTimer();
            if (roomIdRef.current && myColorRef.current === "b") {
              socketRef.current?.emit("chess_timeout", {
                roomId: roomIdRef.current,
                losingColor: "b",
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
  }, [stopTimer]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, [stopTimer]);

  const setupChessSocket = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off("chess_game_started");
      socket.off("chess_game_update");
      socket.off("chess_game_over");

      socket.on("chess_game_started", ({ room: r, gameState: gs, whitePlayerId }: { room: Room; gameState: ChessGameState; whitePlayerId: string; blackPlayerId: string }) => {
        setRoom(r);
        setPlayers(r.players);
        setGameState(gs);
        gameStateRef.current = gs;
        setFen(gs.fen);
        fenRef.current = gs.fen;
        chessRef.current = new Chess(gs.fen);

        setWhiteTime(gs.whiteTime ?? CHESS_TOTAL_TIME);
        setBlackTime(gs.blackTime ?? CHESS_TOTAL_TIME);

        const currentPId = playerIdRef.current;
        const isWhite =
          (currentPId && currentPId === whitePlayerId) ||
          (gs.whitePlayer && gs.whitePlayer.username === username) ||
          (r.players[0] && (r.players[0].id === currentPId || r.players[0].username === username));

        const assignedColor: ChessColor = isWhite ? "w" : "b";
        setMyColor(assignedColor);
        myColorRef.current = assignedColor;

        setWinner(null);
        setEndReason(null);
        setLastMove(null);
        setError(null);
        setScreen("playing");
        startTimer();
      });

      socket.on("chess_game_update", ({ gameState: gs, lastMove: lm }: { gameState: ChessGameState; lastMove?: ChessMoveRecord }) => {
        setGameState(gs);
        gameStateRef.current = gs;
        setFen(gs.fen);
        fenRef.current = gs.fen;
        chessRef.current = new Chess(gs.fen);

        setWhiteTime(gs.whiteTime ?? CHESS_TOTAL_TIME);
        setBlackTime(gs.blackTime ?? CHESS_TOTAL_TIME);

        if (lm) {
          setLastMove({ from: lm.from, to: lm.to });
          if (lm.captured) {
            playCaptureSound();
          } else {
            playMoveSound();
          }
        }

        if (gs.isCheck && !gs.isCheckmate) {
          playCheckSound();
        }

        if (gs.winner === null) {
          startTimer();
        } else {
          stopTimer();
        }
      });

      socket.on("chess_game_over", ({ winner: w, reason, gameState: gs }: { winner: ChessColor | "draw" | null; reason: string; gameState: ChessGameState }) => {
        stopTimer();
        setGameState(gs);
        gameStateRef.current = gs;
        setFen(gs.fen);
        fenRef.current = gs.fen;
        chessRef.current = new Chess(gs.fen);
        setWhiteTime(gs.whiteTime ?? 0);
        setBlackTime(gs.blackTime ?? 0);
        setWinner(w);
        setEndReason(reason);
        setScreen("finished");

        const myC = myColorRef.current;
        if (w === myC) {
          playVictorySound();
        } else if (w !== "draw") {
          playDefeatSound();
        }

        const whiteP = gs.whitePlayer?.username;
        const blackP = gs.blackPlayer?.username;
        const isMeWinner = w === myC || (w === "draw" && myC === "w");

        if (isMeWinner && whiteP && blackP) {
          const isDraw = w === "draw";
          const whiteWon = w === "w";
          const blackWon = w === "b";

          saveMatchResult({
            gameType: "chess",
            players: [
              {
                username: whiteP,
                result: isDraw ? "draw" : whiteWon ? "win" : "loss",
                score: whiteWon ? 1 : 0,
              },
              {
                username: blackP,
                result: isDraw ? "draw" : blackWon ? "win" : "loss",
                score: blackWon ? 1 : 0,
              },
            ],
            duration: 0,
            gameData: {
              movesCount: gs.moveHistory?.length || 0,
              endReason: reason,
              winner: w,
            },
          });
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [username, startTimer, stopTimer]
  );

  const gameSocket = useGameSocket({
    gameType: "chess",
    username: username || "",
    onSetupSocket: setupChessSocket,
  });

  const {
    socketRef,
    roomIdRef,
    playerIdRef,
    screen,
    setScreen,
    room,
    setRoom,
    players,
    setPlayers,
    roomId,
    playerId,
    joinError,
    setJoinError,
    statusMsg,
    setStatusMsg,
    createRoom,
    joinRoom,
    leaveRoom: baseLeaveRoom,
    requestRematch: baseRequestRematch,
    saveMatchResult,
  } = gameSocket;

  const leaveRoom = useCallback(() => {
    stopTimer();
    baseLeaveRoom();
    setGameState(null);
    gameStateRef.current = null;
    setFen(DEFAULT_FEN);
    fenRef.current = DEFAULT_FEN;
    chessRef.current = new Chess();
    setMyColor(null);
    myColorRef.current = null;
    setWinner(null);
    setEndReason(null);
    setLastMove(null);
    setError(null);
  }, [stopTimer, baseLeaveRoom]);

  const resign = useCallback(() => {
    if (!roomIdRef.current || screen !== "playing") return;
    socketRef.current?.emit("chess_resign", { roomId: roomIdRef.current });
  }, [screen, socketRef, roomIdRef]);

  const rematch = useCallback(() => {
    if (!roomIdRef.current) return;
    baseRequestRematch();
  }, [baseRequestRematch, roomIdRef]);

  const isMyTurn = useMemo(() => {
    if (!gameState || !myColor || screen !== "playing") return false;
    return gameState.currentTurn === myColor;
  }, [gameState, myColor, screen]);

  const orientation: "white" | "black" = useMemo(() => {
    return myColor === "b" ? "black" : "white";
  }, [myColor]);

  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, _piece?: string): boolean => {
      if (screen !== "playing") return false;
      if (!isMyTurn) return false;

      try {
        const currentChess = new Chess(fenRef.current);

        const pieceOnSource = currentChess.get(sourceSquare as Square);
        const isPromotion =
          pieceOnSource?.type === "p" &&
          ((pieceOnSource.color === "w" && targetSquare[1] === "8") ||
            (pieceOnSource.color === "b" && targetSquare[1] === "1"));

        const promotion = isPromotion ? "q" : undefined;

        const moveResult = currentChess.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion,
        });

        if (!moveResult) {
          return false;
        }

        const newFen = currentChess.fen();
        const nextTurn = currentChess.turn() as ChessColor;
        chessRef.current = currentChess;
        fenRef.current = newFen;
        setFen(newFen);
        setLastMove({ from: sourceSquare, to: targetSquare });
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                fen: newFen,
                currentTurn: nextTurn,
              }
            : null
        );

        socketRef.current?.emit("chess_move", {
          roomId: roomIdRef.current,
          from: sourceSquare,
          to: targetSquare,
          promotion,
        });

        return true;
      } catch {
        return false;
      }
    },
    [screen, isMyTurn, socketRef, roomIdRef]
  );

  const getPossibleMoves = useCallback((square: string): string[] => {
    try {
      const chess = new Chess(fenRef.current);
      const moves = chess.moves({
        square: square as Square,
        verbose: true,
      });
      return moves.map((m) => m.to);
    } catch {
      return [];
    }
  }, []);

  const capturedPieces = useMemo(() => {
    return deriveCapturedPieces(fen);
  }, [fen]);

  const opponentInfo: Player | undefined = useMemo(() => {
    if (!room || !playerId) return undefined;
    return room.players.find((p) => p.id !== playerId);
  }, [room, playerId]);

  const myInfo: Player | undefined = useMemo(() => {
    if (!room || !playerId) return undefined;
    return room.players.find((p) => p.id === playerId);
  }, [room, playerId]);

  const isWhite = myColor === "w";
  const myTime = isWhite ? whiteTime : blackTime;
  const opponentTime = isWhite ? blackTime : whiteTime;
  const timeLeft = isMyTurn ? myTime : opponentTime;

  return {
    screen: screen as Screen,
    room,
    roomId: roomId || roomIdRef.current,
    playerId,
    players,
    myColor,
    myInfo,
    opponentInfo,
    orientation,
    isMyTurn,
    fen,
    gameState,
    lastMove,
    capturedPieces,
    winner,
    endReason,
    error,
    joinError,
    statusMsg,
    whiteTime,
    blackTime,
    myTime,
    opponentTime,
    timeLeft,
    timerActive,
    createRoom,
    joinRoom,
    leaveRoom,
    onPieceDrop,
    getPossibleMoves,
    resign,
    rematch,
  };
}

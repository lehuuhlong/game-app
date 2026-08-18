"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { io, Socket } from "socket.io-client";
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
import type { Screen, CapturedPieces } from "./types";
import {
  playMoveSound,
  playCaptureSound,
  playCheckSound,
  playVictorySound,
  playDefeatSound,
} from "./soundEffects";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

const DEFAULT_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CHESS_TOTAL_TIME = 15 * 60; // 900 seconds (15 minutes)

/**
 * Helper to derive captured pieces from the current FEN string.
 */
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
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomIdRef = useRef<string>("");
  const playerIdRef = useRef<string | null>(null);
  const myColorRef = useRef<ChessColor | null>(null);
  const fenRef = useRef<string>(DEFAULT_FEN);
  const chessRef = useRef<Chess>(new Chess());

  const [screen, setScreen] = useState<Screen>("lobby");
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<ChessGameState | null>(null);
  const gameStateRef = useRef<ChessGameState | null>(null);
  const [fen, setFen] = useState<string>(DEFAULT_FEN);
  const [myColor, setMyColor] = useState<ChessColor | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [winner, setWinner] = useState<ChessColor | "draw" | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);

  // 15-minute game clocks for White and Black
  const [whiteTime, setWhiteTime] = useState<number>(CHESS_TOTAL_TIME);
  const [blackTime, setBlackTime] = useState<number>(CHESS_TOTAL_TIME);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Score tracking lock to prevent duplicate recordings
  const scoreSavedRef = useRef<boolean>(false);

  const saveChessScore = useCallback((won: boolean) => {
    if (scoreSavedRef.current) return;
    scoreSavedRef.current = true;
    try {
      const stored = localStorage.getItem("game-portal-user");
      if (!stored) return;
      const u = JSON.parse(stored);
      if (!u?.id) return;
      fetch(`/api/users/${u.id}/score`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: "chess", won }),
        keepalive: true,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.chessWins !== undefined) {
            u.chessWins = d.chessWins;
            u.chessTotal = d.chessTotal;
            localStorage.setItem("game-portal-user", JSON.stringify(u));
          }
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }, []);

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

  const getSocket = useCallback((): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });
    }
    return socketRef.current;
  }, []);

  // Cleanup timers & record loss on abrupt page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (screen === "playing" && !gameStateRef.current?.winner) {
        saveChessScore(false);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      stopTimer();
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [screen, saveChessScore, stopTimer]);

  const setupSocket = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off("room_joined");
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("chess_game_started");
      socket.off("chess_game_update");
      socket.off("chess_game_over");
      socket.off("error");

      socket.on("room_joined", ({ room: r, playerId: pId }) => {
        setRoom(r);
        setPlayerId(pId);
        playerIdRef.current = pId;
        setJoinError(null);

        if (r.players.length === 1) {
          setScreen("waiting");
          setStatusMsg("Waiting for an opponent to join...");
        }
      });

      socket.on("player_joined" as any, ({ room: r }: { room: Room }) => {
        setRoom(r);
      });

      socket.on("player_left" as any, ({ room: r }: { room: Room }) => {
        setRoom(r);
        if (r.status === "waiting") {
          setStatusMsg("Opponent left. Waiting for another player...");
        }
      });

      socket.on("chess_game_started", ({ room: r, gameState: gs, whitePlayerId, blackPlayerId }) => {
        scoreSavedRef.current = false;
        setRoom(r);
        setGameState(gs);
        gameStateRef.current = gs;
        setFen(gs.fen);
        fenRef.current = gs.fen;
        chessRef.current = new Chess(gs.fen);

        setWhiteTime(gs.whiteTime ?? CHESS_TOTAL_TIME);
        setBlackTime(gs.blackTime ?? CHESS_TOTAL_TIME);

        const currentPId = playerIdRef.current;
        const assignedColor: ChessColor = currentPId === whitePlayerId ? "w" : "b";
        setMyColor(assignedColor);
        myColorRef.current = assignedColor;

        setWinner(null);
        setEndReason(null);
        setLastMove(null);
        setError(null);
        setScreen("playing");
        startTimer();
      });

      socket.on("chess_game_update", ({ gameState: gs, lastMove: lm }) => {
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

        // Restart timer for next turn
        if (gs.winner === null) {
          startTimer();
        } else {
          stopTimer();
        }
      });

      socket.on("chess_game_over", ({ winner: w, reason, gameState: gs }) => {
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
          saveChessScore(true);
        } else if (w === "draw") {
          saveChessScore(false);
        } else {
          playDefeatSound();
          saveChessScore(false);
        }
      });

      socket.on("error", ({ message }) => {
        setError(message);
        if (screen === "lobby") {
          setJoinError(message);
        }
        // Rollback local chess instance to match verified gameState if move rejected
        if (gameState) {
          setFen(gameState.fen);
          fenRef.current = gameState.fen;
          chessRef.current = new Chess(gameState.fen);
        }
      });
    },
    [screen, gameState, saveChessScore, startTimer, stopTimer]
  );

  const createRoom = useCallback(() => {
    setError(null);
    setJoinError(null);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    roomIdRef.current = code;

    const socket = getSocket();
    setupSocket(socket);

    socket.emit("join_room", {
      roomId: code,
      gameType: "chess",
      username: username || "Guest",
      action: "create",
    });
  }, [username, getSocket, setupSocket]);

  const joinRoom = useCallback(
    (code: string) => {
      setError(null);
      setJoinError(null);
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        setJoinError("Please enter a room code.");
        return;
      }

      roomIdRef.current = cleanCode;
      const socket = getSocket();
      setupSocket(socket);

      socket.emit("join_room", {
        roomId: cleanCode,
        gameType: "chess",
        username: username || "Guest",
        action: "join",
      });
    },
    [username, getSocket, setupSocket]
  );

  const leaveRoom = useCallback(() => {
    if (screen === "playing" && !gameStateRef.current?.winner) {
      saveChessScore(false);
    }
    stopTimer();
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit("leave_room", { roomId: roomIdRef.current });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setScreen("lobby");
    setRoom(null);
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
    setJoinError(null);
  }, [screen, saveChessScore, stopTimer]);

  const resign = useCallback(() => {
    if (!roomIdRef.current || screen !== "playing") return;
    const socket = getSocket();
    socket.emit("chess_resign", { roomId: roomIdRef.current });
  }, [screen, getSocket]);

  const rematch = useCallback(() => {
    if (!roomIdRef.current) return;
    const socket = getSocket();
    socket.emit("restart_game", { roomId: roomIdRef.current });
  }, [getSocket]);

  const isMyTurn = useMemo(() => {
    if (!gameState || !myColor || screen !== "playing") return false;
    return gameState.currentTurn === myColor;
  }, [gameState, myColor, screen]);

  const orientation: "white" | "black" = useMemo(() => {
    return myColor === "b" ? "black" : "white";
  }, [myColor]);

  /**
   * Handle piece drop from react-chessboard.
   * Performs client-side validation first, updates local state optimistically,
   * then emits to server.
   */
  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, _piece?: string): boolean => {
      if (screen !== "playing") return false;
      if (!isMyTurn) return false;

      try {
        const currentChess = new Chess(fenRef.current);

        // Check if move is a pawn promotion
        const pieceOnSource = currentChess.get(sourceSquare as Square);
        const isPromotion =
          pieceOnSource?.type === "p" &&
          ((pieceOnSource.color === "w" && targetSquare[1] === "8") ||
            (pieceOnSource.color === "b" && targetSquare[1] === "1"));

        const promotion = isPromotion ? "q" : undefined;

        // Test if the move is legal locally
        const moveResult = currentChess.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion,
        });

        if (!moveResult) {
          return false;
        }

        // Apply optimistic local update
        const newFen = currentChess.fen();
        chessRef.current = currentChess;
        fenRef.current = newFen;
        setFen(newFen);
        setLastMove({ from: sourceSquare, to: targetSquare });

        // Emit to server
        const socket = getSocket();
        socket.emit("chess_move", {
          roomId: roomIdRef.current,
          from: sourceSquare,
          to: targetSquare,
          promotion,
        });
        socket.emit("make_move", {
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
    [screen, isMyTurn, getSocket]
  );

  /**
   * Get all legal target squares for a selected piece (for visual move indicators).
   */
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
    screen,
    room,
    roomId: roomIdRef.current,
    playerId,
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

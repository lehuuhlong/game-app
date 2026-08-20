"use client";

import { useState, useRef, useCallback } from "react";
import type { Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  CaroMove,
  CaroGameState,
} from "@/types/socket";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useGameTimer } from "@/hooks/useGameTimer";
import type { Player } from "./types";

export const CARO_GRID_SIZE = 25;
export const CARO_TURN_SECONDS = 30;

export function makeEmptyCaroBoard(): ("X" | "O" | null)[][] {
  return Array.from({ length: CARO_GRID_SIZE }, () =>
    Array(CARO_GRID_SIZE).fill(null)
  );
}

export function checkWin(
  board: ("X" | "O" | null)[][],
  row: number,
  col: number,
  player: "X" | "O"
): { row: number; col: number }[] | null {
  const directions = [
    [0, 1], // horizontal
    [1, 0], // vertical
    [1, 1], // diagonal down-right
    [1, -1], // diagonal up-right
  ];

  for (const [dr, dc] of directions) {
    const winningCells = [{ row, col }];

    // Check forward
    for (let step = 1; step < 5; step++) {
      const r = row + dr * step;
      const c = col + dc * step;
      if (
        r >= 0 &&
        r < CARO_GRID_SIZE &&
        c >= 0 &&
        c < CARO_GRID_SIZE &&
        board[r][c] === player
      ) {
        winningCells.push({ row: r, col: c });
      } else {
        break;
      }
    }

    // Check backward
    for (let step = 1; step < 5; step++) {
      const r = row - dr * step;
      const c = col - dc * step;
      if (
        r >= 0 &&
        r < CARO_GRID_SIZE &&
        c >= 0 &&
        c < CARO_GRID_SIZE &&
        board[r][c] === player
      ) {
        winningCells.push({ row: r, col: c });
      } else {
        break;
      }
    }

    if (winningCells.length >= 5) {
      return winningCells;
    }
  }

  return null;
}

export interface UseCaroOnlineOptions {
  username?: string;
}

export function useCaroOnline({ username }: UseCaroOnlineOptions) {
  const mySymbolRef = useRef<Player | null>(null);
  const currentTurnRef = useRef<Player>("X");
  const gameStartedRef = useRef<boolean>(false);
  const boardRef = useRef<("X" | "O" | null)[][]>(makeEmptyCaroBoard());
  const moveCountRef = useRef<number>(0);

  const [board, setBoard] = useState<("X" | "O" | null)[][]>(makeEmptyCaroBoard());
  const [currentTurn, setCurrentTurn] = useState<Player>("X");
  const [mySymbol, setMySymbol] = useState<Player | null>(null);
  const [winningCells, setWinningCells] = useState<{ row: number; col: number }[]>([]);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [moveCount, setMoveCount] = useState<number>(0);
  const [winnerMsg, setWinnerMsg] = useState<string>("");
  const [didIWin, setDidIWin] = useState<boolean>(false);
  const [isDraw, setIsDraw] = useState<boolean>(false);

  const handleTimeout = useCallback(() => {
    if (!gameStartedRef.current || !roomIdRef.current) return;
    if (currentTurnRef.current === mySymbolRef.current && mySymbolRef.current) {
      socketRef.current?.emit("timeout_turn", {
        roomId: roomIdRef.current,
        losingPlayer: mySymbolRef.current,
      });
    }
  }, []);

  const {
    timeLeft,
    percent: timerPercent,
    colorClass: timerColor,
    isActive: timerActive,
    startTimer,
    stopTimer,
  } = useGameTimer({
    duration: CARO_TURN_SECONDS,
    onTimeout: handleTimeout,
  });

  const handleGameOver = useCallback(
    (winnerSymbol: string | null, reason: "win" | "timeout" | "disconnect") => {
      stopTimer();
      setScreen("finished");

      const me = mySymbolRef.current;
      const draw = !winnerSymbol;
      const won = !draw && winnerSymbol === me;

      setIsDraw(draw);
      setDidIWin(won);

      if (draw) {
        setWinnerMsg("🤝 Match ended in a Draw!");
      } else if (won) {
        if (reason === "timeout") {
          setWinnerMsg("🏆 You Win! Opponent ran out of time.");
        } else if (reason === "disconnect") {
          setWinnerMsg("🏆 You Win! Opponent disconnected.");
        } else {
          setWinnerMsg("🏆 Victory! 5 in a row.");
        }
      } else {
        if (reason === "timeout") {
          setWinnerMsg("⌛ Defeat — Your turn timer expired.");
        } else if (reason === "disconnect") {
          setWinnerMsg("🚪 Defeat — You disconnected.");
        } else {
          setWinnerMsg("💔 Defeat — Opponent got 5 in a row.");
        }
      }

      // Save match to database if I'm the winner or player 1
      const currentPlayers = gameSocket.players;
      if (currentPlayers.length >= 2) {
        const [p1, p2] = currentPlayers;
        const p1Won = winnerSymbol === "X";
        const p2Won = winnerSymbol === "O";
        const isP1 = me === "X";
        const shouldSubmit = won || (draw && isP1);

        if (shouldSubmit) {
          saveMatchResult({
            gameType: "caro",
            players: [
              {
                username: p1.username,
                result: draw ? "draw" : p1Won ? "win" : "loss",
                score: p1Won ? 1 : 0,
              },
              {
                username: p2.username,
                result: draw ? "draw" : p2Won ? "win" : "loss",
                score: p2Won ? 1 : 0,
              },
            ],
            duration: 0,
            gameData: {
              moves: moveCountRef.current,
              winner: draw ? "draw" : winnerSymbol,
              reason,
            },
          });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopTimer]
  );

  const setupCaroSocket = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off("game_started");
      socket.off("move_made");
      socket.off("game_over");

      socket.on("game_started", ({ room: r }: { room: Room; gameState: CaroGameState }) => {
        gameSocket.setRoom(r);
        gameSocket.setPlayers(r.players);
        const currentPId = playerIdRef.current;
        const currentUsername = username || "";
        const idx = r.players.findIndex(
          (p) => (currentPId && p.id === currentPId) || (currentUsername && p.username === currentUsername)
        );
        const assignedSymbol: Player = idx === 0 ? "X" : "O";
        mySymbolRef.current = assignedSymbol;
        setMySymbol(assignedSymbol);

        const fresh = makeEmptyCaroBoard();
        boardRef.current = fresh;
        currentTurnRef.current = "X";
        gameStartedRef.current = false;
        setBoard(fresh);
        setCurrentTurn("X");
        setWinningCells([]);
        setLastMove(null);
        setMoveCount(0);
        moveCountRef.current = 0;
        setWinnerMsg("");
        setDidIWin(false);
        setIsDraw(false);
        setScreen("playing");
      });

      socket.on("move_made", ({ move }: { move: CaroMove; gameState: CaroGameState }) => {
        const newBoard = boardRef.current.map((r) => [...r]);
        newBoard[move.x][move.y] = move.player;
        boardRef.current = newBoard;

        const newTurn: Player = move.player === "X" ? "O" : "X";
        currentTurnRef.current = newTurn;

        setBoard(newBoard);
        setCurrentTurn(newTurn);
        setLastMove({ row: move.x, col: move.y });
        setMoveCount((c) => {
          const next = c + 1;
          moveCountRef.current = next;
          return next;
        });

        const winning = checkWin(newBoard, move.x, move.y, move.player as Player);
        if (winning) {
          setWinningCells(winning);
          handleGameOver(move.player, "win");
          return;
        }

        gameStartedRef.current = true;
        startTimer();
      });

      socket.on("game_over", ({ winner, reason }: { winner: string | null; reason?: string }) => {
        handleGameOver(winner, (reason as "win" | "timeout" | "disconnect") || "timeout");
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleGameOver, startTimer]
  );

  const gameSocket = useGameSocket({
    gameType: "caro",
    username: username || "",
    onSetupSocket: setupCaroSocket,
  });

  const {
    socketRef,
    roomIdRef,
    playerIdRef,
    screen,
    setScreen,
    room,
    roomId,
    playerId,
    players,
    joinError,
    setJoinError,
    statusMsg,
    copied,
    createRoom,
    joinRoom,
    leaveRoom: baseLeaveRoom,
    requestRematch: baseRequestRematch,
    copyRoomCode,
    saveMatchResult,
  } = gameSocket;

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (screen !== "playing") return;
      if (currentTurnRef.current !== mySymbolRef.current) return;
      if (boardRef.current[row][col] !== null) return;
      if (!mySymbolRef.current) return;

      socketRef.current?.emit("make_move", {
        roomId: roomIdRef.current,
        x: row,
        y: col,
        player: mySymbolRef.current,
      });
    },
    [screen, socketRef, roomIdRef]
  );

  const handleLeaveRoom = useCallback(() => {
    stopTimer();
    baseLeaveRoom();
    mySymbolRef.current = null;
    setMySymbol(null);
    boardRef.current = makeEmptyCaroBoard();
    currentTurnRef.current = "X";
    gameStartedRef.current = false;
    setBoard(makeEmptyCaroBoard());
    setCurrentTurn("X");
    setWinningCells([]);
    setLastMove(null);
    setMoveCount(0);
    moveCountRef.current = 0;
    setWinnerMsg("");
  }, [stopTimer, baseLeaveRoom]);

  const handleRematch = useCallback(() => {
    stopTimer();
    baseRequestRematch();
    boardRef.current = makeEmptyCaroBoard();
    currentTurnRef.current = "X";
    gameStartedRef.current = false;
    setBoard(makeEmptyCaroBoard());
    setCurrentTurn("X");
    setWinningCells([]);
    setLastMove(null);
    setMoveCount(0);
    moveCountRef.current = 0;
    setWinnerMsg("");
    setDidIWin(false);
    setIsDraw(false);
  }, [stopTimer, baseRequestRematch]);

  return {
    screen,
    roomId,
    players,
    joinError,
    setJoinError,
    statusMsg,
    copied,
    copyRoomCode,
    board,
    currentTurn,
    mySymbol,
    isMyTurn: currentTurn === mySymbol && screen === "playing",
    winningCells,
    lastMove,
    moveCount,
    handleCellClick,
    timeLeft,
    timerPercent,
    timerColor,
    timerActive,
    winnerMsg,
    didIWin,
    isDraw,
    handleCreateRoom: createRoom,
    handleJoinRoom: joinRoom,
    handleLeaveRoom,
    handleRematch,
  };
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { io, type Socket } from "socket.io-client";
import { CaroBoard } from "./CaroBoard";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/components/auth";
import { checkWin } from "./winDetection";
import type { CellValue, Player } from "./types";

const GRID_SIZE = 15;
const TURN_SECONDS = 15;
type Screen = "lobby" | "waiting" | "playing" | "finished";

function makeEmptyBoard(): CellValue[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
}

export function GameCaro() {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [screen, setScreen] = useState<Screen>("lobby");
  const [joinInput, setJoinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [statusMsg, setStatusMsg] = useState("Waiting for opponent...");

  // Room info
  const roomIdRef = useRef("");
  const myPlayerIdRef = useRef("");
  const mySymbolRef = useRef<Player | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Game state (kept in refs to avoid stale closure issues + also in state for rendering)
  const boardRef = useRef<CellValue[][]>(makeEmptyBoard());
  const currentTurnRef = useRef<Player>("X");
  const gameStartedRef = useRef(false); // true after first move

  const [board, setBoard] = useState<CellValue[][]>(makeEmptyBoard());
  const [currentTurn, setCurrentTurn] = useState<Player>("X");
  const [winningCells, setWinningCells] = useState<{ row: number; col: number }[]>([]);
  const [lastMove, setLastMove] = useState<{ row: number; col: number } | null>(null);
  const [players, setPlayers] = useState<{ id: string; username: string }[]>([]);
  const [roomId, setRoomId] = useState("");
  const [moveCount, setMoveCount] = useState(0);
  const [winnerMsg, setWinnerMsg] = useState("");

  // Timer
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
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
    setTimeLeft(TURN_SECONDS);
    setTimerActive(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Time's up — the player whose turn it is loses
          stopTimer();
          const loser = currentTurnRef.current;
          socketRef.current?.emit("timeout_turn", {
            roomId: roomIdRef.current,
            losingPlayer: loser,
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const getSocket = useCallback((): Socket => {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(window.location.origin, {
        transports: ["websocket", "polling"],
      });
    }
    return socketRef.current;
  }, []);

  const handleGameOver = useCallback((winnerSymbol: string | null, isTimeout = false) => {
    stopTimer();
    setScreen("finished");

    if (!winnerSymbol || winnerSymbol === "draw") {
      setWinnerMsg("🤝 It's a draw!");
      return;
    }

    const winnerIdx = winnerSymbol === "X" ? 0 : 1;
    const winnerName = players[winnerIdx]?.username ?? winnerSymbol;
    const isMe = winnerSymbol === mySymbolRef.current;
    const suffix = isTimeout ? " (timeout)" : "";
    setWinnerMsg(isMe ? `🏆 You win${suffix}!` : `😔 ${winnerName} wins${suffix}`);
  }, [players, stopTimer]);

  const setupSocket = useCallback((socket: Socket) => {
    socket.off("room_joined").off("player_joined").off("player_left")
      .off("game_started").off("move_made").off("game_over").off("error");

    socket.on("room_joined", ({ room, playerId }: any) => {
      myPlayerIdRef.current = playerId;
      setPlayers(room.players);
      setStatusMsg(room.players.length < 2 ? "Waiting for opponent..." : "2/2 players connected");
      setScreen("waiting");
    });

    socket.on("player_joined", ({ room }: any) => {
      setPlayers(room.players);
      setStatusMsg("2/2 players connected");
    });

    socket.on("player_left", ({ room }: any) => {
      setPlayers(room.players);
      if (screen === "playing") {
        stopTimer();
        setScreen("finished");
        setWinnerMsg("🏃 Opponent left — you win!");
      } else {
        setStatusMsg("Opponent left.");
      }
    });

    socket.on("game_started", ({ room }: any) => {
      // Determine my symbol: first player in room = X, second = O
      const idx = room.players.findIndex((p: any) => p.id === myPlayerIdRef.current);
      mySymbolRef.current = idx === 0 ? "X" : "O";
      setPlayers(room.players);

      // Reset board
      const fresh = makeEmptyBoard();
      boardRef.current = fresh;
      currentTurnRef.current = "X";
      gameStartedRef.current = false;
      setBoard(fresh);
      setCurrentTurn("X");
      setWinningCells([]);
      setLastMove(null);
      setMoveCount(0);
      setWinnerMsg("");
      setScreen("playing");
      // Timer starts after first move — don't start yet
    });

    socket.on("move_made", ({ move, gameState }: any) => {
      // Apply the move locally
      const newBoard = boardRef.current.map(r => [...r]);
      newBoard[move.x][move.y] = move.player;
      boardRef.current = newBoard;

      const newTurn: Player = move.player === "X" ? "O" : "X";
      currentTurnRef.current = newTurn;

      setBoard(newBoard);
      setCurrentTurn(newTurn);
      setLastMove({ row: move.x, col: move.y });
      setMoveCount((c) => c + 1);

      // Check win
      const winning = checkWin(newBoard, move.x, move.y, move.player as Player);
      if (winning) {
        stopTimer();
        setWinningCells(winning);
        const isMe = move.player === mySymbolRef.current;
        setWinnerMsg(isMe ? "🏆 You win!" : `😔 You lose!`);
        setScreen("finished");
        return;
      }

      // Start/restart timer after each move (game starts after first move)
      gameStartedRef.current = true;
      startTimer();
    });

    socket.on("game_over", ({ winner }: any) => {
      handleGameOver(winner, true);
    });

    socket.on("error", ({ message }: any) => {
      setJoinError(message);
    });
  }, [players, stopTimer, startTimer, handleGameOver]);

  useEffect(() => {
    return () => {
      stopTimer();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [stopTimer]);

  const joinRoom = useCallback((id: string) => {
    if (!user) { setShowLogin(true); return; }
    const socket = getSocket();
    roomIdRef.current = id;
    setRoomId(id);
    setupSocket(socket);
    socket.emit("join_room", { roomId: id, gameType: "caro", username: user.username });
  }, [user, getSocket, setupSocket]);

  const handleCreateRoom = () => {
    const newId = Math.random().toString(36).slice(2, 8).toUpperCase();
    joinRoom(newId);
  };

  const handleJoinRoom = () => {
    const id = joinInput.trim().toUpperCase();
    if (!id) { setJoinError("Please enter a room code."); return; }
    setJoinError("");
    joinRoom(id);
  };

  const handleCellClick = (row: number, col: number) => {
    if (screen !== "playing") return;
    if (currentTurnRef.current !== mySymbolRef.current) return;
    if (boardRef.current[row][col] !== null) return;

    socketRef.current?.emit("make_move", {
      roomId: roomIdRef.current,
      x: row,
      y: col,
      player: mySymbolRef.current,
    });
  };

  const handleLeaveRoom = () => {
    stopTimer();
    socketRef.current?.emit("leave_room", { roomId: roomIdRef.current });
    socketRef.current?.disconnect();
    socketRef.current = null;
    roomIdRef.current = "";
    myPlayerIdRef.current = "";
    mySymbolRef.current = null;
    boardRef.current = makeEmptyBoard();
    currentTurnRef.current = "X";
    gameStartedRef.current = false;
    setScreen("lobby");
    setBoard(makeEmptyBoard());
    setCurrentTurn("X");
    setWinningCells([]);
    setLastMove(null);
    setMoveCount(0);
    setPlayers([]);
    setRoomId("");
    setWinnerMsg("");
    setJoinInput("");
    setJoinError("");
  };

  const handleRematch = () => {
    stopTimer();
    socketRef.current?.emit("restart_game", { roomId: roomIdRef.current });
    boardRef.current = makeEmptyBoard();
    currentTurnRef.current = "X";
    gameStartedRef.current = false;
    setBoard(makeEmptyBoard());
    setCurrentTurn("X");
    setWinningCells([]);
    setLastMove(null);
    setMoveCount(0);
    setWinnerMsg("");
    setScreen("playing");
  };

  const isMyTurn = currentTurn === mySymbolRef.current;
  const timerPercent = (timeLeft / TURN_SECONDS) * 100;
  const timerColor = timeLeft <= 5 ? "bg-red-500" : timeLeft <= 10 ? "bg-amber-500" : "bg-green-500";

  return (
    <>
      {showLogin && (
        <LoginModal
          title="Enter your username"
          subtitle="You need a username to play online Caro"
          onSuccess={() => setShowLogin(false)}
        />
      )}

      <div className="flex flex-col items-center gap-6 mx-auto max-w-5xl">
        {/* Header */}
        <div className="w-full text-center sm:text-left">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Caro <span className="text-gradient">(Gomoku)</span>
          </h1>
          <p className="text-sm text-foreground-secondary mt-0.5">
            5 in a row to win — online multiplayer • {TURN_SECONDS}s per turn
          </p>
        </div>

        {/* ── LOBBY ─────────────────────────────────────────────── */}
        {screen === "lobby" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto space-y-4"
          >
            <div className="rounded-2xl border border-border bg-surface p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Create a Room</h2>
              <p className="text-sm text-foreground-secondary">Start a new game and share the room code with your friend.</p>
              <button onClick={handleCreateRoom} className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-bold text-white hover:from-indigo-600 hover:to-purple-700 hover:-translate-y-0.5 transition-all shadow-lg">
                Create Room
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 space-y-3">
              <h2 className="text-lg font-bold text-foreground">Join a Room</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  placeholder="Room code..."
                  maxLength={6}
                  className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent focus:outline-none uppercase font-mono tracking-widest"
                />
                <button onClick={handleJoinRoom} className="rounded-xl bg-surface-hover border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent hover:text-white hover:border-accent transition-all">
                  Join
                </button>
              </div>
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
            </div>
          </motion.div>
        )}

        {/* ── WAITING ─────────────────────────────────────────────── */}
        {screen === "waiting" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md mx-auto text-center">
            <div className="rounded-2xl border border-border bg-surface p-8 space-y-5">
              <div className="h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin mx-auto" />
              <h2 className="text-xl font-bold text-foreground">{statusMsg}</h2>

              <div className="rounded-xl bg-background border border-border p-5">
                <p className="text-xs text-foreground-muted mb-1">Room Code</p>
                <p className="text-4xl font-extrabold text-accent font-mono tracking-widest">{roomId}</p>
                <p className="text-xs text-foreground-muted mt-1">Share with your friend</p>
              </div>

              <div className="space-y-1 text-sm text-foreground-secondary">
                {players.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>{p.username}</span>
                    <span className={`text-xs font-bold ${i === 0 ? "text-red-400" : "text-blue-400"}`}>({i === 0 ? "X" : "O"})</span>
                  </div>
                ))}
              </div>

              <button onClick={handleLeaveRoom} className="text-sm text-foreground-muted hover:text-red-500 transition-colors underline">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* ── PLAYING / FINISHED ─────────────────────────────────── */}
        {(screen === "playing" || screen === "finished") && (
          <div className="w-full flex flex-col lg:flex-row items-start gap-6">
            {/* Board */}
            <div className="flex-1 flex justify-center relative">
              <CaroBoard
                board={board}
                gridSize={GRID_SIZE}
                winningCells={winningCells}
                lastMove={lastMove ? { row: lastMove.row, col: lastMove.col, player: currentTurn === "X" ? "O" : "X", moveNumber: moveCount } : null}
                onCellClick={handleCellClick}
                disabled={!isMyTurn || screen === "finished"}
              />

              <AnimatePresence>
                {screen === "finished" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-background/75 backdrop-blur-sm rounded-xl"
                  >
                    <div className="text-center space-y-4 p-8">
                      <p className="text-3xl font-extrabold text-foreground">{winnerMsg}</p>
                      <div className="flex gap-3 justify-center">
                        <button onClick={handleRematch} className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2.5 text-sm font-bold text-white hover:from-indigo-600 hover:to-purple-700 transition-all">
                          Rematch
                        </button>
                        <button onClick={handleLeaveRoom} className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-foreground-secondary hover:bg-surface-hover transition-all">
                          Leave
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Side panel */}
            <div className="w-full lg:w-64 shrink-0 space-y-4">
              {/* Timer */}
              {timerActive && screen === "playing" && (
                <div className={`rounded-xl border p-4 text-center transition-all ${
                  isMyTurn ? "border-accent/50 bg-accent/5" : "border-border bg-surface"
                }`}>
                  <p className="text-xs text-foreground-muted uppercase tracking-wider mb-2">
                    {isMyTurn ? "Your turn" : "Opponent's turn"}
                  </p>
                  <p className={`text-4xl font-extrabold tabular-nums ${timeLeft <= 5 ? "text-red-500 animate-pulse" : "text-foreground"}`}>
                    {timeLeft}s
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full transition-colors ${timerColor}`}
                      style={{ width: `${timerPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Waiting for first move */}
              {!timerActive && screen === "playing" && (
                <div className="rounded-xl border border-border bg-surface p-4 text-center">
                  <p className="text-sm text-foreground-muted">
                    {isMyTurn ? "🎯 Make the first move!" : "⏳ Waiting for first move..."}
                  </p>
                </div>
              )}

              {/* Room + players */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">Room</span>
                  <span className="font-mono font-bold text-accent text-sm">{roomId}</span>
                </div>

                {players.map((p, i) => {
                  const symbol: Player = i === 0 ? "X" : "O";
                  const isMySymbol = symbol === mySymbolRef.current;
                  const isTurn = currentTurn === symbol && screen === "playing";
                  return (
                    <div key={p.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${isTurn ? "bg-accent/10 border border-accent/30" : "bg-background"}`}>
                      <span className={`text-lg font-extrabold ${symbol === "X" ? "text-red-400" : "text-blue-400"}`}>{symbol}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.username} {isMySymbol && <span className="text-xs text-foreground-muted font-normal">(you)</span>}
                        </p>
                        {isTurn && <p className="text-xs text-accent">Thinking...</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs text-foreground-muted uppercase tracking-wider mb-1">Moves</p>
                <p className="text-2xl font-extrabold text-foreground">{moveCount}</p>
              </div>

              <button onClick={handleLeaveRoom} className="w-full rounded-xl border border-border py-2 text-sm text-foreground-muted hover:border-red-400 hover:text-red-400 transition-all">
                Leave Room
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

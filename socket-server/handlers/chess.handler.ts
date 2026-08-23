/**
 * Chess game handler.
 *
 * Manages:
 *  - Chess.js integration for move validation
 *  - 15-minute per-player clocks with server-side deduction
 *  - Checkmate / stalemate / draw / threefold / insufficient detection
 *  - Resignation and timeout
 *  - Disconnect / reconnect / restart
 */

import { Chess } from "chess.js";
import type {
  Room,
  ChessGameState,
  ChessColor,
  ChessMove,
  ChessMoveRecord,
  Player,
} from "../../shared/types";
import { rooms, chessStates, type GameIO, type GameSocket } from "../stores";
import type { GameHandler } from "./types";

const DEFAULT_CHESS_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CHESS_TOTAL_TIME = 15 * 60; // 900 seconds (15 minutes per player)

// ── Helpers ────────────────────────────────────────────────────────

function createInitialChessState(p1: Player, p2: Player): ChessGameState {
  return {
    fen: DEFAULT_CHESS_FEN,
    currentTurn: "w",
    whitePlayer: { id: p1.id, username: p1.username, color: "w" },
    blackPlayer: { id: p2.id, username: p2.username, color: "b" },
    whiteTime: CHESS_TOTAL_TIME,
    blackTime: CHESS_TOTAL_TIME,
    lastMoveTimestamp: Date.now(),
    moveHistory: [],
    isCheck: false,
    isCheckmate: false,
    isDraw: false,
    isStalemate: false,
    isThreefoldRepetition: false,
    isInsufficientMaterial: false,
    winner: null,
    endReason: null,
  };
}

function handleChessMove(
  socket: GameSocket,
  io: GameIO,
  move: ChessMove
): void {
  const room = rooms.get(move.roomId);
  if (!room || room.status !== "playing" || room.gameType !== "chess") return;

  const gameState = chessStates.get(move.roomId);
  if (!gameState) return;

  let player = room.players.find((p) => p.socketId === socket.id);
  if (!player && socket.data.username) {
    player = room.players.find((p) => p.username === socket.data.username);
    if (player) {
      player.socketId = socket.id;
    }
  }
  if (!player) return;

  // Verify it is this player's turn
  const expectedPlayer =
    gameState.currentTurn === "w"
      ? gameState.whitePlayer
      : gameState.blackPlayer;

  if (player.id !== expectedPlayer.id && player.username !== expectedPlayer.username) {
    socket.emit("error", { message: "Not your turn." });
    return;
  }

  // Deduct elapsed time from current turn player's clock
  const now = Date.now();
  const elapsed = Math.max(
    0,
    Math.floor((now - (gameState.lastMoveTimestamp || now)) / 1000)
  );

  if (gameState.currentTurn === "w") {
    gameState.whiteTime = Math.max(0, gameState.whiteTime - elapsed);
    if (gameState.whiteTime <= 0) {
      room.status = "finished";
      gameState.winner = "b";
      gameState.endReason = "timeout";
      io.to(move.roomId).emit("chess_game_update", { gameState: { ...gameState } });
      io.to(move.roomId).emit("chess_game_over", {
        winner: "b",
        reason: "timeout",
        gameState: { ...gameState },
      });
      return;
    }
  } else {
    gameState.blackTime = Math.max(0, gameState.blackTime - elapsed);
    if (gameState.blackTime <= 0) {
      room.status = "finished";
      gameState.winner = "w";
      gameState.endReason = "timeout";
      io.to(move.roomId).emit("chess_game_update", { gameState: { ...gameState } });
      io.to(move.roomId).emit("chess_game_over", {
        winner: "w",
        reason: "timeout",
        gameState: { ...gameState },
      });
      return;
    }
  }

  try {
    const chess = new Chess(gameState.fen);
    const result = chess.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q",
    });

    if (!result) {
      socket.emit("error", { message: "Invalid move." });
      return;
    }

    const newFen = chess.fen();
    const isCheck = chess.isCheck();
    const isCheckmate = chess.isCheckmate();
    const isStalemate = chess.isStalemate();
    const isThreefold = chess.isThreefoldRepetition();
    const isInsufficient = chess.isInsufficientMaterial();
    const isDraw = chess.isDraw();

    const moveRecord: ChessMoveRecord = {
      from: result.from,
      to: result.to,
      san: result.san,
      color: result.color as ChessColor,
      captured: result.captured,
      promotion: result.promotion,
      fen: newFen,
    };

    gameState.fen = newFen;
    gameState.currentTurn = chess.turn() as ChessColor;
    gameState.lastMoveTimestamp = now;
    gameState.moveHistory.push(moveRecord);
    gameState.isCheck = isCheck;
    gameState.isCheckmate = isCheckmate;
    gameState.isStalemate = isStalemate;
    gameState.isThreefoldRepetition = isThreefold;
    gameState.isInsufficientMaterial = isInsufficient;
    gameState.isDraw = isDraw;

    if (isCheckmate) {
      room.status = "finished";
      gameState.winner = result.color as ChessColor;
      gameState.endReason = "checkmate";
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
        lastMove: moveRecord,
      });
      io.to(move.roomId).emit("chess_game_over", {
        winner: gameState.winner,
        reason: "checkmate",
        gameState: { ...gameState },
      });
      console.log(`♟️ Checkmate in room ${move.roomId}! Winner: ${gameState.winner}`);
    } else if (isDraw) {
      room.status = "finished";
      gameState.winner = "draw";
      gameState.endReason = isStalemate
        ? "stalemate"
        : isThreefold
        ? "threefold"
        : isInsufficient
        ? "insufficient"
        : "draw";
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
        lastMove: moveRecord,
      });
      io.to(move.roomId).emit("chess_game_over", {
        winner: "draw",
        reason: gameState.endReason,
        gameState: { ...gameState },
      });
      console.log(`♟️ Draw in room ${move.roomId} (${gameState.endReason})`);
    } else {
      io.to(move.roomId).emit("chess_game_update", {
        gameState: { ...gameState },
        lastMove: moveRecord,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid move.";
    socket.emit("error", { message });
  }
}

// ── Handler ───────────────────────────────────────────────────────

export const chessHandler: GameHandler = {
  gameType: "chess",
  maxPlayers: 2,
  autoStart: true,

  startGame(room: Room, io: GameIO): void {
    const p1 = room.players[0];
    const p2 = room.players[1];
    const gameState = createInitialChessState(p1, p2);
    chessStates.set(room.id, gameState);
    io.to(room.id).emit("chess_game_started", {
      room,
      gameState,
      whitePlayerId: p1.id,
      blackPlayerId: p2.id,
    });
    console.log(`♟️ Chess game started in room ${room.id} between ${p1.username} (White) and ${p2.username} (Black)`);
  },

  registerEvents(socket: GameSocket, io: GameIO): void {
    socket.on("chess_move", (move) => {
      handleChessMove(socket, io, move);
    });

    // Also handle chess moves coming through the legacy make_move event
    socket.on("make_move", (move) => {
      if ("from" in move) {
        handleChessMove(socket, io, move as ChessMove);
      }
    });

    socket.on("chess_resign", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "chess") return;

      const gameState = chessStates.get(roomId);
      if (!gameState) return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const resigningColor: ChessColor =
        player.id === gameState.whitePlayer.id ? "w" : "b";
      const winnerColor: ChessColor = resigningColor === "w" ? "b" : "w";

      room.status = "finished";
      gameState.winner = winnerColor;
      gameState.endReason = "resignation";

      io.to(roomId).emit("chess_game_update", { gameState: { ...gameState } });
      io.to(roomId).emit("chess_game_over", {
        winner: winnerColor,
        reason: "resignation",
        gameState: { ...gameState },
      });
      console.log(`🏳️ Resignation in room ${roomId}: ${resigningColor} resigned, ${winnerColor} wins`);
    });

    socket.on("chess_timeout", ({ roomId, losingColor }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "chess") return;

      const gameState = chessStates.get(roomId);
      if (!gameState) return;

      const winnerColor: ChessColor = losingColor === "w" ? "b" : "w";
      room.status = "finished";
      gameState.winner = winnerColor;
      gameState.endReason = "timeout";

      io.to(roomId).emit("chess_game_update", { gameState: { ...gameState } });
      io.to(roomId).emit("chess_game_over", {
        winner: winnerColor,
        reason: "timeout",
        gameState: { ...gameState },
      });
      console.log(`⏱️ Chess timeout in room ${roomId}: ${losingColor} timed out, ${winnerColor} wins`);
    });
  },

  handleReconnect(socket: GameSocket, room: Room, _io: GameIO): void {
    const gs = chessStates.get(room.id);
    if (gs) {
      socket.emit("chess_game_started", {
        room,
        gameState: gs,
        whitePlayerId: gs.whitePlayer.id,
        blackPlayerId: gs.blackPlayer.id,
      });
    }
  },

  handleDisconnect(socket: GameSocket, room: Room, io: GameIO): void {
    const state = chessStates.get(room.id);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (state && leavingPlayer && stayingPlayer) {
      room.status = "finished";
      const winnerColor: ChessColor =
        stayingPlayer.id === state.whitePlayer.id ? "w" : "b";
      state.winner = winnerColor;
      state.endReason = "disconnect";

      io.to(room.id).emit("chess_game_update", { gameState: { ...state } });
      io.to(room.id).emit("chess_game_over", {
        winner: winnerColor,
        reason: "disconnect",
        gameState: { ...state },
      });
    }
  },

  handleRestart(room: Room, io: GameIO): void {
    const p1 = room.players[0];
    const p2 = room.players[1];
    const gameState = createInitialChessState(p1, p2);
    chessStates.set(room.id, gameState);
    io.to(room.id).emit("chess_game_started", {
      room,
      gameState,
      whitePlayerId: p1.id,
      blackPlayerId: p2.id,
    });
  },
};

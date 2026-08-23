/**
 * Caro (Gomoku) game handler.
 *
 * Manages:
 *  - Game state creation (25×25 board)
 *  - Move validation and broadcasting
 *  - Timeout handling
 *  - Reconnection / restart
 *  - Disconnect (opponent wins)
 */

import type { CaroGameState, CaroMove, Room } from "../../shared/types";
import { rooms, caroStates, type GameIO, type GameSocket } from "../stores";
import type { GameHandler } from "./types";

const CARO_GRID_SIZE = 25;

function createInitialCaroState(): CaroGameState {
  return {
    board: Array.from({ length: CARO_GRID_SIZE }, () =>
      Array(CARO_GRID_SIZE).fill(null)
    ),
    currentTurn: "X",
    winner: null,
    moveHistory: [],
  };
}

export const caroHandler: GameHandler = {
  gameType: "caro",
  maxPlayers: 2,
  autoStart: true,

  startGame(room: Room, io: GameIO): void {
    const gameState = createInitialCaroState();
    caroStates.set(room.id, gameState);
    io.to(room.id).emit("game_started", { room, gameState });
  },

  registerEvents(socket: GameSocket, io: GameIO): void {
    socket.on("make_move", (move) => {
      // Discriminate: if `from` exists, this is a chess move — ignore here
      if ("from" in move) return;

      const caroMove = move as CaroMove;
      const room = rooms.get(caroMove.roomId);
      if (!room || room.status !== "playing" || room.gameType !== "caro") return;

      const gameState = caroStates.get(caroMove.roomId);
      if (!gameState) return;

      if (caroMove.player !== gameState.currentTurn) {
        socket.emit("error", { message: "Not your turn" });
        return;
      }

      const { x, y } = caroMove;
      if (
        x < 0 || x >= CARO_GRID_SIZE ||
        y < 0 || y >= CARO_GRID_SIZE ||
        gameState.board[x][y] !== null
      ) {
        socket.emit("error", { message: "Invalid move" });
        return;
      }

      gameState.board[x][y] = caroMove.player;
      gameState.moveHistory.push(caroMove);
      gameState.currentTurn = caroMove.player === "X" ? "O" : "X";

      io.to(caroMove.roomId).emit("move_made", {
        move: caroMove,
        gameState: { ...gameState },
      });
    });

    socket.on("timeout_turn", ({ roomId, losingPlayer }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing" || room.gameType !== "caro") return;

      const gameState = caroStates.get(roomId);
      if (!gameState) return;

      room.status = "finished";
      const winner = losingPlayer === "X" ? "O" : "X";
      gameState.winner = winner;

      io.to(roomId).emit("game_over", {
        winner,
        reason: "timeout",
        gameState: { ...gameState },
      });
      console.log(`⏱ Timeout in room ${roomId}: ${losingPlayer} loses`);
    });
  },

  handleReconnect(socket: GameSocket, room: Room, _io: GameIO): void {
    const gs = caroStates.get(room.id);
    if (gs) {
      socket.emit("game_started", { room, gameState: gs });
    }
  },

  handleDisconnect(socket: GameSocket, room: Room, io: GameIO): void {
    const state = caroStates.get(room.id);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (leavingPlayer && stayingPlayer) {
      room.status = "finished";
      const winnerSymbol = room.players.indexOf(stayingPlayer) === 0 ? "X" : "O";
      if (state) {
        state.winner = winnerSymbol;
      }
      io.to(room.id).emit("game_over", {
        winner: winnerSymbol,
        reason: "disconnect",
        gameState: state ? { ...state } : undefined,
      });
    }
  },

  handleRestart(room: Room, io: GameIO): void {
    const gameState = createInitialCaroState();
    caroStates.set(room.id, gameState);
    io.to(room.id).emit("game_started", { room, gameState });
  },
};

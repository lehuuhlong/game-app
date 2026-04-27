/**
 * Socket.io event handler registration — enhanced for Step 5.
 *
 * Full Caro multiplayer support:
 * - Room management (create, join, leave, auto-cleanup)
 * - Server-side board validation
 * - Win detection (delegated to client, but server tracks turns)
 * - Game restart within rooms
 */

import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Room,
  CaroGameState,
} from "@/types/socket";

type GameIO = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// ── In-memory stores ──────────────────────────────────────────────
const rooms = new Map<string, Room>();
const gameStates = new Map<string, CaroGameState>();

const GRID_SIZE = 15;

function createInitialGameState(): CaroGameState {
  return {
    board: Array.from({ length: GRID_SIZE }, () =>
      Array(GRID_SIZE).fill(null)
    ),
    currentTurn: "X",
    winner: null,
    moveHistory: [],
  };
}

export function registerSocketHandlers(io: GameIO): void {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // ── Join Room ───────────────────────────────────────────────
    socket.on("join_room", ({ roomId, gameType, username }) => {
      socket.data.username = username;
      socket.data.currentRoom = roomId;

      let room = rooms.get(roomId);

      if (!room) {
        room = {
          id: roomId,
          gameType,
          players: [],
          status: "waiting",
          createdAt: new Date(),
        };
        rooms.set(roomId, room);
        console.log(`🏠 Room created: ${roomId} (${gameType})`);
      }

      // Prevent duplicate joins
      if (room.players.find((p) => p.socketId === socket.id)) return;

      // Max 2 players for Caro
      if (room.players.length >= 2) {
        socket.emit("error", { message: "Room is full" });
        return;
      }

      const player = {
        id: `player_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        username,
        socketId: socket.id,
      };

      room.players.push(player);
      socket.join(roomId);

      socket.emit("room_joined", { room, playerId: player.id });
      socket.to(roomId).emit("player_joined", { player, room });

      console.log(
        `👤 ${username} joined room ${roomId} (${room.players.length}/2)`
      );

      // Auto-start when 2 players for Caro
      if (room.gameType === "caro" && room.players.length === 2) {
        room.status = "playing";
        const gameState = createInitialGameState();
        gameStates.set(roomId, gameState);

        io.to(roomId).emit("game_started", { room, gameState });
        console.log(`🎮 Game started in room ${roomId}`);
      }
    });

    // ── Make Move (Caro) ────────────────────────────────────────
    socket.on("make_move", (move) => {
      const room = rooms.get(move.roomId);
      if (!room || room.status !== "playing") return;

      const gameState = gameStates.get(move.roomId);
      if (!gameState) return;

      // Validate turn
      if (move.player !== gameState.currentTurn) {
        socket.emit("error", { message: "Not your turn" });
        return;
      }

      // Validate cell
      const { x, y } = move;
      if (
        x < 0 || x >= GRID_SIZE ||
        y < 0 || y >= GRID_SIZE ||
        gameState.board[x][y] !== null
      ) {
        socket.emit("error", { message: "Invalid move" });
        return;
      }

      // Apply move
      gameState.board[x][y] = move.player;
      gameState.moveHistory.push(move);
      gameState.currentTurn = move.player === "X" ? "O" : "X";

      // Broadcast to all players in room
      io.to(move.roomId).emit("move_made", {
        move,
        gameState: { ...gameState },
      });
    });

    // ── Turn Timeout ─────────────────────────────────────────────
    socket.on("timeout_turn", ({ roomId, losingPlayer }) => {
      const room = rooms.get(roomId);
      if (!room || room.status !== "playing") return;

      const gameState = gameStates.get(roomId);
      if (!gameState) return;

      room.status = "finished";
      const winner = losingPlayer === "X" ? "O" : "X";
      gameState.winner = winner;

      io.to(roomId).emit("game_over", {
        winner,
        gameState: { ...gameState },
      });

      console.log(`⏱ Timeout in room ${roomId}: ${losingPlayer} loses`);
    });

    // ── Restart Game ────────────────────────────────────────────
    socket.on("restart_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      room.status = "playing";
      const gameState = createInitialGameState();
      gameStates.set(roomId, gameState);

      io.to(roomId).emit("game_started", { room, gameState });
      console.log(`🔄 Game restarted in room ${roomId}`);
    });

    // ── Leave Room ──────────────────────────────────────────────
    socket.on("leave_room", ({ roomId }) => {
      handleLeaveRoom(socket, roomId, io);
    });

    // ── Disconnect ──────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      const roomId = socket.data.currentRoom;
      if (roomId) {
        handleLeaveRoom(socket, roomId, io);
      }
    });
  });

  // Periodic cleanup of stale rooms (no players for 5+ minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (
        room.players.length === 0 &&
        now - room.createdAt.getTime() > 5 * 60 * 1000
      ) {
        rooms.delete(id);
        gameStates.delete(id);
        console.log(`🧹 Cleaned up stale room: ${id}`);
      }
    }
  }, 60_000);
}

function handleLeaveRoom(
  socket: import("socket.io").Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  roomId: string,
  io: GameIO
) {
  socket.leave(roomId);
  const room = rooms.get(roomId);
  if (room) {
    room.players = room.players.filter((p) => p.socketId !== socket.id);
    console.log(
      `👤 ${socket.data.username || socket.id} left room ${roomId} (${room.players.length} remaining)`
    );

    if (room.players.length === 0) {
      rooms.delete(roomId);
      gameStates.delete(roomId);
    } else {
      room.status = "finished";
      socket.to(roomId).emit("player_left", {
        playerId: socket.id,
        room,
      });
    }
  }
}

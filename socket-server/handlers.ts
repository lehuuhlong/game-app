import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
  Room,
  CaroGameState,
} from "./types";

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
    board: Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null)),
    currentTurn: "X",
    winner: null,
    moveHistory: [],
  };
}

export function registerSocketHandlers(io: GameIO): void {
  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);
    io.emit("online_players_count", io.engine.clientsCount);

    // ── Join Room ────────────────────────────────────────────────
    socket.on("join_room", ({ roomId, gameType, username, action }) => {
      socket.data.username = username;
      socket.data.currentRoom = roomId;

      let room = rooms.get(roomId);

      if (!room) {
        if (action === "join") {
          socket.emit("error", { message: "Room does not exist" });
          return;
        }

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

      if (room.players.find((p) => p.socketId === socket.id)) return;

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

      console.log(`👤 ${username} joined room ${roomId} (${room.players.length}/2)`);

      // Auto-start when 2 players
      if (room.gameType === "caro" && room.players.length === 2) {
        room.status = "playing";
        const gameState = createInitialGameState();
        gameStates.set(roomId, gameState);
        io.to(roomId).emit("game_started", { room, gameState });
        console.log(`🎮 Game started in room ${roomId}`);
      }
    });

    // ── Make Move ───────────────────────────────────────────────
    socket.on("make_move", (move) => {
      const room = rooms.get(move.roomId);
      if (!room || room.status !== "playing") return;

      const gameState = gameStates.get(move.roomId);
      if (!gameState) return;

      if (move.player !== gameState.currentTurn) {
        socket.emit("error", { message: "Not your turn" });
        return;
      }

      const { x, y } = move;
      if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || gameState.board[x][y] !== null) {
        socket.emit("error", { message: "Invalid move" });
        return;
      }

      gameState.board[x][y] = move.player;
      gameState.moveHistory.push(move);
      gameState.currentTurn = move.player === "X" ? "O" : "X";

      io.to(move.roomId).emit("move_made", { move, gameState: { ...gameState } });
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

      io.to(roomId).emit("game_over", { winner, gameState: { ...gameState } });
      console.log(`⏱ Timeout in room ${roomId}: ${losingPlayer} loses`);
    });

    // ── Restart Game ─────────────────────────────────────────────
    socket.on("restart_game", ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      if (room.players.length < 2) {
        socket.emit("error", { message: "Waiting for opponent to join..." });
        return;
      }

      room.status = "playing";
      const gameState = createInitialGameState();
      gameStates.set(roomId, gameState);
      io.to(roomId).emit("game_started", { room, gameState });
      console.log(`🔄 Game restarted in room ${roomId}`);
    });

    // ── Leave Room ───────────────────────────────────────────────
    socket.on("leave_room", ({ roomId }) => {
      handleLeaveRoom(socket, roomId, io);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
      io.emit("online_players_count", io.engine.clientsCount);
      const roomId = socket.data.currentRoom;
      if (roomId) handleLeaveRoom(socket, roomId, io);
    });
  });

  // Cleanup stale empty rooms every minute
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (room.players.length === 0 && now - room.createdAt.getTime() > 5 * 60 * 1000) {
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
  if (!room) return;

  room.players = room.players.filter((p) => p.socketId !== socket.id);
  console.log(`👤 ${socket.data.username || socket.id} left room ${roomId} (${room.players.length} remaining)`);

  if (room.players.length === 0) {
    rooms.delete(roomId);
    gameStates.delete(roomId);
  } else {
    room.status = "finished";
    socket.to(roomId).emit("player_left", { playerId: socket.id, room });
  }
}

/**
 * Battleship game handler.
 *
 * Manages:
 *  - Ship placement phase
 *  - Battle phase (firing, hit/miss/sunk detection)
 *  - Win condition (all enemy ships sunk)
 *  - Per-player state broadcasting (hides enemy ship positions)
 *  - Disconnect / restart
 */

import type {
  Room,
  BattleshipGameState,
  ShipType,
} from "../../shared/types";
import { rooms, bsStates, type GameIO, type GameSocket } from "../stores";
import type { GameHandler } from "./types";

// ── Helpers ────────────────────────────────────────────────────────

function createInitialBSState(p1Id: string, p2Id: string): BattleshipGameState {
  return {
    phase: "placement",
    players: {
      [p1Id]: { playerId: p1Id, ready: false, ships: [], shots: [] },
      [p2Id]: { playerId: p2Id, ready: false, ships: [], shots: [] },
    },
    currentTurnPlayerId: null,
    winner: null,
  };
}

function broadcastBSGameState(roomId: string, io: GameIO): void {
  const room = rooms.get(roomId);
  const state = bsStates.get(roomId);
  if (!room || !state) return;

  room.players.forEach((p) => {
    const other = room.players.find((x) => x.id !== p.id);
    if (!other) return;
    io.to(p.socketId).emit("bs_game_state", {
      room,
      phase: state.phase,
      currentTurnPlayerId: state.currentTurnPlayerId,
      myState: state.players[p.id],
      enemyShots: state.players[other.id].shots,
      winner: state.winner,
    });
  });
}

// ── Handler ───────────────────────────────────────────────────────

export const battleshipHandler: GameHandler = {
  gameType: "battleship",
  maxPlayers: 2,
  autoStart: true,

  startGame(room: Room, io: GameIO): void {
    const p1Id = room.players[0].id;
    const p2Id = room.players[1].id;
    bsStates.set(room.id, createInitialBSState(p1Id, p2Id));
    broadcastBSGameState(room.id, io);
  },

  registerEvents(socket: GameSocket, io: GameIO): void {
    socket.on("bs_ready", ({ roomId, ships }) => {
      const room = rooms.get(roomId);
      const state = bsStates.get(roomId);
      if (!room || !state || room.status !== "playing" || state.phase !== "placement") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      const pState = state.players[player.id];
      if (pState.ready) return;

      pState.ships = ships;
      pState.ready = true;

      const allReady = Object.values(state.players).every((ps) => ps.ready);
      if (allReady) {
        state.phase = "battle";
        state.currentTurnPlayerId = room.players[Math.random() > 0.5 ? 0 : 1].id;
      }

      broadcastBSGameState(roomId, io);
    });

    socket.on("bs_fire", ({ roomId, x, y }) => {
      const room = rooms.get(roomId);
      const state = bsStates.get(roomId);
      if (!room || !state || room.status !== "playing" || state.phase !== "battle") return;

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) return;

      if (player.id !== state.currentTurnPlayerId) {
        socket.emit("error", { message: "Not your turn" });
        return;
      }

      const enemy = room.players.find((p) => p.id !== player.id);
      if (!enemy) return;

      const pState = state.players[player.id];
      const eState = state.players[enemy.id];

      // Check if already fired here
      if (pState.shots.find((s) => s.x === x && s.y === y)) return;

      let result: "hit" | "miss" | "sunk" = "miss";
      let hitShipType: ShipType | undefined = undefined;

      // Check hits against enemy ships
      for (const ship of eState.ships) {
        let isHit = false;
        if (ship.vertical) {
          if (x === ship.x && y >= ship.y && y < ship.y + ship.length) isHit = true;
        } else {
          if (y === ship.y && x >= ship.x && x < ship.x + ship.length) isHit = true;
        }

        if (isHit) {
          ship.hits++;
          if (ship.hits >= ship.length) {
            result = "sunk";
            hitShipType = ship.type;
          } else {
            result = "hit";
          }
          break;
        }
      }

      pState.shots.push({ x, y, result });

      // Check win condition
      const allSunk = eState.ships.every((s) => s.hits >= s.length);
      if (allSunk) {
        state.phase = "finished";
        state.winner = player.id;
        state.currentTurnPlayerId = null;
        room.status = "finished";

        io.to(roomId).emit("bs_fire_result", {
          x,
          y,
          result,
          shipType: hitShipType,
          nextTurnPlayerId: player.id,
          firedBy: player.id,
        });

        room.players.forEach((p) => {
          const other = room.players.find((op) => op.id !== p.id);
          io.to(p.socketId).emit("bs_game_over", {
            winnerId: player.id,
            winnerName: player.username,
            reason: "win",
            enemyShips: other ? state.players[other.id].ships : undefined,
          });
        });
      } else {
        // Classic rules: hit → same player fires again, miss → switch turn
        const nextTurnId = (result === "hit" || result === "sunk") ? player.id : enemy.id;
        state.currentTurnPlayerId = nextTurnId;

        io.to(roomId).emit("bs_fire_result", {
          x,
          y,
          result,
          shipType: hitShipType,
          nextTurnPlayerId: nextTurnId,
          firedBy: player.id,
        });
      }
    });
  },

  handleReconnect(_socket: GameSocket, room: Room, io: GameIO): void {
    broadcastBSGameState(room.id, io);
  },

  handleDisconnect(socket: GameSocket, room: Room, io: GameIO): void {
    const state = bsStates.get(room.id);
    const leavingPlayer = room.players.find((p) => p.socketId === socket.id);
    const stayingPlayer = room.players.find((p) => p.socketId !== socket.id);

    if (state && leavingPlayer && stayingPlayer) {
      room.status = "finished";
      state.phase = "finished";
      state.winner = stayingPlayer.id;

      room.players.forEach((p) => {
        const other = room.players.find((op) => op.id !== p.id);
        io.to(p.socketId).emit("bs_game_over", {
          winnerId: stayingPlayer.id,
          winnerName: stayingPlayer.username,
          reason: "disconnect",
          enemyShips: other ? state.players[other.id].ships : undefined,
        });
      });
    }
  },

  handleRestart(room: Room, io: GameIO): void {
    const p1Id = room.players[0].id;
    const p2Id = room.players[1].id;
    bsStates.set(room.id, createInitialBSState(p1Id, p2Id));
    broadcastBSGameState(room.id, io);
  },
};

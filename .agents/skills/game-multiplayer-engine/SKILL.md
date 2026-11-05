---
name: game-multiplayer-engine
description: >-
  Use this skill when developing or upgrading online real-time multiplayer games in the Game Portal.
  Guides you through Socket.io room management, player matching, state synchronization, turn timers,
  reconnection handling, and match recording in the socket-server backend.
---

# Game Multiplayer Engine Skill

This skill explains how to build and maintain real-time multiplayer games utilizing the standalone Socket.io server located in [socket-server/](file:///c:/Users/OS/Desktop/Study/game-app/socket-server).

---

## 1. Multiplayer Architecture

The portal separates multiplayer operations into two environments:
1. **Frontend Client (`src/games/<id>/`)**:
   - Connects to Socket.io via `io(NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')`.
   - Listens to room events, syncs turn clocks, sends player moves.
2. **Backend Server (`socket-server/`)**:
   - Express + Socket.io server running independently (Port 3001).
   - Manages room lifecycles, active players, spectators, turn timers, and validates game win conditions.
   - Saves completed matches into MongoDB via internal API or direct Mongoose models.

---

## 2. Standard Multiplayer Flow

```
Player A: Create Room (Room Code e.g. "AZ89K")
       ↓
Player B: Join Room via Code or Matchmaking Queue
       ↓
Server: Emits `room_ready` or `game_start` event with initial state
       ↓
Turn Loop:
  - Active player submits move `make_move`
  - Server validates move, checks win condition
  - Server broadcasts `state_update` & resets turn countdown timer
       ↓
Game End:
  - Server declares winner (`game_over`)
  - Server commits match result to `/api/matches`
  - Players can request rematch (`request_rematch`)
```

---

## 3. Adding a New Multiplayer Game to `socket-server`

Follow these steps when creating a multiplayer game:

### 1. Define Server Types in `socket-server/src/types.ts`
```typescript
export interface <Game>RoomState {
  code: string;
  players: {
    id: string;
    socketId: string;
    username: string;
    role: 'P1' | 'P2';
  }[];
  currentTurn: 'P1' | 'P2';
  turnTimeLeft: number;
  boardState: any;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
}
```

### 2. Implement Socket Handlers in `socket-server/src/handlers.ts`
Add event handlers for:
- `<game>_create_room`
- `<game>_join_room`
- `<game>_move`
- `<game>_rematch`
- `<game>_leave`

### 3. Handle Disconnects Gracefully
If a player drops connection:
- Start a 30-second reconnection grace period before forfeiting the match.
- Notify the remaining opponent with an informative banner.

---

## 4. Frontend Client Implementation

In `src/games/<gameId>/use<Game>Multiplayer.ts`:
- Maintain clean socket subscription in `useEffect`:
  ```typescript
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

    socket.on('connect', () => { ... });
    socket.on('<game>_state_update', (newState) => { ... });
    socket.on('<game>_game_over', (result) => { ... });

    return () => {
      socket.disconnect();
    };
  }, []);
  ```
- Always render a "Copy Room Code" button and shareable link (`/games/<game>?room=<code>`).

---

## 5. Language Policy: English Only (STRICT)

All multiplayer UI elements, status messages, and socket toast notices must be strictly in English:
- **Turn status**: `Your Turn`, `Opponent's Turn`, `Waiting for opponent...`
- **Room lobby**: `Create Room`, `Join Room`, `Enter Room Code`, `Copy Room Code`, `Room Code Copied!`
- **Connection notices**: `Opponent disconnected. Waiting to reconnect... (30s)`, `Reconnected to match`
- **Match outcomes**: `Victory!`, `Defeat`, `Draw`, `Rematch Requested`, `Opponent Left the Match`

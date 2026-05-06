import { useState, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  ClientToServerEvents, 
  ServerToClientEvents, 
  ShipPlacement, 
  ShipType, 
  BattleshipPhase, 
  BattleshipPlayerState,
  Room
} from '@/types/socket';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
const GRID_SIZE = 10;

export const SHIPS_CONFIG: { type: ShipType; length: number; label: string }[] = [
  { type: 'carrier', length: 5, label: 'Carrier' },
  { type: 'battleship', length: 4, label: 'Battleship' },
  { type: 'cruiser', length: 3, label: 'Cruiser' },
  { type: 'submarine', length: 3, label: 'Submarine' },
  { type: 'destroyer', length: 2, label: 'Destroyer' },
];

export function useBattleship(roomId: string, username: string) {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<BattleshipPhase>('placement');
  const [myState, setMyState] = useState<BattleshipPlayerState | null>(null);
  const [enemyShots, setEnemyShots] = useState<{ x: number; y: number; result: 'hit' | 'miss' | 'sunk' }[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Placement local state
  const [placedShips, setPlacedShips] = useState<ShipPlacement[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(false);

  // Initialize socket
  useEffect(() => {
    const s: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    s.on('connect', () => {
      s.emit('join_room', { roomId, gameType: 'battleship', username });
    });

    s.on('room_joined', ({ room, playerId }) => {
      setRoom(room);
      setPlayerId(playerId);
    });

    s.on('bs_game_state', (data) => {
      setRoom(data.room);
      setPhase(data.phase);
      setCurrentTurnPlayerId(data.currentTurnPlayerId);
      setMyState(data.myState);
      setEnemyShots(data.enemyShots);
      if (data.winner) {
        // Find winner name from room players
        const winnerPlayer = data.room.players.find(p => p.id === data.winner);
        if (winnerPlayer) setWinner({ id: data.winner, name: winnerPlayer.username });
      }
    });

    s.on('bs_fire_result', (data) => {
      setCurrentTurnPlayerId(data.nextTurnPlayerId);
      // The actual grid updates will come from the next bs_game_state emission or we can optimistic update
    });

    s.on('bs_game_over', (data) => {
      setWinner({ id: data.winnerId, name: data.winnerName });
      setPhase('finished');
    });

    s.on('error', (data) => {
      setError(data.message);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [roomId, username]);

  const canPlaceShip = useCallback((x: number, y: number, length: number, vertical: boolean, currentShips: ShipPlacement[]) => {
    if (vertical) {
      if (y + length > GRID_SIZE) return false;
      for (let i = 0; i < length; i++) {
        const py = y + i;
        if (currentShips.some(s => {
          if (s.vertical) {
            return s.x === x && py >= s.y && py < s.y + s.length;
          } else {
            return py === s.y && x >= s.x && x < s.x + s.length;
          }
        })) return false;
      }
    } else {
      if (x + length > GRID_SIZE) return false;
      for (let i = 0; i < length; i++) {
        const px = x + i;
        if (currentShips.some(s => {
          if (s.vertical) {
            return px === s.x && y >= s.y && y < s.y + s.length;
          } else {
            return y === s.y && px >= s.x && px < s.x + s.length;
          }
        })) return false;
      }
    }
    return true;
  }, []);

  const handlePlaceShip = useCallback((x: number, y: number) => {
    if (phase !== 'placement' || currentShipIndex >= SHIPS_CONFIG.length) return;

    const shipConfig = SHIPS_CONFIG[currentShipIndex];
    if (canPlaceShip(x, y, shipConfig.length, isVertical, placedShips)) {
      const newShip: ShipPlacement = {
        type: shipConfig.type,
        x,
        y,
        vertical: isVertical,
        length: shipConfig.length,
        hits: 0
      };
      setPlacedShips(prev => [...prev, newShip]);
      setCurrentShipIndex(prev => prev + 1);
    }
  }, [phase, currentShipIndex, isVertical, placedShips, canPlaceShip]);

  const resetPlacement = useCallback(() => {
    setPlacedShips([]);
    setCurrentShipIndex(0);
  }, []);

  const rotateShip = useCallback(() => {
    setIsVertical(prev => !prev);
  }, []);

  const readyUp = useCallback(() => {
    if (placedShips.length === SHIPS_CONFIG.length && socket) {
      socket.emit('bs_ready', { roomId, ships: placedShips });
    }
  }, [socket, roomId, placedShips]);

  const fire = useCallback((x: number, y: number) => {
    if (socket && phase === 'battle' && currentTurnPlayerId === playerId) {
      socket.emit('bs_fire', { roomId, x, y });
    }
  }, [socket, roomId, phase, currentTurnPlayerId, playerId]);

  const restart = useCallback(() => {
    if (socket) {
      socket.emit('restart_game', { roomId });
      setWinner(null);
      setPlacedShips([]);
      setCurrentShipIndex(0);
    }
  }, [socket, roomId]);

  return {
    room,
    playerId,
    phase,
    myState,
    enemyShots,
    currentTurnPlayerId,
    winner,
    error,
    placedShips,
    currentShipIndex,
    isVertical,
    handlePlaceShip,
    rotateShip,
    resetPlacement,
    readyUp,
    fire,
    restart
  };
}

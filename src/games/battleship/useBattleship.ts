import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { SHIPS_CONFIG, GRID_SIZE, Shot, reconstructSunkShips } from './types';

export { SHIPS_CONFIG };

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useBattleship(username: string) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomIdRef = useRef('');
  const playerIdRef = useRef<string | null>(null);

  /** Track all coordinates we've fired at to prevent double-fire */
  const firedCoordsRef = useRef<Set<string>>(new Set());

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [phase, setPhase] = useState<BattleshipPhase>('placement');
  const [myState, setMyState] = useState<BattleshipPlayerState | null>(null);
  const [enemyShots, setEnemyShots] = useState<{ x: number; y: number; result: 'hit' | 'miss' | 'sunk' }[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enemySunkTypes, setEnemySunkTypes] = useState<ShipType[]>([]);
  const [revealedEnemyShips, setRevealedEnemyShips] = useState<ShipPlacement[]>([]);

  /**
   * Local shots: merged view of server shots + pending fires.
   * This is the single source of truth for the enemy grid display.
   * - Pending shots (result='pending') are added immediately on fire
   * - Replaced with real result from bs_fire_result
   * - Fully synced when bs_game_state arrives
   */
  const [localShots, setLocalShots] = useState<Shot[]>([]);

  // Placement local state
  const [placedShips, setPlacedShips] = useState<ShipPlacement[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState(0);
  const [isVertical, setIsVertical] = useState(false);

  const getSocket = useCallback((): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (!socketRef.current || !socketRef.current.connected) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
    }
    return socketRef.current;
  }, []);

  const setupSocket = useCallback((socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
    // Clear old listeners
    socket.off('room_joined').off('player_joined').off('player_left')
      .off('bs_game_state').off('bs_fire_result').off('bs_game_over').off('error');

    socket.on('room_joined', ({ room, playerId }) => {
      setRoom(room);
      setPlayerId(playerId);
      playerIdRef.current = playerId;
    });

    socket.on('player_joined' as any, ({ room }: { room: Room }) => {
      setRoom(room);
    });

    socket.on('player_left' as any, ({ room }: { room: Room }) => {
      setRoom(room);
    });

    socket.on('bs_game_state', (data) => {
      setRoom(data.room);
      setPhase(data.phase);
      setCurrentTurnPlayerId(data.currentTurnPlayerId);
      setMyState(data.myState);
      setEnemyShots(data.enemyShots);

      // Sync localShots with server state (authoritative)
      // Keep any pending shots that server hasn't confirmed yet
      const serverShots: Shot[] = data.myState.shots.map(s => ({
        x: s.x, y: s.y, result: s.result,
      }));
      setLocalShots(prev => {
        const serverKeys = new Set(serverShots.map(s => `${s.x},${s.y}`));
        const stillPending = prev.filter(
          s => s.result === 'pending' && !serverKeys.has(`${s.x},${s.y}`)
        );
        return [...serverShots, ...stillPending];
      });

      // Sync firedCoordsRef with server state
      firedCoordsRef.current = new Set(
        data.myState.shots.map(s => `${s.x},${s.y}`)
      );

      if (data.winner) {
        const winnerPlayer = data.room.players.find(p => p.id === data.winner);
        if (winnerPlayer) setWinner({ id: data.winner, name: winnerPlayer.username });
      }
    });

    socket.on('bs_fire_result', (data) => {
      setCurrentTurnPlayerId(data.nextTurnPlayerId);

      // If WE fired, optimistically update our local shots with the result
      if (data.firedBy === playerIdRef.current) {
        setLocalShots(prev => {
          const exists = prev.some(s => s.x === data.x && s.y === data.y && s.result !== 'pending');
          if (exists) return prev; // Already has a real result

          // Replace pending with actual result, or add new
          const hasPending = prev.some(s => s.x === data.x && s.y === data.y && s.result === 'pending');
          if (hasPending) {
            return prev.map(s =>
              s.x === data.x && s.y === data.y && s.result === 'pending'
                ? { ...s, result: data.result }
                : s
            );
          }
          return [...prev, { x: data.x, y: data.y, result: data.result }];
        });

        // Track sunk enemy ship types
        if (data.result === 'sunk' && data.shipType) {
          setEnemySunkTypes(prev => [...prev, data.shipType!]);
        }
      }
    });

    socket.on('bs_game_over', (data) => {
      setWinner({ id: data.winnerId, name: data.winnerName });
      setPhase('finished');
      if (data.enemyShips) {
        setRevealedEnemyShips(data.enemyShips);
      }
    });

    socket.on('error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = useCallback((roomId: string, action: 'create' | 'join' = 'join') => {
    const socket = getSocket();
    roomIdRef.current = roomId;
    setupSocket(socket);
    socket.emit('join_room', { roomId, gameType: 'battleship', username, action });
  }, [username, getSocket, setupSocket]);

  const resetAllState = useCallback(() => {
    setRoom(null);
    setPlayerId(null);
    playerIdRef.current = null;
    setPhase('placement');
    setMyState(null);
    setEnemyShots([]);
    setCurrentTurnPlayerId(null);
    setWinner(null);
    setError(null);
    setPlacedShips([]);
    setCurrentShipIndex(0);
    setIsVertical(false);
    setEnemySunkTypes([]);
    setRevealedEnemyShips([]);
    setLocalShots([]);
    firedCoordsRef.current.clear();
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    socketRef.current?.emit('leave_room', { roomId });
    socketRef.current?.disconnect();
    socketRef.current = null;
    roomIdRef.current = '';
    resetAllState();
  }, [resetAllState]);

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
    if (placedShips.length === SHIPS_CONFIG.length && socketRef.current) {
      socketRef.current.emit('bs_ready', { roomId: roomIdRef.current, ships: placedShips });
    }
  }, [placedShips]);

  const fire = useCallback((x: number, y: number) => {
    const key = `${x},${y}`;

    // Prevent double-fire: check ref (instant, no stale closure)
    if (firedCoordsRef.current.has(key)) return;
    if (!(socketRef.current && phase === 'battle' && currentTurnPlayerId === playerId)) return;

    // Mark as fired immediately
    firedCoordsRef.current.add(key);

    // Optimistic: add pending shot to local state immediately
    setLocalShots(prev => [...prev, { x, y, result: 'pending' }]);

    // Emit to server
    socketRef.current.emit('bs_fire', { roomId: roomIdRef.current, x, y });
  }, [phase, currentTurnPlayerId, playerId]);

  const restart = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('restart_game', { roomId: roomIdRef.current });
      setWinner(null);
      setPlacedShips([]);
      setCurrentShipIndex(0);
      setPhase('placement');
      setMyState(null);
      setEnemyShots([]);
      setIsVertical(false);
      setEnemySunkTypes([]);
      setRevealedEnemyShips([]);
      setLocalShots([]);
      firedCoordsRef.current.clear();
    }
  }, []);

  /** Reconstruct sunk enemy ship placements from shot data */
  const sunkEnemyShips = useMemo(() => {
    return reconstructSunkShips(localShots);
  }, [localShots]);

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
    restart,
    joinRoom,
    leaveRoom,
    sunkEnemyShips,
    enemySunkTypes,
    revealedEnemyShips,
    /** Merged local shots (server + pending) — use this for enemy grid display */
    localShots,
  };
}

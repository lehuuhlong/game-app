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
  const phaseRef = useRef<BattleshipPhase>('placement');
  const [myState, setMyState] = useState<BattleshipPlayerState | null>(null);
  const [enemyShots, setEnemyShots] = useState<Shot[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [enemySunkTypes, setEnemySunkTypes] = useState<ShipType[]>([]);
  const [revealedEnemyShips, setRevealedEnemyShips] = useState<ShipPlacement[]>([]);

  /** Callback fired when room_joined is confirmed by server */
  const onJoinSuccessRef = useRef<(() => void) | null>(null);

  /**
   * Local shots: merged view of server shots + pending fires.
   * This is the single source of truth for the enemy grid display.
   * - Pending shots (result='pending') are added immediately on fire
   * - Replaced with real result from bs_fire_result
   * - Fully synced when bs_game_state arrives
   */
  const [localShots, setLocalShots] = useState<Shot[]>([]);
  const localShotsRef = useRef<Shot[]>([]);

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
      // Confirm join to component so it can advance screen
      onJoinSuccessRef.current?.();
      onJoinSuccessRef.current = null;
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
        const next = [...serverShots, ...stillPending];
        localShotsRef.current = next;
        return next;
      });

      // Sync firedCoordsRef with server state
      firedCoordsRef.current = new Set(
        data.myState.shots.map(s => `${s.x},${s.y}`)
      );

      if (data.winner) {
        const winnerPlayer = data.room.players.find(p => p.id === data.winner);
        if (winnerPlayer) setWinner({ id: data.winner, name: winnerPlayer.username });
      } else {
        setWinner(null);
      }

      // If server says it's placement phase AND we were previously in 'finished' phase, it means a rematch started.
      // Ensure all previous game state is cleared for BOTH players (especially the one who didn't click rematch).
      if (data.phase === 'placement' && phaseRef.current === 'finished') {
        setRevealedEnemyShips([]);
        setEnemySunkTypes([]);
        setPlacedShips([]);
        setCurrentShipIndex(0);
        setIsVertical(false);
      }
      
      setPhase(data.phase);
      phaseRef.current = data.phase;
    });

    socket.on('bs_fire_result', (data) => {
      setCurrentTurnPlayerId(data.nextTurnPlayerId);

      let weFired = false;
      if (data.firedBy !== undefined) {
        weFired = data.firedBy === playerIdRef.current;
      } else {
        // Fallback for older backend deployments
        weFired = localShotsRef.current.some(
          s => s.x === data.x && s.y === data.y && s.result === 'pending'
        );
      }

      if (weFired) {
        // WE fired — update our local attack shots optimistically
        setLocalShots(prev => {
          const exists = prev.some(s => s.x === data.x && s.y === data.y && s.result !== 'pending');
          if (exists) return prev;

          const hasPending = prev.some(s => s.x === data.x && s.y === data.y && s.result === 'pending');
          let next;
          if (hasPending) {
            next = prev.map(s =>
              s.x === data.x && s.y === data.y && s.result === 'pending'
                ? { ...s, result: data.result }
                : s
            );
          } else {
            next = [...prev, { x: data.x, y: data.y, result: data.result }];
          }
          localShotsRef.current = next;
          return next;
        });

        // Track sunk enemy ship types
        if (data.result === 'sunk' && data.shipType) {
          setEnemySunkTypes(prev => [...prev, data.shipType!]);
        }
      } else {
        // ENEMY fired at us — update enemyShots immediately (don't wait for bs_game_state)
        setEnemyShots(prev => {
          const alreadyExists = prev.some(s => s.x === data.x && s.y === data.y);
          if (alreadyExists) return prev;
          return [...prev, { x: data.x, y: data.y, result: data.result }];
        });
      }
    });

    socket.on('bs_game_over', (data) => {
      setWinner({ id: data.winnerId, name: data.winnerName });
      setPhase('finished');
      phaseRef.current = 'finished';
      
      if (data.enemyShips) {
        setRevealedEnemyShips(data.enemyShips);
      }
    });

    socket.on('error', (data) => {
      setError(data.message);
      // Also surface as joinError for lobby flow
      setJoinError(data.message);
      // Clear onJoinSuccess so screen doesn't advance on error
      onJoinSuccessRef.current = null;
      setTimeout(() => { setError(null); setJoinError(null); }, 4000);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinRoom = useCallback((roomId: string, action: 'create' | 'join' = 'join', onSuccess?: () => void) => {
    const socket = getSocket();
    roomIdRef.current = roomId;
    setupSocket(socket);
    if (onSuccess) {
      onJoinSuccessRef.current = onSuccess;
    }
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
    localShotsRef.current = [];
    setJoinError(null);
    firedCoordsRef.current.clear();
    onJoinSuccessRef.current = null;
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

  const handlePlaceShip = useCallback((shipType: string, x: number, y: number, vertical: boolean) => {
    if (phase !== 'placement') return;
    if (placedShips.some(s => s.type === shipType)) return;

    const shipConfig = SHIPS_CONFIG.find(s => s.type === shipType);
    if (!shipConfig) return;

    if (canPlaceShip(x, y, shipConfig.length, vertical, placedShips)) {
      const newShip: ShipPlacement = {
        type: shipConfig.type,
        x,
        y,
        vertical,
        length: shipConfig.length,
        hits: 0
      };
      setPlacedShips(prev => [...prev, newShip]);
    }
  }, [phase, placedShips, canPlaceShip]);

  const placeNextAvailableShip = useCallback((x: number, y: number) => {
    if (phase !== 'placement') return;
    const unplaced = SHIPS_CONFIG.find(s => !placedShips.some(ps => ps.type === s.type));
    if (!unplaced) return;
    handlePlaceShip(unplaced.type, x, y, isVertical);
  }, [phase, placedShips, isVertical, handlePlaceShip]);

  const rotatePlacedShip = useCallback((shipType: string) => {
    if (phase !== 'placement') return;
    setPlacedShips(prev => {
      const shipIndex = prev.findIndex(s => s.type === shipType);
      if (shipIndex === -1) return prev;
      
      const ship = prev[shipIndex];
      const otherShips = prev.filter((_, i) => i !== shipIndex);
      
      // Try to rotate in place
      if (canPlaceShip(ship.x, ship.y, ship.length, !ship.vertical, otherShips)) {
        const next = [...prev];
        next[shipIndex] = { ...ship, vertical: !ship.vertical };
        return next;
      }
      return prev; // cannot rotate (collision or out of bounds)
    });
  }, [phase, canPlaceShip]);

  const moveShip = useCallback((shipType: ShipType, newX: number, newY: number) => {
    if (phase !== 'placement') return;
    setPlacedShips(prev => {
      const shipIndex = prev.findIndex(s => s.type === shipType);
      if (shipIndex === -1) return prev;
      
      const ship = prev[shipIndex];
      const otherShips = prev.filter((_, i) => i !== shipIndex);
      
      if (canPlaceShip(newX, newY, ship.length, ship.vertical, otherShips)) {
        const next = [...prev];
        next[shipIndex] = { ...ship, x: newX, y: newY };
        return next;
      }
      return prev;
    });
  }, [phase, canPlaceShip]);

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
    setLocalShots(prev => {
      const next = [...prev, { x, y, result: 'pending' as const }];
      localShotsRef.current = next;
      return next;
    });

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
      localShotsRef.current = [];
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
    joinError,
    placedShips,
    currentShipIndex,
    isVertical,
    canPlaceShip,
    handlePlaceShip,
    placeNextAvailableShip,
    rotatePlacedShip,
    rotateShip,
    moveShip,
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

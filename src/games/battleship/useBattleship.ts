'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  ShipPlacement,
  ShipType,
  BattleshipPhase,
  BattleshipPlayerState,
} from '@/types/socket';
import { useGameSocket } from '@/hooks/useGameSocket';
import { SHIPS_CONFIG, GRID_SIZE, Shot, reconstructSunkShips } from './types';

export { SHIPS_CONFIG };

export function useBattleship(username: string) {
  const phaseRef = useRef<BattleshipPhase>('placement');
  const firedCoordsRef = useRef<Set<string>>(new Set());
  const localShotsRef = useRef<Shot[]>([]);

  // Core game state
  const [phase, setPhase] = useState<BattleshipPhase>('placement');
  const [myState, setMyState] = useState<BattleshipPlayerState | null>(null);
  const [enemyShots, setEnemyShots] = useState<Shot[]>([]);
  const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState<string | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enemySunkTypes, setEnemySunkTypes] = useState<ShipType[]>([]);
  const [revealedEnemyShips, setRevealedEnemyShips] = useState<ShipPlacement[]>([]);
  const [localShots, setLocalShots] = useState<Shot[]>([]);

  // Placement local state
  const [placedShips, setPlacedShips] = useState<ShipPlacement[]>([]);
  const [currentShipIndex, setCurrentShipIndex] = useState<number>(0);
  const [isVertical, setIsVertical] = useState<boolean>(false);

  const setupBSSocket = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off('bs_game_state');
      socket.off('bs_fire_result');
      socket.off('bs_game_over');

      socket.on('bs_game_state', (data: {
        room: Room;
        phase: BattleshipPhase;
        currentTurnPlayerId: string | null;
        myState: BattleshipPlayerState;
        enemyShots: { x: number; y: number; result: 'hit' | 'miss' | 'sunk' }[];
        winner: string | null;
      }) => {
        setRoom(data.room);
        setPlayers(data.room.players);
        setPhase(data.phase);
        setCurrentTurnPlayerId(data.currentTurnPlayerId);
        setMyState(data.myState);
        setEnemyShots(data.enemyShots);

        const serverShots: Shot[] = data.myState.shots.map((s) => ({
          x: s.x,
          y: s.y,
          result: s.result,
        }));

        setLocalShots((prev) => {
          const serverKeys = new Set(serverShots.map((s) => `${s.x},${s.y}`));
          const stillPending = prev.filter(
            (s) => s.result === 'pending' && !serverKeys.has(`${s.x},${s.y}`)
          );
          const next = [...serverShots, ...stillPending];
          localShotsRef.current = next;
          return next;
        });

        firedCoordsRef.current = new Set(
          data.myState.shots.map((s) => `${s.x},${s.y}`)
        );

        if (data.winner) {
          const winnerPlayer = data.room.players.find((p) => p.id === data.winner);
          if (winnerPlayer) setWinner({ id: data.winner, name: winnerPlayer.username });
        } else {
          setWinner(null);
        }

        if (data.phase === 'placement' && phaseRef.current === 'finished') {
          setRevealedEnemyShips([]);
          setEnemySunkTypes([]);
          setPlacedShips([]);
          setCurrentShipIndex(0);
          setIsVertical(false);
        }

        setPhase(data.phase);
        phaseRef.current = data.phase;

        if (data.phase === 'finished') {
          setScreen('finished');
        } else if (data.room.players.length >= 2) {
          setScreen('playing');
        }
      });

      socket.on('bs_fire_result', (data: {
        x: number;
        y: number;
        result: 'hit' | 'miss' | 'sunk';
        shipType?: ShipType;
        nextTurnPlayerId: string;
        firedBy: string;
      }) => {
        setCurrentTurnPlayerId(data.nextTurnPlayerId);

        let weFired = false;
        if (data.firedBy !== undefined) {
          weFired = data.firedBy === playerIdRef.current;
        } else {
          weFired = localShotsRef.current.some(
            (s) => s.x === data.x && s.y === data.y && s.result === 'pending'
          );
        }

        if (weFired) {
          setLocalShots((prev) => {
            const exists = prev.some(
              (s) => s.x === data.x && s.y === data.y && s.result !== 'pending'
            );
            if (exists) return prev;

            const hasPending = prev.some(
              (s) => s.x === data.x && s.y === data.y && s.result === 'pending'
            );
            let next;
            if (hasPending) {
              next = prev.map((s) =>
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

          if (data.result === 'sunk' && data.shipType) {
            setEnemySunkTypes((prev) => [...prev, data.shipType!]);
          }
        } else {
          setEnemyShots((prev) => {
            const alreadyExists = prev.some((s) => s.x === data.x && s.y === data.y);
            if (alreadyExists) return prev;
            return [...prev, { x: data.x, y: data.y, result: data.result }];
          });
        }
      });

      socket.on('bs_game_over', (data: { winnerId: string; winnerName: string; enemyShips?: ShipPlacement[]; reason?: string }) => {
        setWinner({ id: data.winnerId, name: data.winnerName });
        setEndReason(data.reason || 'win');
        setPhase('finished');
        phaseRef.current = 'finished';
        setScreen('finished');

        if (data.enemyShips) {
          setRevealedEnemyShips(data.enemyShips);
        }

        const isMeWinner = data.winnerId === playerIdRef.current;
        const currentRoom = gameSocket.room;
        if (isMeWinner && currentRoom && currentRoom.players) {
          const opp = currentRoom.players.find((p) => p.id !== data.winnerId);
          const winPlayer = currentRoom.players.find((p) => p.id === data.winnerId);
          if (winPlayer && opp) {
            saveMatchResult({
              gameType: 'battleship',
              players: [
                { username: winPlayer.username, result: 'win', score: 1 },
                { username: opp.username, result: 'loss', score: 0 },
              ],
              duration: 0,
              gameData: { winnerName: data.winnerName },
            });
          }
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const gameSocket = useGameSocket({
    gameType: 'battleship',
    username: username || '',
    onSetupSocket: setupBSSocket,
  });

  const {
    socketRef,
    roomIdRef,
    playerIdRef,
    screen,
    setScreen,
    room,
    setRoom,
    players,
    setPlayers,
    roomId,
    playerId,
    joinError,
    statusMsg,
    copied,
    createRoom,
    joinRoom,
    leaveRoom: baseLeaveRoom,
    requestRematch: baseRequestRematch,
    copyRoomCode,
    saveMatchResult,
  } = gameSocket;

  const resetAllState = useCallback(() => {
    setPhase('placement');
    setMyState(null);
    setEnemyShots([]);
    setCurrentTurnPlayerId(null);
    setWinner(null);
    setEndReason(null);
    setError(null);
    setPlacedShips([]);
    setCurrentShipIndex(0);
    setIsVertical(false);
    setEnemySunkTypes([]);
    setRevealedEnemyShips([]);
    setLocalShots([]);
    localShotsRef.current = [];
    firedCoordsRef.current.clear();
  }, []);

  const leaveRoom = useCallback(() => {
    baseLeaveRoom();
    resetAllState();
  }, [baseLeaveRoom, resetAllState]);

  const canPlaceShip = useCallback(
    (x: number, y: number, length: number, vertical: boolean, currentShips: ShipPlacement[]) => {
      if (vertical) {
        if (y + length > GRID_SIZE) return false;
        for (let i = 0; i < length; i++) {
          const py = y + i;
          if (
            currentShips.some((s) => {
              if (s.vertical) {
                return s.x === x && py >= s.y && py < s.y + s.length;
              } else {
                return py === s.y && x >= s.x && x < s.x + s.length;
              }
            })
          )
            return false;
        }
      } else {
        if (x + length > GRID_SIZE) return false;
        for (let i = 0; i < length; i++) {
          const px = x + i;
          if (
            currentShips.some((s) => {
              if (s.vertical) {
                return px === s.x && y >= s.y && y < s.y + s.length;
              } else {
                return y === s.y && px >= s.x && px < s.x + s.length;
              }
            })
          )
            return false;
        }
      }
      return true;
    },
    []
  );

  const handlePlaceShip = useCallback(
    (shipType: string, x: number, y: number, vertical: boolean) => {
      if (phase !== 'placement') return;
      if (placedShips.some((s) => s.type === shipType)) return;

      const shipConfig = SHIPS_CONFIG.find((s) => s.type === shipType);
      if (!shipConfig) return;

      if (canPlaceShip(x, y, shipConfig.length, vertical, placedShips)) {
        const newShip: ShipPlacement = {
          type: shipConfig.type,
          x,
          y,
          vertical,
          length: shipConfig.length,
          hits: 0,
        };
        setPlacedShips((prev) => [...prev, newShip]);
      }
    },
    [phase, placedShips, canPlaceShip]
  );

  const placeNextAvailableShip = useCallback(
    (x: number, y: number) => {
      if (phase !== 'placement') return;
      const unplaced = SHIPS_CONFIG.find((s) => !placedShips.some((ps) => ps.type === s.type));
      if (!unplaced) return;
      handlePlaceShip(unplaced.type, x, y, isVertical);
    },
    [phase, placedShips, isVertical, handlePlaceShip]
  );

  const rotatePlacedShip = useCallback(
    (shipType: string) => {
      if (phase !== 'placement') return;
      setPlacedShips((prev) => {
        const shipIndex = prev.findIndex((s) => s.type === shipType);
        if (shipIndex === -1) return prev;

        const ship = prev[shipIndex];
        const otherShips = prev.filter((_, i) => i !== shipIndex);

        if (canPlaceShip(ship.x, ship.y, ship.length, !ship.vertical, otherShips)) {
          const next = [...prev];
          next[shipIndex] = { ...ship, vertical: !ship.vertical };
          return next;
        }
        return prev;
      });
    },
    [phase, canPlaceShip]
  );

  const moveShip = useCallback(
    (shipType: ShipType, newX: number, newY: number) => {
      if (phase !== 'placement') return;
      setPlacedShips((prev) => {
        const shipIndex = prev.findIndex((s) => s.type === shipType);
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
    },
    [phase, canPlaceShip]
  );

  const resetPlacement = useCallback(() => {
    setPlacedShips([]);
    setCurrentShipIndex(0);
  }, []);

  const rotateShip = useCallback(() => {
    setIsVertical((prev) => !prev);
  }, []);

  const readyUp = useCallback(() => {
    if (placedShips.length === SHIPS_CONFIG.length && socketRef.current) {
      socketRef.current.emit('bs_ready', {
        roomId: roomIdRef.current,
        ships: placedShips,
      });
    }
  }, [placedShips, socketRef, roomIdRef]);

  const fire = useCallback(
    (x: number, y: number) => {
      const key = `${x},${y}`;
      if (firedCoordsRef.current.has(key)) return;
      if (!(socketRef.current && phase === 'battle' && currentTurnPlayerId === playerId)) return;

      firedCoordsRef.current.add(key);

      setLocalShots((prev) => {
        const next = [...prev, { x, y, result: 'pending' as const }];
        localShotsRef.current = next;
        return next;
      });

      socketRef.current.emit('bs_fire', { roomId: roomIdRef.current, x, y });
    },
    [phase, currentTurnPlayerId, playerId, socketRef, roomIdRef]
  );

  const restart = useCallback(() => {
    if (socketRef.current) {
      baseRequestRematch();
      setWinner(null);
      setEndReason(null);
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
  }, [baseRequestRematch, socketRef]);

  const sunkEnemyShips = useMemo(() => {
    return reconstructSunkShips(localShots);
  }, [localShots]);

  return {
    screen,
    setScreen,
    room,
    players,
    roomId,
    playerId,
    phase,
    myState,
    enemyShots,
    currentTurnPlayerId,
    winner,
    endReason,
    error,
    joinError,
    statusMsg,
    copied,
    copyRoomCode,
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
    createRoom,
    joinRoom,
    leaveRoom,
    sunkEnemyShips,
    enemySunkTypes,
    revealedEnemyShips,
    localShots,
  };
}

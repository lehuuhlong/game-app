'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  MonopolyGameState,
  MonopolyTokenColor,
  Room,
} from '@/types/socket';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useMonopoly(username: string, userId?: string) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomIdRef = useRef('');
  const playerIdRef = useRef<string | null>(null);
  const matchSavedRef = useRef(false);
  const matchSubmittedToApiRef = useRef(false);
  const fallbackSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const roomRef = useRef<Room | null>(null);

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MonopolyGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [buyOffer, setBuyOffer] = useState<{
    spaceIndex: number;
    spaceName: string;
    price: number;
  } | null>(null);
  const [upgradeOffer, setUpgradeOffer] = useState<{
    spaceIndex: number;
    spaceName: string;
    currentLevel: number;
    upgradeCost: number;
    maxLevel: number;
    costs: number[];
  } | null>(null);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);
  const [monopolyCelebration, setMonopolyCelebration] = useState<{
    playerId: string;
    username: string;
    tokenColor: MonopolyTokenColor;
    colorGroup: string;
    propertyNames: string[];
  } | null>(null);

  /** Callback fired when room_joined is confirmed by server */
  const onJoinSuccessRef = useRef<(() => void) | null>(null);

  // ── Socket management ─────────────────────────────────────────

  const getSocket = useCallback((): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });
    }
    return socketRef.current;
  }, []);

  const setupSocket = useCallback((socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
    // Clear old listeners
    socket
      .off('room_joined')
      .off('player_joined')
      .off('player_left')
      .off('mp_game_started')
      .off('mp_game_update')
      .off('mp_dice_rolled')
      .off('mp_monopoly_completed')
      .off('mp_offer_buy')
      .off('mp_offer_upgrade')
      .off('mp_game_over')
      .off('match_saved' as any)
      .off('error');

    // ── Shared room events ────────────────────────────────────────

    socket.on('room_joined', ({ room, playerId }) => {
      setRoom(room);
      roomRef.current = room;
      setPlayerId(playerId);
      playerIdRef.current = playerId;
      onJoinSuccessRef.current?.();
      onJoinSuccessRef.current = null;
    });

    socket.on('player_joined' as any, ({ room }: { room: Room }) => {
      setRoom(room);
      roomRef.current = room;
    });

    socket.on('player_left' as any, ({ room }: { room: Room }) => {
      setRoom(room);
      roomRef.current = room;
    });

    // ── Monopoly-specific events ──────────────────────────────────

    socket.on('mp_game_started', ({ room, gameState }) => {
      setRoom(room);
      roomRef.current = room;
      setGameState(gameState);
      matchSavedRef.current = false;
      matchSubmittedToApiRef.current = false;
      if (fallbackSubmitTimerRef.current) {
        clearTimeout(fallbackSubmitTimerRef.current);
        fallbackSubmitTimerRef.current = null;
      }
      setBuyOffer(null);
      setUpgradeOffer(null);
      setWinner(null);
      setMonopolyCelebration(null);
    });

    socket.on('mp_dice_rolled', ({ dice }) => {
      setGameState((prev) => (prev ? { ...prev, lastDice: dice } : prev));
    });

    socket.on('mp_monopoly_completed', (data) => {
      setMonopolyCelebration(data);
    });

    socket.on('mp_game_update', ({ gameState }) => {
      setGameState(gameState);
      // Clear offers when turn phase changes away from 'action'
      if (gameState.turnPhase !== 'action') {
        setBuyOffer(null);
        setUpgradeOffer(null);
      }
    });

    socket.on('mp_offer_buy', (offer) => {
      setBuyOffer(offer);
      setUpgradeOffer(null);
    });

    socket.on('mp_offer_upgrade', (offer) => {
      setUpgradeOffer(offer);
      setBuyOffer(null);
    });

    socket.on('mp_game_over', ({ winnerId, winnerName, gameState, reason }) => {
      setGameState(gameState);
      setWinner({ id: winnerId, name: winnerName });
      setEndReason(reason || 'win');

      // Record score and match
      try {
        const isMeWinner = winnerId === playerIdRef.current;
        if (!matchSavedRef.current && gameState?.players && gameState.players.length >= 2) {
          const submitMatch = () => {
            if (matchSubmittedToApiRef.current) return;
            matchSubmittedToApiRef.current = true;
            matchSavedRef.current = true;

            const roomPlayers = roomRef.current?.players || [];
            const playersPayload = gameState.players.map((p: any) => {
              const matchedRoomPlayer = roomPlayers.find((rp: any) => rp.username === p.username || rp.id === p.playerId);
              const pUserId = matchedRoomPlayer?.userId || (p.username === username ? userId : undefined);
              return {
                userId: pUserId,
                username: p.username,
                result: p.playerId === winnerId ? "win" : "loss",
                score: p.balance || 0,
              };
            });

            fetch("/api/matches", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gameType: "monopoly",
                players: playersPayload,
                duration: 0,
                gameData: { roomId: roomIdRef.current, winnerName },
              }),
            })
              .then((r) => r.json())
              .then((resData) => {
                if (resData && resData.users && Array.isArray(resData.users)) {
                  socketRef.current?.emit("match_saved" as any, {
                    roomId: roomIdRef.current,
                    users: resData.users,
                  });
                  try {
                    const stored = localStorage.getItem("game-portal-user");
                    if (stored) {
                      const u = JSON.parse(stored);
                      const updated = resData.users.find(
                        (x: any) =>
                          (u.id && x.id === u.id) ||
                          (u._id && x._id === u._id) ||
                          (x.username && x.username.toLowerCase() === u.username?.toLowerCase())
                      );
                      if (updated) {
                        Object.assign(u, updated);
                        localStorage.setItem("game-portal-user", JSON.stringify(u));
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("userProfileUpdated"));
                        }
                      }
                    }
                  } catch {}
                }
              })
              .catch(() => {});
          };

          if (isMeWinner) {
            submitMatch();
          } else {
            if (fallbackSubmitTimerRef.current) clearTimeout(fallbackSubmitTimerRef.current);
            fallbackSubmitTimerRef.current = setTimeout(() => {
              submitMatch();
            }, 6000);
          }
        }
      } catch {
        // ignore
      }
    });

    socket.on('match_saved' as any, ({ users }: { users: any[] }) => {
      matchSavedRef.current = true;
      if (fallbackSubmitTimerRef.current) {
        clearTimeout(fallbackSubmitTimerRef.current);
        fallbackSubmitTimerRef.current = null;
      }
      try {
        const stored = localStorage.getItem("game-portal-user");
        if (stored && users && Array.isArray(users)) {
          const u = JSON.parse(stored);
          const updated = users.find(
            (x: any) =>
              (u.id && x.id === u.id) ||
              (u._id && x._id === u._id) ||
              (x.username && x.username.toLowerCase() === u.username?.toLowerCase())
          );
          if (updated) {
            Object.assign(u, updated);
            localStorage.setItem("game-portal-user", JSON.stringify(u));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("userProfileUpdated"));
            }
          }
        }
      } catch {}
    });

    socket.on('room_expired', (data) => {
      if (fallbackSubmitTimerRef.current) {
        clearTimeout(fallbackSubmitTimerRef.current);
        fallbackSubmitTimerRef.current = null;
      }
      matchSavedRef.current = false;
      matchSubmittedToApiRef.current = false;
      setRoom(null);
      roomRef.current = null;
      setPlayerId(null);
      playerIdRef.current = null;
      setGameState(null);
      setBuyOffer(null);
      setUpgradeOffer(null);
      setWinner(null);
      setEndReason(null);
      onJoinSuccessRef.current = null;
      setError(data.message || 'Room expired: Game was not started within 3 minutes.');
      setJoinError(data.message || 'Room expired: Game was not started within 3 minutes.');
      setTimeout(() => {
        setError(null);
        setJoinError(null);
      }, 6000);
    });

    socket.on('error', (data) => {
      setError(data.message);
      setJoinError(data.message);
      onJoinSuccessRef.current = null;
      setTimeout(() => {
        setError(null);
        setJoinError(null);
      }, 4000);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fallbackSubmitTimerRef.current) {
        clearTimeout(fallbackSubmitTimerRef.current);
      }
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────

  const joinRoom = useCallback(
    (roomId: string, action: 'create' | 'join' = 'join', onSuccess?: () => void) => {
      const socket = getSocket();
      roomIdRef.current = roomId;
      setupSocket(socket);
      if (onSuccess) {
        onJoinSuccessRef.current = onSuccess;
      }
      socket.emit('join_room', {
        roomId,
        gameType: 'monopoly',
        username,
        userId,
        action,
      });
    },
    [username, userId, getSocket, setupSocket]
  );

  const resetAllState = useCallback(() => {
    if (fallbackSubmitTimerRef.current) {
      clearTimeout(fallbackSubmitTimerRef.current);
      fallbackSubmitTimerRef.current = null;
    }
    matchSavedRef.current = false;
    matchSubmittedToApiRef.current = false;
    setRoom(null);
    roomRef.current = null;
    setPlayerId(null);
    playerIdRef.current = null;
    setGameState(null);
    setError(null);
    setJoinError(null);
    setBuyOffer(null);
    setUpgradeOffer(null);
    setWinner(null);
    setEndReason(null);
    onJoinSuccessRef.current = null;
  }, []);

  const leaveRoom = useCallback(
    (roomId: string) => {
      if (fallbackSubmitTimerRef.current) {
        clearTimeout(fallbackSubmitTimerRef.current);
        fallbackSubmitTimerRef.current = null;
      }
      matchSavedRef.current = false;
      matchSubmittedToApiRef.current = false;
      socketRef.current?.emit('leave_room', { roomId });
      socketRef.current?.disconnect();
      socketRef.current = null;
      roomIdRef.current = '';
      roomRef.current = null;
      resetAllState();
    },
    [resetAllState]
  );

  const startGame = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_start_game', { roomId: roomIdRef.current });
  }, []);

  const rollDice = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_roll_dice', { roomId: roomIdRef.current });
  }, []);

  const buyProperty = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_buy_property', { roomId: roomIdRef.current });
    setBuyOffer(null);
  }, []);

  const upgradeProperty = useCallback((targetLevel: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_upgrade_property', { roomId: roomIdRef.current, targetLevel });
    setUpgradeOffer(null);
  }, []);

  const endTurn = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_end_turn', { roomId: roomIdRef.current });
    setBuyOffer(null);
    setUpgradeOffer(null);
  }, []);

  const sellProperty = useCallback((spaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_sell_property', { roomId: roomIdRef.current, spaceIndex });
  }, []);

  const payDebt = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_pay_debt', { roomId: roomIdRef.current });
  }, []);

  const declareBankruptcy = useCallback(() => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_declare_bankruptcy', { roomId: roomIdRef.current });
  }, []);

  const restart = useCallback(() => {
    if (!roomIdRef.current) return;
    if (fallbackSubmitTimerRef.current) {
      clearTimeout(fallbackSubmitTimerRef.current);
      fallbackSubmitTimerRef.current = null;
    }
    matchSavedRef.current = false;
    matchSubmittedToApiRef.current = false;
    socketRef.current?.emit('restart_game', { roomId: roomIdRef.current });
    setBuyOffer(null);
    setUpgradeOffer(null);
    setWinner(null);
    setEndReason(null);
  }, []);

  const dismissMonopolyCelebration = useCallback(() => {
    setMonopolyCelebration(null);
  }, []);

  const worldTourTravel = useCallback((targetSpaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_world_tour_travel', { roomId: roomIdRef.current, targetSpaceIndex });
  }, []);

  const hostWorldCup = useCallback((spaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_host_world_cup', { roomId: roomIdRef.current, spaceIndex });
  }, []);

  const selectChanceTarget = useCallback((targetSpaceIndex: number) => {
    if (!roomIdRef.current) return;
    socketRef.current?.emit('mp_chance_select_target', { roomId: roomIdRef.current, targetSpaceIndex });
  }, []);

  return {
    // State
    room,
    playerId,
    gameState,
    error,
    joinError,
    buyOffer,
    upgradeOffer,
    winner,
    endReason,
    monopolyCelebration,

    // Actions
    joinRoom,
    leaveRoom,
    startGame,
    rollDice,
    buyProperty,
    upgradeProperty,
    sellProperty,
    payDebt,
    declareBankruptcy,
    endTurn,
    restart,
    dismissMonopolyCelebration,
    worldTourTravel,
    hostWorldCup,
    selectChanceTarget,
  };
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Room,
  Player,
  GameType,
  WordChainLanguage,
} from "@/types/socket";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export type GameScreen = "lobby" | "waiting" | "playing" | "finished";

export interface MatchPlayerResult {
  username: string;
  result: "win" | "loss" | "draw";
  score?: number;
}

export interface SaveMatchPayload {
  gameType: string;
  players: MatchPlayerResult[];
  duration?: number;
  gameData?: Record<string, unknown>;
}

export interface UseGameSocketOptions {
  gameType: GameType;
  username: string;
  autoConnect?: boolean;
  onSetupSocket?: (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => void;
}

export function useGameSocket({
  gameType,
  username,
  onSetupSocket,
}: UseGameSocketOptions) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const roomIdRef = useRef<string>("");
  const playerIdRef = useRef<string | null>(null);
  const screenRef = useRef<GameScreen>("lobby");
  const onJoinSuccessRef = useRef<(() => void) | null>(null);
  const matchSavedRef = useRef<boolean>(false);
  const onSetupSocketRef = useRef<((socket: Socket<ServerToClientEvents, ClientToServerEvents>) => void) | undefined>(onSetupSocket);

  useEffect(() => {
    onSetupSocketRef.current = onSetupSocket;
  }, [onSetupSocket]);

  const [screen, _setScreen] = useState<GameScreen>("lobby");
  const [room, setRoom] = useState<Room | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("Waiting for opponent...");
  const [copied, setCopied] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const setScreen = useCallback((s: GameScreen) => {
    screenRef.current = s;
    _setScreen(s);
  }, []);

  const getSocket = useCallback((): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        withCredentials: true,
      });

      socketRef.current.on("connect", () => {
        setIsConnected(true);
      });

      socketRef.current.on("disconnect", () => {
        setIsConnected(false);
      });
    }
    return socketRef.current;
  }, []);

  const setupBaseListeners = useCallback(
    (socket: Socket<ServerToClientEvents, ClientToServerEvents>) => {
      socket.off("room_joined");
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("error");

      socket.on("room_joined", ({ room: r, playerId: pId }) => {
        setRoom(r);
        setRoomId(r.id);
        roomIdRef.current = r.id;
        setPlayerId(pId);
        playerIdRef.current = pId;
        setPlayers(r.players);
        setJoinError(null);

        if (r.status === "playing" || (r.players.length >= 2 && gameType !== "monopoly")) {
          setStatusMsg("Game starting...");
          setScreen("playing");
        } else {
          setStatusMsg("Waiting for opponent to join...");
          setScreen("waiting");
        }

        onJoinSuccessRef.current?.();
        onJoinSuccessRef.current = null;
      });

      socket.on("player_joined", ({ room: r, player: p }) => {
        setRoom(r);
        setPlayers(r.players);
        setStatusMsg(`Player ${p.username} joined!`);

        if (r.status === "playing" || (r.players.length >= 2 && gameType !== "monopoly")) {
          setScreen("playing");
        }
      });

      socket.on("player_left", ({ room: r }) => {
        setRoom(r);
        setPlayers(r.players);
        if (r.status === "waiting" || r.players.length < 2) {
          setStatusMsg("Opponent left. Waiting for another player...");
          setScreen("waiting");
        }
      });

      socket.on("error", ({ message }) => {
        setJoinError(message);
        onJoinSuccessRef.current = null;
        setTimeout(() => setJoinError(null), 4000);
      });
    },
    [gameType, setScreen]
  );

  const initSocketAndListeners = useCallback((): Socket<ServerToClientEvents, ClientToServerEvents> => {
    const socket = getSocket();
    setupBaseListeners(socket);
    onSetupSocketRef.current?.(socket);
    return socket;
  }, [getSocket, setupBaseListeners]);

  const createRoom = useCallback(
    (options?: { roomId?: string; language?: WordChainLanguage }) => {
      const code =
        options?.roomId?.trim().toUpperCase() ||
        Math.random().toString(36).substring(2, 8).toUpperCase();

      roomIdRef.current = code;
      setRoomId(code);
      setJoinError(null);
      matchSavedRef.current = false;

      const socket = initSocketAndListeners();

      socket.emit("join_room", {
        roomId: code,
        gameType,
        username: username || "Guest",
        action: "create",
        language: options?.language,
      });
    },
    [gameType, username, initSocketAndListeners]
  );

  const joinRoom = useCallback(
    (
      code: string,
      options?: { language?: WordChainLanguage },
      onSuccess?: () => void
    ) => {
      const cleanCode = code.trim().toUpperCase();
      if (!cleanCode) {
        setJoinError("Please enter a valid room code.");
        return;
      }

      roomIdRef.current = cleanCode;
      setRoomId(cleanCode);
      setJoinError(null);
      matchSavedRef.current = false;

      if (onSuccess) {
        onJoinSuccessRef.current = onSuccess;
      }

      const socket = initSocketAndListeners();

      socket.emit("join_room", {
        roomId: cleanCode,
        gameType,
        username: username || "Guest",
        action: "join",
        language: options?.language,
      });
    },
    [gameType, username, initSocketAndListeners]
  );

  const leaveRoom = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit("leave_room", { roomId: roomIdRef.current });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    roomIdRef.current = "";
    playerIdRef.current = null;
    setRoom(null);
    setRoomId("");
    setPlayerId(null);
    setPlayers([]);
    setJoinError(null);
    setStatusMsg("Waiting for opponent...");
    setCopied(false);
    setScreen("lobby");
    onJoinSuccessRef.current = null;
  }, [setScreen]);

  const requestRematch = useCallback(() => {
    if (socketRef.current && roomIdRef.current) {
      matchSavedRef.current = false;
      socketRef.current.emit("restart_game", { roomId: roomIdRef.current });
    }
  }, []);

  const copyRoomCode = useCallback(() => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomId]);

  const saveMatchResult = useCallback(
    async (payload: SaveMatchPayload) => {
      if (matchSavedRef.current) return;
      matchSavedRef.current = true;

      try {
        await fetch("/api/matches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Failed to save match result:", err);
      }
    },
    []
  );

  // Auto-cleanup on hook unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    socketRef,
    roomIdRef,
    playerIdRef,
    screenRef,
    screen,
    setScreen,
    room,
    setRoom,
    roomId,
    setRoomId,
    playerId,
    setPlayerId,
    players,
    setPlayers,
    joinError,
    setJoinError,
    statusMsg,
    setStatusMsg,
    copied,
    isConnected,
    getSocket,
    setupBaseListeners,
    initSocketAndListeners,
    createRoom,
    joinRoom,
    leaveRoom,
    requestRematch,
    copyRoomCode,
    saveMatchResult,
  };
}
